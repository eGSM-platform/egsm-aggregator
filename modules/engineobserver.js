var events = require('events');

var LOG = require('./LogManager')
var MQTT = require('./mqttconnector')
var DB = require('./dynamoconnector')
module.id = "EVENT_LOGGER"

var eventEmitter = new events.EventEmitter();

//Map to store default MQTT broker of each engine instances
var ENGINES = new Map()
//Data structures to calculate event ID-s
var STAGE_EVENT_ID = new Map()
var ARTIFACT_EVENT_ID = new Map()

//Returns the name of the error if the stage contains error and the core should be notified, 'correct' otherwise
function checkStageForError(stagename, stagedetailjson) {
    //TODO
    return true
}

//Returns true if the core has been subscribed to artifact events from the artifact the event regards to, false otherwise 
function checkArtifactNotification(artifacttype, artifactid, artifactstate) {
    //TODO
    //Retrieve faulty rate of the 
    return true
}

function onMessageReceived(hostname, port, topic, message) {
    LOG.logWorker('DEBUG', `onMessageReceived called`, module.id)
    var elements = topic.split('/')
    var engineid = elements[0] //Engine id is the first part of the topic
    var msgJson = JSON.parse(message.toString())

    //Performing Database operations
    if (ENGINES.has(engineid)) {
        //Engine event has to be write into database
        switch (elements[1]) {
            case 'stage_log':
                var eventid = STAGE_EVENT_ID.get(engineid) + 1
                STAGE_EVENT_ID.set(engineid, eventid)

                var timestamp = msgJson.timestamp
                var details = msgJson.details
                var stagename = msgJson.stagename

                DB.writeStageEvent(engineid, stagename, eventid, details, timestamp)

                //Notify core if needed
                var eventtype = checkStageForError(stagename, details)
                if (eventtype != 'correct') {
                    eventEmitter.emit('stage_log', engineid, eventtype, msgJson)
                }
                break;
            case 'artifact_log':
                var eventid = ARTIFACT_EVENT_ID.get(engineid) + 1
                ARTIFACT_EVENT_ID.set(engineid, eventid)

                var timestamp = msgJson.timestamp
                var artifacttype = msgJson.artifacttype
                var artifactid = msgJson.artifactid
                var artifactstate = msgJson.artifactstate

                DB.writeArtifactEvent(engineid, artifacttype, artifactid, artifactstate, timestamp)

                //Notify core if needed
                if (checkArtifactNotification(artifacttype, artifactid, artifactstate)) {
                    eventEmitter.emit('artifact_log', engineid, msgJson)
                }
                break

            case 'adhoc':
                // Adhoc events are not written into the database for now, they are not used in any
                //post-processing currently

                //In case of an adhoc event the core needs to be notified
                eventEmitter.emit('adhoc', engineid, eventtype, msgJson)
                break;
        }
    }
    else {
        LOG.logWorker('WARNING', `Event log message received from an unknown engine [${host}]:[${port}] -> [${topic}]`, module.id)
    }
}


mqtt.init(onMessageReceived)

module.exports = {
    eventEmitter: eventEmitter,

    addEngine: function (engineid, hostname, port) {
        LOG.logWorker('DEBUG', `addEngine called: ${engineid} -> ${hostname}:${port}`, module.id)
        //Add engine to the module collections
        if (!ENGINES.has(engineid)) {
            ENGINES.set(engineid, { hostname: hostname, port: port })
            STAGE_EVENT_ID.set(engineid, 0)
            ARTIFACT_EVENT_ID.set(engineid, 0)
            MQTT.subscribeTopic(hostname, port, engineid + '/stage_log')
            MQTT.subscribeTopic(hostname, port, engineid + '/artifact_log')
            MQTT.subscribeTopic(hostname, port, engineid + '/adhoc')
        }
        else {
            LOG.logWorker('WARNING', `Engine [${engineid}] is alredy registered`, module.id)
        }
    },

    removeEngine: function (engineid) {
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

    },
}

