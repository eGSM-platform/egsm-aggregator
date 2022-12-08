var DB = require('../../egsm-common/database/databaseconnector')
var LOG = require('../../egsm-common/auxiliary/logManager')
const { Validator } = require('../validator')
const { Job } = require('./job')

module.id = "PRO_DEV_DET"

class ArtifactUnreliabilityAlert extends Job {
    constructor(id, brokers, owner, monitoredartifacts, faultinessthreshold, windowsize, frequency, notificationrules,notificationmanager) {
        super(id, brokers, owner, [], [], monitoredartifacts, notificationrules,notificationmanager)
        this.faultinessThreshold = faultinessthreshold
        this.WindowSize = windowsize
        this.frequency = frequency
        this.setPeriodicCall(this.onPeriodElapsed.bind(this), frequency)
    }

    onPeriodElapsed() {
        console.log(`ArtifactUnreliabilityAlert onPeriodElapsed called`)
        //Iterating through monitored Artifacts and check
        this.monitoredartifacts.forEach(artifact => {
            DB.readArtifactDefinition(artifact.type, artifact.id).then((data)=>{
                
            })
        });
    }
}

module.exports = {
    ArtifactUnreliabilityAlert
}