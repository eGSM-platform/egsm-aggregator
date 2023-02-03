var LOG = require('../../../egsm-common/auxiliary/logManager')
var CONNCOMM = require('../../../egsm-common/config/connectionconfig')
const { ProcessNotification } = require('../../../egsm-common/auxiliary/primitives')
const { Validator } = require('../../../egsm-common/auxiliary/validator')
const { Job } = require('../job')
const { ProcessPerspective } = require('./process-perspective')
const { SkipDeviation, IncompleteDeviation } = require("./process-perspective");

module.id = "BPMN"

class BpmnJob extends Job {
  constructor(id, brokers, owner, monitored, monitoredprocessgroups, notificationrules, notificationmanager, perspectives) {
    super(id, 'bpmn', brokers, owner, monitored, monitoredprocessgroups, [], notificationrules, notificationmanager)
    this.perspectives = new Map()

    perspectives.forEach(element => {
      this.perspectives.set(element.name, new ProcessPerspective(element.name, element.egsm_model, element.bpmn_diagram))
    });
  }

  onProcessEvent(messageObj) {
    console.log(messageObj)
    var process = messageObj.process_type + '/' + messageObj.process_id + '__' + messageObj.process_perspective
    if (this.monitoredprocesses.has(process)) {
      if (this.perspectives.has(messageObj.process_perspective)) {
        var perspective = this.perspectives.get(messageObj.process_perspective)
        var egsm = perspective.egsm_model
        if (egsm.stages.has(messageObj.stage_name)) {
          if(messageObj.state == 'opened'){
            messageObj.state = 'open'
          }
          egsm.updateStage(messageObj.stage_name, messageObj.status.toUpperCase(), messageObj.state.toUpperCase(), messageObj.compliance.toUpperCase())
          var deviations = perspective.analyze()
          this.triggerCompleteUpdateEvent()
          console.log(deviations)
        }
      }
    }
    /*var errors = Validator.validateProcessStage(messageObj.stage)
    if (errors.length > 0) {
        console.debug(`Faulty stage of process [${messageObj.processtype}/${messageObj.instanceid}]__${messageObj.perspective} detected: ${JSON.stringify(errors)}`)
        var message = `Process deviation detected at [${messageObj.processtype}/${messageObj.instanceid}]__${messageObj.perspective}]!`
        var notification = new ProcessNotification(this.id, CONNCOMM.getConfig().self_id, message, messageObj.processtype, messageObj.instanceid, messageObj.perspective, [...this.monitoredprocesses], errors)
        this.notificationmanager.notifyEntities(notification, this.notificationrules)
    }*/
  }

  getBpmnDiagrams() {
    var resultPerspectives = []
    this.perspectives.forEach(element => {
      resultPerspectives.push({
        name: element.perspective_name,
        bpmn_xml: element.bpmn_model.model_xml
      })
    });
    var result = {
      job_id: this.id,
      perspectives: resultPerspectives,
    }
    return result
  }

  getBpmnOverlay() {
    var overlays = []
    this.perspectives.forEach(element => {
      element.analyze()
      overlays = overlays.concat(element.bpmn_model.getOverlay())
    });
    var result = {
      job_id: this.id,
      overlays: overlays
    }
    return result
  }

  getCompleteUpdate() {
    var overlays = []
    var resultPerspectives = []
    this.perspectives.forEach(element => {
      resultPerspectives.push({
        name: element.perspective_name,
        bpmn_xml: element.bpmn_model.getModelXml()
      })
    });
    this.perspectives.forEach(element => {
      element.analyze()
      overlays = overlays.concat(element.bpmn_model.getOverlay())
    });
    var result = {
      job_id: this.id,
      perspectives: resultPerspectives,
      overlays: overlays
    }
    return result
  }

  triggerCompleteUpdateEvent() {
    console.info('EMIT')

    this.eventEmitter.emit('job-update', this.getCompleteUpdate())
    //this.eventEmitter.emit('job-update', this.getBpmnOverlay())
    //var context = this
    //setTimeout(function(){context.eventEmitter.emit('job-update', context.getBpmnOverlay())},1000);
  }
}

module.exports = {
  BpmnJob
}