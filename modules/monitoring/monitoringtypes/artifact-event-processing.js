var DB = require('../../egsm-common/database/databaseconnector')
var LOG = require('../../egsm-common/auxiliary/logManager')
const { Job } = require('./job')

module.id = "ARTIFACT_EV_PRO"

class ArtifactEventProcessing extends Job {
    static initialized = false
    constructor(id, owner, frequency) {
        if (ArtifactEventProcessing.initialized) {
            throw new Error('ArtifactEventProcessing is not allowed to start twice!');
        }
        super(id,'artifact-event-processing', [], owner, [], [], [], [], undefined)
        this.frequency = frequency
        this.setPeriodicCall(this.onPeriodElapsed.bind(this), frequency)
        this.initialized = true
    }

    onPeriodElapsed() {
        console.log(`ArtifactEventProcessing onPeriodElapsed called`)
        //Reading all unprocessed Artifact events from the DB
        DB.readUnprocessedArtifactEvents().then(async (data) => {
            console.log(data)
            var affectedArtifacts = new Map()
            var affectedProcessMap = new Map()
            var promises = []
            data.forEach(entry => {
                promises.push(this.checkArtifactDefinition(affectedArtifacts, entry.artifact_name, promises))
                promises.push(this.checkProcessInstanceState(affectedProcessMap, entry.process_type, entry.process_id))
            });
            await Promise.all(promises)
            console.log(affectedArtifacts)
            console.log(affectedProcessMap)
            //Iterating through all entries and considering only the ones regarding defined Artifacts and Process instances which are already finsihed
            //Trying to compose pairs of entries
            var pairs = new Map()
            data.forEach(entry => {
                if (affectedArtifacts.get(entry.artifact_name) && affectedProcessMap.get(entry.process_type + '/' + entry.process_id).status == 'finished') {
                    pairs.set(entry.artifact_name + '___' + entry.event_id, { entry: entry, pair: undefined })
                }
            });
            console.log(pairs)
            for (let [keyAttached, entryAttached] of pairs) {
                for (let [keyDetached, entryDetached] of pairs) {
                    //Pair is not found yet for the keyAttached AND
                    if (entryAttached.pair == undefined &&
                        entryAttached.entry.artifact_state == 'attached' &&
                        entryDetached.entry.artifact_state == 'detached' &&
                        entryAttached.entry.process_type == entryDetached.entry.process_type &&
                        entryAttached.entry.process_id == entryDetached.entry.process_id &&
                        entryAttached.entry.artifact_name == entryDetached.entry.artifact_name) {
                        entryAttached.pair = entryDetached.entry
                        pairs.delete(keyDetached)
                        break;
                    }
                }
            }
            console.log(pairs)

            //Generate new ID-s based on the 2 used entries
            for (let [key, entry] of pairs) {
                if (entry.pair != undefined) {
                    console.log('PAIR ' + key)
                    var case_id = entry.entry.event_id + '_' + entry.pair.event_id
                    //Add the case to the ARTIFACT_USAGE table
                    DB.writeArtifactUsageEntry(entry.entry.artifact_name, case_id, entry.entry.timestamp, entry.pair.timestamp,
                        entry.entry.process_type, entry.entry.process_id, affectedProcessMap.get(entry.entry.process_type + '/' + entry.entry.process_id).outcome)
                    //Set Events to processed in DB    
                    DB.setArtifactEventToProcessed(entry.entry.artifact_name, entry.entry.event_id)
                    DB.setArtifactEventToProcessed(entry.pair.artifact_name, entry.pair.event_id)

                }
            }

        }).then(() => {
            this.processArtifactEvents()
        })
    }

    processArtifactEvents() {

    }

    checkArtifactDefinition(artifactdefinitionmap, artifactname) {
        return new Promise(function (resolve, reject) {
            if (artifactdefinitionmap.has(artifactname)) {
                return resolve()
            }
            artifactdefinitionmap.set(artifactname, false)
            var elements = artifactname.split('/')
            DB.isArtifactDefined(elements[0], elements[1]).then((result) => {
                artifactdefinitionmap.set(artifactname, result)
                resolve()
            })
        });
    }

    checkProcessInstanceState(processmap, processtype, instanceid) {
        return new Promise(function (resolve, reject) {
            var processName = processtype + '/' + instanceid
            if (processmap.has(processName)) {
                return resolve()
            }
            processmap.set(processName, undefined)
            DB.readProcessInstance(processtype, instanceid).then((result) => {
                processmap.set(processName, result)
                resolve()
            })
        });
    }
}
module.exports = {
    ArtifactEventProcessing
}