var DB = require('../../egsm-common/database/databaseconnector')
var LOG = require('../../egsm-common/auxiliary/logManager')
var CONNCONF = require('../../egsm-common/config/connectionconfig')
const { Validator } = require('../validator')
const { Job } = require('./job')
const { ArtifactNotification } = require('../../egsm-common/auxiliary/primitives')


module.id = "ART_UNRE_A"

class ArtifactUnreliabilityAlert extends Job {
    constructor(id, owner, monitoredartifacts, faultinessthreshold, windowsize, frequency, notificationrules, notificationmanager) {
        super(id, [], owner, [], [], monitoredartifacts, notificationrules, notificationmanager)
        this.faultinessthreshold = faultinessthreshold
        this.windowsize = windowsize
        this.frequency = frequency
        this.setPeriodicCall(this.onPeriodElapsed.bind(this), frequency)
    }

    onPeriodElapsed() {
        console.log(`ArtifactUnreliabilityAlert onPeriodElapsed called`)
        //Iterating through monitored Artifacts and check
        this.monitoredartifacts.forEach(artifact => {
            DB.readArtifactDefinition(artifact.type, artifact.id).then((artifactdata) => {
                var currentFaultinessValue = artifactdata.faulty_rates.get(this.windowSize)
                if (!Validator.validateArtifactFaultyRate(currentFaultinessValue, this.faultinessthreshold)) {
                    var message = `Faulty rate of artifact [${artifact.type}/${artifact.id}] for window [${this.windowsize}] is [${currentFaultinessValue}]... Above setted threshold ${this.faultinessthreshold}`
                    var errors = [{
                        type: 'artifact_faulty_rate',
                    }]
                    var notification = new ArtifactNotification(this.id, CONNCONF.getConfig().self_id, message, artifact.type, artifact.id, errors)
                    this.notificationmanager.notifyEntities(notification, this.notificationrules)
                }
            })
        });
    }
}

//TODO: Consider to implement ArtifactUnreliabilityGradientAlert based on the application of multiple windows

module.exports = {
    ArtifactUnreliabilityAlert
}