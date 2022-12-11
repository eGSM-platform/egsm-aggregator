var DB = require('../../egsm-common/database/databaseconnector')
var LOG = require('../../egsm-common/auxiliary/logManager')
const { Job } = require('./job')
const { FaultyRateWindow } = require('../../egsm-common/auxiliary/primitives')

module.id = "ARTIFACT_US_P"

const MAX_CONSIDERING_PERIOD = 1209600 // 2 Weeks

function artifactUsageEntrySort(a, b) {
    const timeA = a.detach_time
    const timeB = b.detach_time
    if (timeA > timeB) {
        return -1;
    }
    if (timeA < timeB) {
        return 1;
    }
    return 0;
}

class ArtifactUsageStatisticProcessing extends Job {
    static initialized = false
    constructor(id, owner, monitoredartifacts, frequency) {
        if (ArtifactUsageStatisticProcessing.initialized) {
            throw new Error('ArtifactUsageStatisticProcessing is not allowed to start twice!');
        }
        super(id, [], owner, [], [], monitoredartifacts, [], undefined)
        this.frequency = frequency
        this.setPeriodicCall(this.onPeriodElapsed.bind(this), frequency)
        this.initialized = true
    }

    onPeriodElapsed() {
        //console.log(`ArtifactUsageStatisticProcessing onPeriodElapsed called`)

        this.monitoredartifacts.forEach(element => {
            //console.log(`Processing Artifact ${element}`)
            DB.readArtifactDefinition(element.type, element.id).then((artifact) => {
                if (artifact == undefined) {
                    console.log('No artifact definition found')
                    return
                }
                console.log('Artifact definition found')
                //Find the entry with the smallest earliest_usage_entry_time (apply MAX_CONSIDERING_PERIOD in case of -1)
                //And read the Artifact Usage entries from the calculated timestamp
                var earliestTime = Date.now() / 1000
                for (let [key, value] of artifact.faulty_rates.entries()) {
                    if (value.earliest_usage_entry_time == -1) {
                        earliestTime = Date.now() / 1000 - MAX_CONSIDERING_PERIOD
                    }
                    else if (value.earliest_usage_entry_time < earliestTime) {
                        earliestTime = value.earliest_usage_entry_time
                    }
                }

                DB.readArtifactUsageEntries(artifact.type + '/' + artifact.id, Math.floor(Date.now() / 1000) - earliestTime, Math.floor(Date.now() / 1000)).then((artifactUsageEntries) => {
                    //Organize entries based on their detach_time attribute (decreasing order)
                    artifactUsageEntries.sort(artifactUsageEntrySort)

                    for (let [key, value] of artifact.faulty_rates.entries()) {
                        //Last time there was not enough entries to calculate valid value, now there may be enough
                        var faultyCnt = 0
                        var successCnt = 0
                        var newFaultyRateWindow = new FaultyRateWindow(key, -1, -1, -1)
                        for (var i = 0; i < artifactUsageEntries.length; i++) {
                            if (artifactUsageEntries[i].outcome == 'success') {
                                successCnt += 1
                            }
                            else {
                                faultyCnt += 1
                            }
                            if (faultyCnt + successCnt >= key) {
                                console.log('UPDATE')
                                var newFaultyRateWindow = new FaultyRateWindow(key, (faultyCnt / successCnt) * 100, Math.floor(Date.now() / 1000), artifactUsageEntries[i].detach_time)
                                var nameElements = artifactUsageEntries[i].artifact_name.split('/')
                                DB.updateArtifactFaultyRate(nameElements[0], nameElements[1], newFaultyRateWindow)
                                break
                            }
                        }
                    }
                })
            });
        })
    }
}
module.exports = {
    ArtifactUsageStatisticProcessing
}