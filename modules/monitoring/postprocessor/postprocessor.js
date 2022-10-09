var LOG = require('../auxiliary/LogManager')
var DYNAMO = require('../database/dynamoconnector')
var DDB = require('../database/databaseconnector')

module.id = "POSTPROCESSOR"

function processArtifactEvents() {
    DDB.readUnprocessedArtifactEvents().then((data, err) => {
        if (err) {
            return
        }
        //Iterating through all unhandled events
        var processedEvents = new Map() //contains the event id-s which have been managed to pair
        var pairs = new Map() //Attached -> Detached pairs with event_id-s

        data.forEach(event1 => {
            data.forEach(event2 => {
                //If the two events are:
                if (event1.event_id != event2.event_id && //not the same
                    event1.artifact_state != event2.artifact_state && // not having the same state
                    event1.process_type == event2.process_type && //same process type
                    event1.process_id == event2.process_id && //same process instance
                    event1.artifact_name == event2.artifact_name) { //same artifact

                    processedEvents.set(event1.event_id, event1)
                    processedEvents.set(event2.event_id, event2)
                    var member1, member2 = undefined
                    if (event1.artifact_state == 'attached' && event2.artifact_state == 'detached') {
                        member1 = event1
                        member2 = event2
                        //pairs.set(event1.event_id, event2.event_id)
                    }
                    else if (event1.artifact_state == 'detached' && event2.artifact_state == 'attached') {
                        member1 = event2
                        member2 = event1
                        //pairs.set(event2.event_id, event1.event_id)
                    }
                    if (member1 && member2) {
                        //After a pair has been constructed checking if the regarding process is finished
                        //If the process's state is finished, write a new entry to the ARTIFACT_USAGE table and set the
                        //two Artifact Event's state to 'processed' in the ARTIFACT_EVENT table
                        DDB.readProcessInstance(member1.process_type, member1.process_id).then((data, err) => {
                            if (err || data == undefined) {
                                //error or the process instance is not defined
                            }
                            else if (data?.status == 'finished') {
                                //TODO: add proper case_id
                                DDB.writeArtifactUsageEntry(member1.artifact_name,
                                    member1.event_id + member2.event_id, member1.timestamp,
                                    member2.timestamp, member1.process_type, member1.process_id, data.outcome)
                                DDB.setArtifactEventToProcessed(member1.artifact_name, engine1.event_id)
                                DDB.setArtifactEventToProcessed(member2.artifact_name, engine2.event_id)
                            }
                        })
                    }
                }
            });
        });
    })
}

function updateArtifactFaultyRates(window){
    
}

module.exports = {
    processArtifactEvents:processArtifactEvents
}