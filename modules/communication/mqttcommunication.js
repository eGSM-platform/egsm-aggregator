/**
 * Responsible to handle software-level MQTT communication
 */

var UUID = require("uuid");

var MQTT = require("../egsm-common/communication/mqttconnector")
var LOG = require('../egsm-common/auxiliary/logManager')
var AUX = require('../egsm-common/auxiliary/auxiliary')
var ROUTES = require('./routes')

module.id = "MQTTCOMM"

const ID_VERIFICATION_PERIOD = 1500 //Time the other Aggregators has to reply if their ID is identical with the one the local worker wants to use

const PROCESS_DISCOVERY_PERIOD = 1500

//Topic definitions
const SUPERVISOR_TOPIC_IN = 'supervisor_aggregator_in'
const SUPERVISOR_TOPIC_OUT = 'supervisor_aggregator_out'
const AGGREGATOR_GLOBAL_TOPIC_IN = 'aggregator_global_in'
const AGGREGATOR_GLOBAL_TOPIC_OUT = 'aggregator_global_out'
var TOPIC_SELF = ''

var MQTT_HOST = undefined
var MQTT_PORT = undefined;
var MQTT_USER = undefined;
var MQTT_USER_PW = undefined

var REQUEST_PROMISES = new Map()

function onMessageReceived(hostname, port, topic, message) {
    LOG.logSystem('DEBUG', `New message received from topic: ${topic}`, module.id)
    if ((hostname != MQTT_HOST || port != MQTT_PORT) || (topic != SUPERVISOR_TOPIC_OUT && topic != TOPIC_SELF)) {
        LOG.logSystem('DEBUG', `Reveived message is not intended to handle here`, module.id)
        return
    }
    try {
        var msgJson = JSON.parse(message.toString())
    } catch (e) {
        LOG.logSystem('ERROR', `Error while parsing mqtt message: ${message}`, module.id)
        return
    }
    //The message has been published by the supervisor to the shared SUPERVISOR_TOPIC_OUT
    //These messages have been delived to all other Aggregators too
    if (topic == SUPERVISOR_TOPIC_OUT) {
        switch (msgJson['message_type']) {
            case 'PING':
                LOG.logSystem('DEBUG', `PING requested`, module.id)
                var response = {
                    request_id: msgJson['request_id'],
                    message_type: 'PONG',
                    sender_id: TOPIC_SELF,
                    payload: {
                        hostname: ROUTES.getRESTCredentials()['hostname'],
                        port: ROUTES.getRESTCredentials()['port'],
                        uptime: process.uptime(),
                        activity_mumber: 10,
                        capacity: 999
                    }
                }
                MQTT.publishTopic(MQTT_HOST, MQTT_PORT, SUPERVISOR_TOPIC_IN, JSON.stringify(response))
                break;
        }
    }
    else if (topic == AGGREGATOR_GLOBAL_TOPIC_IN) {
        switch (msgJson['message_type']) {
            case 'PROCESS_GROUP_MEMBER_DISCOVERY_RESP': {
                LOG.logSystem('DEBUG', `PROCESS_GROUP_MEMBER_DISCOVERY_RESP message received, request_id: [${msgJson['request_id']}]`, module.id)
                if (REQUEST_PROMISES.has(msgJson['request_id'])) {
                    REQUEST_BUFFERS.get(msgJson['request_id']).push(...msgJson['member_engines'])
                }
                break;
            }
        }
    }

    //These messages were sent by the Supervisor or by another Aggregators and only this Aggregator is receiveing it
    else if (topic == TOPIC_SELF) {

    }
}

/**
 * Wrapper function to execute delay
 * @param {int} delay Required dely in millis
 */
async function wait(delay) {
    await AUX.sleep(delay)
}

/**
 * Executes an ID uniqueness verification through cooperating with other Aggregators 
 * @param {string} candidate ID candidate to verify uniqueness
 * @returns A Promise, which becomes 'ok' if the ID was unique 'not_ok' otherwise
 */
async function checkIdCandidate(candidate) {
    var request_id = UUID.v4();
    var message = JSON.stringify(
        request_id = request_id,
        message_type = 'PING'
    )
    MQTT.publishTopic(MQTT_HOST, MQTT_PORT, candidate, JSON.stringify(message))
    var promise = new Promise(function (resolve, reject) {
        REQUEST_PROMISES.set(request_id, resolve)

        wait(ID_VERIFICATION_PERIOD).then(() => {
            resolve('ok')
        })
    });
    return promise
}

/**
 * Init Broker connection the module will use. It will also find a unique ID for the Aggregator itself
 * @param {Broker} broker Broker credentials
 * @returns Returns the own ID of the Aggregator
 */
async function initPrimaryBrokerConnection(broker) {
    MQTT_HOST = broker.host
    MQTT_PORT = broker.port
    MQTT_USER = broker.username
    MQTT_USER_PW = broker.password

    MQTT.init(onMessageReceived)
    MQTT.createConnection(MQTT_HOST, MQTT_PORT, MQTT_USER, MQTT_USER_PW)

    //Find an unused, unique ID for the Engine
    while (true) {
        TOPIC_SELF = UUID.v4();
        MQTT.subscribeTopic(MQTT_HOST, MQTT_PORT, TOPIC_SELF)
        var result = await checkIdCandidate(TOPIC_SELF)
        if (result == 'ok') {
            break;
        }
        else {
            MQTT.unsubscribeTopic(MQTT_HOST, MQTT_PORT, TOPIC_SELF)
        }
    }
    MQTT.subscribeTopic(MQTT_HOST, MQTT_PORT, SUPERVISOR_TOPIC_OUT)
    return TOPIC_SELF
}

async function discoverProcessGroupMembers(groupid) {
    var request_id = UUID.v4();
    var message = {
        "request_id": request_id,
        "message_type": 'PROCESS_GROUP_MEMBER_DISCOVERY',
        "group_id": groupid
    }
    MQTT.publishTopic(BROKER.host, BROKER.port, AGGREGATOR_GLOBAL_TOPIC_OUT, JSON.stringify(message))
    var promise = new Promise(async function (resolve, reject) {
        REQUEST_PROMISES.set(request_id, resolve)
        REQUEST_BUFFERS.set(request_id, [])
        await wait(PROCESS_DISCOVERY_PERIOD)
        LOG.logSystem('DEBUG', `discoverProcessGroupMembers waiting period elapsed`, module.id)
        var result = REQUEST_BUFFERS.get(request_id) || []
        REQUEST_PROMISES.delete(request_id)
        REQUEST_BUFFERS.delete(request_id)
        if (result.length == 0) {
            resolve(new Set())
        }
        else {
            var final = new Set()
            //Result contains an Array of {process_type, process_instance, process_perspective} 
            //In case of multiple perspectives one process instance can be represented multiple times,
            //so we need to handle it
            result.forEach(element => {
                final.add(element.process_type + '/' + element.process_instance)
            });
            resolve(final)
        }
    });
    return promise
}

module.exports = {
    checkIdCandidate: checkIdCandidate,
    initPrimaryBrokerConnection: initPrimaryBrokerConnection,
    discoverProcessGroupMembers: discoverProcessGroupMembers
}