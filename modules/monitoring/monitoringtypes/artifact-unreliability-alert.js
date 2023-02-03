var DB = require('../../egsm-common/database/databaseconnector')
var LOG = require('../../egsm-common/auxiliary/logManager')
var CONNCONF = require('../../egsm-common/config/connectionconfig')
const { Validator } = require('../../egsm-common/auxiliary/validator')
const { Job } = require('./job')
const { ArtifactNotification } = require('../../egsm-common/auxiliary/primitives')


module.id = "ART_UNRE_A"

/**
 * A type of Job performing Artifact Monitoring. It monitores a set of Artifacts and periodically checks the ratio of faulty Process Instances the artifacts
 * participating in. The job considers a predefined window size which is used to calculate the faultiness ratio. If this ratio is above the predefined threshold
 * it will send Notifications to Stakeholders based on the provided Notifiation Rules 
 */
class ArtifactUnreliabilityAlert extends Job {
    /**
     * 
     * @param {String} id Job ID
     * @param {String} owner Owner of the Job (e.g.: Stakeholder name)
     * @param {String[]} monitoredartifacts List of Artifact ID-s to monitor
     * @param {Number} faultinessthreshold Minimum faultiness ratio to send Notification
     * @param {Number} windowsize Applied window size when calculating faultiness ratio
     * @param {Number} frequency Frequency in seconds
     * @param {Object} notificationrules Set of Notification Rules
     * @param {Object} notificationmanager Reference to the Applied Notification Manager
     */
    constructor(id, owner, monitoredartifacts, faultinessthreshold, windowsize, frequency, notificationrules, notificationmanager) {
        super(id, 'artifact-unreliabiliry-alert', [], owner, [], [], monitoredartifacts, notificationrules, notificationmanager)
        this.faultinessthreshold = faultinessthreshold
        this.windowsize = windowsize
        this.frequency = frequency
        this.setPeriodicCall(this.onPeriodElapsed.bind(this), frequency)
    }

    /**
     * Called when the sleeping period elapsed and performs the check for each Artifacts 
     */
    onPeriodElapsed() {
        //Iterating through monitored Artifacts and check
        this.monitoredartifacts.forEach(artifact => {
            var context = this
            DB.readArtifactDefinition(artifact.type, artifact.id).then((artifactdata) => {
                var currentFaultinessValue = artifactdata.faulty_rates.get(context.windowsize)
                if (!Validator.validateArtifactFaultyRate(currentFaultinessValue, context.faultinessthreshold)) {
                    var message = `Faulty rate of artifact [${artifact.type}/${artifact.id}] for window [${context.windowsize}] is [${currentFaultinessValue}]... Above set threshold ${context.faultinessthreshold}`
                    var errors = [{
                        type: 'artifact_faulty_rate',
                    }]
                    var notification = new ArtifactNotification(context.id, CONNCONF.getConfig().self_id, context.job_type, message, artifact.type, artifact.id, errors)
                    context.notificationmanager.notifyEntities(notification, context.notificationrules)
                }
            })
        });
    }
}

module.exports = {
    ArtifactUnreliabilityAlert
}