var LOG = require('../../egsm-common/auxiliary/logManager')
const { Validator } = require('../validator')
const { Job } = require('./job')

module.id = "PRO_DEV_DET"

class ProcessDeviationDetection extends Job {
    constructor(id, brokers, owner, monitored, monitoredprocessgroups, notificationrules, notificationmanager) {
        super(id, brokers, owner, monitored, monitoredprocessgroups, [], notificationrules, notificationmanager)
    }

    onProcessEvent(messageObj) {
        //console.warn('Overwritten function')
        var errors = Validator.validateProcessStage(messageObj.stage)
        if (errors.length > 0) {
            console.debug(`Faulty stage of process [${messageObj.processtype}/${messageObj.instanceid}]__${messageObj.perspective} detected: ${errors}`)
            this.notifyStakeholders(messageObj.processtype, messageObj.instanceid, messageObj.perspective, errors)
        }
    }
}

module.exports = {
    ProcessDeviationDetection
}