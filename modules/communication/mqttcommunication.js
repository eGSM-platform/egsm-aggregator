/**
 * Responsible to handle software-level MQTT communication
 */

var UUID = require("uuid");

var MQTT = require("../egsm-common/communication/mqttconnector")
var LOG = require('../egsm-common/auxiliary/logManager')

module.id = "MQTTCOMM"

const ID_VERIFICATION_PERIOD = 1500 //Time the other Aggregators has to reply if their ID is identical with the one the local worker wants to use

//Topic definitions
const SUPERVISOR_TOPIC_IN = 'supervisor_aggregator_in'
const SUPERVISOR_TOPIC_OUT = 'supervisor_aggregator_out'
var TOPIC_SELF = ''

var MQTT_HOST = undefined
var MQTT_PORT = undefined;
var MQTT_USER = undefined;
var MQTT_USER_PW = undefined

var REQUEST_PROMISES = new Map()

function onMessageReceived(hostname, port, topic, message) {

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

module.exports = {
    checkIdCandidate: checkIdCandidate,
    initPrimaryBrokerConnection: initPrimaryBrokerConnection
}