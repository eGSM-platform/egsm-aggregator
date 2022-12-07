var LOG = require('../../egsm-common/auxiliary/logManager')
const { Job } = require('./job')

module.id = "PRO_DEV_DET"

/*function evaluateStageEvent(eventDetails) {
    var errors = []
    if (eventDetails.status == 'faulty') {
        errors.push(eventDetails.outcome)
    }
    if (eventDetails.compliance != 'onTime') {
        errors.push(eventDetails.compliance)
    }
    return errors
}*/


class ProcessDeviationDetection extends Job {
    constructor(id, brokers, owner, monitored, monitoredprocessgroups, monitoredartifacts, notificationrules) {
        super(id, brokers, owner, monitored, monitoredprocessgroups, monitoredartifacts, notificationrules)
    }

    onProcessEvent(message) {
        console.warn('Overwritten function')
    }

}

module.exports = {
    ProcessDeviationDetection
}