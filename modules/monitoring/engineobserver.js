var events = require('events');

var LOG = require('../auxiliary/logManager')
var MQTT = require('../communication/mqttconnector')
var DB = require('../database/databaseconnector')
var VALIDATOR = require('../validator')
var GROUPMAN = require('../monitoring/groupmanager')

module.id = "OBSV"

var eventEmitter = new events.EventEmitter();

//Map to store default MQTT broker of each engine instances
/**
 * Map to store default MQTT broker of each engine instances, 
 * furthermore a counter indicates how many monitoring activity is using the engine
 * This value is used to avoid unnecessary MQTT subscription function calls and to 
 * remove the engine fromthis map only when no activity left subcribed to its topics
 */
var ENGINES = new Map()

var MONITORED_BROKERS = new Set() //HOST:PORT

//Data structures to calculate event ID-s
var STAGE_EVENT_ID = new Map()
var ARTIFACT_EVENT_ID = new Map()

function addMonitoredBroker(hostname, port, username, userpassword) {
    //TODO: add proper, unique clientname. It is hardcoded now and mosquitto wont work in case of more than 1 agents
    LOG.logSystem('DEBUG', `Adding monitored broker: ${hostname}:${port}`, module.id)
    MQTT.createConnection(hostname, port, username, userpassword, 'aggregator-client')
    MQTT.subscribeTopic(hostname, port, 'process_lifecycle')
    MONITORED_BROKERS.add(hostname + ':' + port)
}

function removeMonitoredBroker(hostname, port) {
    LOG.logSystem('DEBUG', `Removing monitored broker: ${hostname}:${port}`, module.id)
    if(MONITORED_BROKERS.has(hostname + ':' + port)){
        MQTT.unsubscribeTopic(hostname, port, 'process_lifecycle')
        MONITORED_BROKERS.delete(hostname + ':' + port)
    }
}

function onMessageReceived(hostname, port, topic, message) {
    LOG.logWorker('DEBUG', `onMessageReceived called`, module.id)
    var elements = topic.split('/')
    var engineid = elements[0] + '/' + elements[1]//Engine id is the first two parts of the topic

    try {
        var msgJson = JSON.parse(message.toString())
    } catch (error) {
        LOG.logWorker('ERROR', `Error while parsing JSON message (${error})`, module.id)
        return
    }

    //Handling the incoming message
    //Process lifecycle event
    if (topic == 'process_lifecycle') {
        var stakeholderNames = []
        msgJson.stakeholders.forEach(element => {
            stakeholderNames.push(element.name)
        });
        switch (msgJson.event_type) {
            case 'created':
                GROUPMAN.addProcessInstanceDynamic(msgJson.process_type, msgJson.instance_id, stakeholderNames)
                //NOTE: We are NOT adding engine to ENGINES map here, it will be done by the Monitoring Agent
                break;
            case 'deleted':
                GROUPMAN.removeProcessInstanceDynamic(msgJson.process_type, msgJson.instance_id, stakeholderNames)
                //NOTE: We are NOT removing engine from ENGINES map here, it will be done by the Monitoring Agent
                break;
            default:
                LOG.logSystem('WARNING', `Unknown event type (${msgJson.event_type}) received on topic ${topic}`)
            break;
        }
    }
    //Process-related event
    else if (ENGINES.has(engineid)) {
        //Engine event has to be write into database
        switch (elements[2]) {
            case 'stage_log':
                //TODO: revise
                var eventid = STAGE_EVENT_ID.get(engineid) + 1
                STAGE_EVENT_ID.set(engineid, eventid)

                if (!VALIDATOR.validateStageLogMessage(msgJson)) {
                    LOG.logWorker('WARNING', `Data is missing to write StageEvent log`, module.id)
                    return
                }

                var stageLog = {
                    processid: msgJson.processid,
                    eventid: 'event_' + eventid.toString(),
                    timestamp: msgJson.timestamp,
                    stagename: msgJson.stagename,
                    status: msgJson.status,
                    state: msgJson.state,
                    compliance: msgJson.compliance
                }

                DB.writeStageEvent(stageLog)

                //Notify core
                eventEmitter.emit(engineid + '/stage_log', engineid, 'stage', msgJson)
                break;

            case 'artifact_log':
                var eventid = ARTIFACT_EVENT_ID.get(engineid) + 1
                ARTIFACT_EVENT_ID.set(engineid, eventid)

                if (!VALIDATOR.validateArtifactLogMessage(msgJson)) {
                    LOG.logWorker('WARNING', `Data is missing to write ArtifactEvent log`, module.id)
                    return
                }

                msgJson['event_id'] = eventid
                //Write artifact event into Database
                DB.writeArtifactEvent(msgJson)

                //Update process instance attachment in Database
                if (msgJson.artifact_state == 'attached') {
                    DB.attachArtifactToProcessInstance(msgJson.process_type, msgJson.process_id, msgJson.artifact_name)
                }
                else {
                    DB.deattachArtifactFromProcessInstance(msgJson.process_type, msgJson.process_id, msgJson.artifact_name)
                }

                //Notify core if about the event and it will evaluate based on historical data and
                //the configured observation if any further thing is needed to do
                eventEmitter.emit(engineid + '/artifact_log', msgJson)
                break

            case 'adhoc':
                // Adhoc events are not written into the database for now, they are not used in any
                //post-processing currently

                //In case of an adhoc event the core needs to be notified
                eventEmitter.emit(engineid + '/adhoc', msgJson)
                break;
        }
    }
    else {
        LOG.logWorker('WARNING', `Event log message received from an unknown engine [${hostname}]:[${port}] -> [${topic}]`, module.id)
    }
}

async function addEngine(engineid) {
    LOG.logWorker('DEBUG', `addEngine called: ${engineid} -> ${hostname}:${port}`, module.id)
    //Add engine to the module collections
    if (!ENGINES.has(engineid)) {
        //Retrieving engine details from Database
        var elements = engineid.split('/')
        var type = elements[0]
        var instanceid = elements[1]
        var retrieved = await DB.readProcessInstance(type, instanceid)
        if (retrieved == undefined) {
            LOG.logWorker('ERROR', `Process [${engineid}] is not registered in the database, it cannot be monitored`, module.id)
            return
        }
        var hostname = retrieved.host
        var port = retrieved.port

        ENGINES.set(engineid, { hostname: hostname, port: port, processcnt: 1 })
        STAGE_EVENT_ID.set(engineid, 0)
        ARTIFACT_EVENT_ID.set(engineid, 0)
        MQTT.createConnection(hostname, port, '', '', 'aggregator-client')
        MQTT.subscribeTopic(hostname, port, engineid + '/stage_log')
        MQTT.subscribeTopic(hostname, port, engineid + '/artifact_log')
        MQTT.subscribeTopic(hostname, port, engineid + '/adhoc')
    }
    else {
        LOG.logWorker('DEBUG', `Engine [${engineid}] is alredy registered`, module.id)
        var data = ENGINES.get(engineid)
        data.processcnt = data.processcnt + 1
        ENGINES.set(data)
    }
}

function removeEngine(engineid) {
    LOG.logWorker('DEBUG', `removeEngine called: ${engineid}`, module.id)
    if (ENGINES.has(engineid) && ENGINES.get(engineid).processcnt == 1) {
        MQTT.unsubscribeTopic(hostname, port, engineid + '/stage_log')
        MQTT.unsubscribeTopic(hostname, port, engineid + '/artifact_log')
        MQTT.unsubscribeTopic(hostname, port, engineid + '/adhoc')
        ENGINES.delete(engineid)
        STAGE_EVENT_ID.delete(engineid)
        ARTIFACT_EVENT_ID.delete(engineid)
    }
    else if (ENGINES.has(engineid) && ENGINES.get(engineid).processcnt > 1) {
        var data = ENGINES.get(engineid)
        data.processcnt = data.processcnt - 1
        ENGINES.set(data)
    }
    else {
        LOG.logWorker('WARNING', `Engine [${engineid}] cannot be removed, it is not registered`, module.id)
    }
}

//Setting up MQTT environment
MQTT.init(onMessageReceived)

module.exports = {
    eventEmitter: eventEmitter,
    addMonitoredBroker: addMonitoredBroker,
    removeMonitoredBroker: removeMonitoredBroker,
    addEngine: addEngine,
    removeEngine: removeEngine
}