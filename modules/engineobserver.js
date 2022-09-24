var events = require('events');

var LOG = require('./auxiliary/LogManager')
var MQTT = require('./mqttconnector')
var DB = require('./database/databaseconnector')
module.id = "EVENT_LOGGER"

var eventEmitter = new events.EventEmitter();

//Map to store default MQTT broker of each engine instances
var ENGINES = new Map()
//Data structures to calculate event ID-s
var STAGE_EVENT_ID = new Map()
var ARTIFACT_EVENT_ID = new Map()

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
            /*var eventid = STAGE_EVENT_ID.get(engineid) + 1
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
            break;*/
            case 'artifact_log':
                var eventid = ARTIFACT_EVENT_ID.get(engineid) + 1
                ARTIFACT_EVENT_ID.set(engineid, eventid)

                if (msgJson.timestamp == undefined || msgJson.artifact_name == undefined || msgJson.artifact_state == undefined ||
                    msgJson.process_type == undefined || msgJson.process_id == undefined) {
                    LOG.logWorker('WARNING', `Data is missing to write ArtifactEvent log`, module.id)
                    return
                }

                msgJson['event_id'] = eventid
                DB.writeArtifactEvent(msgJson)

                //Notify core if about the event and it will evaluate based on historical data and
                //the configured observation if any further thing is needed to do
                eventEmitter.emit('artifact_log', engineid, msgJson)
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
        LOG.logWorker('WARNING', `Event log message received from an unknown engine [${hostname}]:[${port}] -> [${topic}]`, module.id)
    }
}

function addEngine(engineid, hostname, port) {
    LOG.logWorker('DEBUG', `addEngine called: ${engineid} -> ${hostname}:${port}`, module.id)
    //Add engine to the module collections
    if (!ENGINES.has(engineid)) {
        ENGINES.set(engineid, { hostname: hostname, port: port })
        STAGE_EVENT_ID.set(engineid, 0)
        ARTIFACT_EVENT_ID.set(engineid, 0)
        MQTT.createConnection(hostname, port, '', '', 'aggregator-client')
        MQTT.subscribeTopic(hostname, port, engineid + '/stage_log')
        MQTT.subscribeTopic(hostname, port, engineid + '/artifact_log')
        MQTT.subscribeTopic(hostname, port, engineid + '/adhoc')
    }
    else {
        LOG.logWorker('WARNING', `Engine [${engineid}] is alredy registered`, module.id)
    }
}

MQTT.init(onMessageReceived)

module.exports = {
    eventEmitter: eventEmitter,

    addEngine: addEngine,

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

//addEngine('DummyProcess/instance-1', 'localhost', 1883)
//var dummyArtifactEvent = {
//    artifact_name: 'truck/0001',
//    timestamp: 10000001,
//    artifact_state: 'attached',
//    process_type: 'DummyProcess',
//    process_id: 'instance-1'
//}
//dummyEventJson = JSON.stringify(dummyArtifactEvent)
//onMessageReceived('localhost', 1883, 'DummyProcess/instance-1/artifact_log', dummyEventJson)
//onMessageReceived('localhost', 1883, 'DummyProcess/instance-1/artifact_log', dummyEventJson)

/*DB.readUnprocessedArtifactEvents('truck/0001').then((data) =>{
    console.log(data)
    for(i in data){
        //DB.setArtifactEventToProcessed(i['ARTIFACT_NAME'],i['EVENT_ID'])
    }
    DB.setArtifactEventToProcessed('truck/0001','1')
})*/
//DB.readOlderArtifactEvents('truck/0001', 10000003).then((data) =>{
//    console.log(data)
//    for(var i in data){
//        DB.deleteArtifactEvent(data[i].ARTIFACT_NAME.S,data[i].EVENT_ID.S)
//    }
//})
//DB.writeNewProcessType('dummy1', 'model egsdm ad ', 'modek bmpn')
var time = new Date().getTime(null)
//DB.writeNewArtifactDefinition('truck','0003',['best truck company'])
//DB.writeNewArtifactDefinition('truck','0004',['best truck company'])

//DB.writeNewProcessInstance('dummy3', 'instance1', [],[],100)//['truck company', 'warehouse company'], ['Construction 1', 'EU transportation', 'Truck Maintenance'], time)

//DB.closeOngoingProcessInstance('dummy2', 'instance1', 1001)
//DB.writeNewStakeholder('truck company 1', 'truck_company_1')
//DB.addNewFaultiRateWindow('truck','0004','w15')
for (var i = 0; i < 10; i++) {
    let l = i
    DB.writeNewArtifactDefinition('truck', `${i}`, ['the truck company']).then(() => {
        for (var k = 10; k < 100; k+=10) {
            let k2 = k
            DB.addNewFaultyRateWindow('truck', `${l}`, `w${k}`).then(() => {
                //var date = Date().getTime()
                DB.addArtifactFaultyRateToWindow('truck', `${l}`, `w${k2}`, 1000, 1.265 * k, `case_854545${l+k}`)
            })
        }
    })
}
/*DB.getLatestArtifactFaultyRate('truck','0004','w15').then((data)=>{
    console.log(data)
})*/
console.log('ok3')

