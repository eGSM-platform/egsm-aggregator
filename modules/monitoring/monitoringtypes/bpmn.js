var LOG = require('../../egsm-common/auxiliary/logManager')
var CONNCOMM = require('../../egsm-common/config/connectionconfig')
const { ProcessNotification } = require('../../egsm-common/auxiliary/primitives')
const { Validator } = require('../../egsm-common/auxiliary/validator')
const { Job } = require('./job')

module.id = "BPMN"

class BpmnJob extends Job {
    constructor(id, brokers, owner, monitored, monitoredprocessgroups, notificationrules, notificationmanager) {
        super(id, brokers, owner, monitored, monitoredprocessgroups, [], notificationrules, notificationmanager)
    }

    onProcessEvent(messageObj) {
        /*var errors = Validator.validateProcessStage(messageObj.stage)
        if (errors.length > 0) {
            console.debug(`Faulty stage of process [${messageObj.processtype}/${messageObj.instanceid}]__${messageObj.perspective} detected: ${JSON.stringify(errors)}`)
            var message = `Process deviation detected at [${messageObj.processtype}/${messageObj.instanceid}]__${messageObj.perspective}]!`
            var notification = new ProcessNotification(this.id, CONNCOMM.getConfig().self_id, message, messageObj.processtype, messageObj.instanceid, messageObj.perspective, [...this.monitoredprocesses], errors)
            this.notificationmanager.notifyEntities(notification, this.notificationrules)
        }*/
    }
}

module.exports = {
    BpmnJob
}