var events = require('events');

var LOG = require('../auxiliary/LogManager')
var MQTT = require('../communication/mqttconnector')
var DYNAMO = require('../database/dynamoconnector')
var DB = require('../database/databaseconnector')
module.id = "ENGINE_OBSERVER"

var eventEmitter = new events.EventEmitter();

//Map to store default MQTT broker of each engine instances
var ENGINES = new Map()
//Data structures to calculate event ID-s
var STAGE_EVENT_ID = new Map()
var ARTIFACT_EVENT_ID = new Map()

//function verifyStageState(status, compliance) {
//    if (status == 'faulty' || compliance == 'outOfOrder' || compliance == 'skipped') {
//        return false
//    }
//    return true
//}

function onMessageReceived(hostname, port, topic, message) {
    LOG.logWorker('DEBUG', `onMessageReceived called`, module.id)
    var elements = topic.split('/')
    var engineid = elements[0] + '/' + elements[1]//Engine id is the first two parts of the topic
    var msgJson = JSON.parse(message.toString())

    //Performing Database operations
    if (ENGINES.has(engineid)) {
        //Engine event has to be write into database
        switch (elements[2]) {
            case 'stage_log':
                //TODO: revise
                var eventid = STAGE_EVENT_ID.get(engineid) + 1
                STAGE_EVENT_ID.set(engineid, eventid)


                if (msgJson.processid == undefined || msgJson.stagename == undefined || msgJson.timestamp == undefined ||
                    msgJson.status == undefined || msgJson.state == undefined || msgJson.compliance == undefined) {
                    LOG.logWorker('WARNING', `Data is missing to write StageEvent log`, module.id)
                    return
                }

                var processid = msgJson.processid
                var stagename = msgJson.stagename
                var timestamp = msgJson.timestamp
                var status = msgJson.status
                var state = msgJson.state
                var compliance = msgJson.compliance

                //TODO: add database writing
                //DB.writeStageEvent(engineid, stagename, eventid, details, timestamp)

                //Notify core
                eventEmitter.emit(engineid + '/stage_log', engineid, 'stage', msgJson)
                break;

            case 'artifact_log':
                var eventid = ARTIFACT_EVENT_ID.get(engineid) + 1
                ARTIFACT_EVENT_ID.set(engineid, eventid)

                if (msgJson.timestamp == undefined || msgJson.artifact_name == undefined || msgJson.artifact_state == undefined ||
                    msgJson.process_type == undefined || msgJson.process_id == undefined) {
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
        var retrieved = await DB.readProcessInstance(type,instanceid)
        if(retrieved == undefined){
            LOG.logWorker('ERROR', `Process [${engineid}] is not registered in the database, it cannot be monitored`, module.id)
            return
        }
        var hostname = retrieved.host
        var port = retrieved.port

        ENGINES.set(engineid, { hostname: hostname, port: port })
        STAGE_EVENT_ID.set(engineid, 0)
        ARTIFACT_EVENT_ID.set(engineid, 0)
        MQTT.createConnection(hostname, port, '', '', 'aggregator-client')
        MQTT.subscribeTopic(hostname, port, engineid + '/stage_log')
        MQTT.subscribeTopic(hostname, port, engineid + '/artifact_log')
        MQTT.subscribeTopic(hostname, port, engineid + '/adhoc')
    }
    else {
        LOG.logWorker('DEBUG', `Engine [${engineid}] is alredy registered`, module.id)
    }
}

function removeEngine(engineid) {
    LOG.logWorker('DEBUG', `removeEngine called: ${engineid}`, module.id)
    if (ENGINES.has(engineid)) {
        MQTT.unsubscribeTopic(hostname, port, engineid + '/stage_log')
        MQTT.unsubscribeTopic(hostname, port, engineid + '/artifact_log')
        MQTT.unsubscribeTopic(hostname, port, engineid + '/adhoc')
        ENGINES.delete(engineid)
        STAGE_EVENT_ID.delete(engineid)
        ARTIFACT_EVENT_ID.delete(engineid)
    }
    else {
        LOG.logWorker('WARNING', `Engine [${engineid}] cannot be removed, it is not registered`, module.id)
    }
}

MQTT.init(onMessageReceived)

module.exports = {
    eventEmitter: eventEmitter,
    addEngine: addEngine,
    removeEngine: removeEngine
}