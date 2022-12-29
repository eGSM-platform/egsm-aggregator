var EventEmitter = require('events')
var xml2js = require('xml2js');
const { BpmnTask, BpmnConnection, BpmnGateway, BpmnEvent, BpmnBlockOverlayReport } = require("./bpmn-constructs")

class BpmnModel {
    constructor(perspectiveName, modelXml) {
        this.model_xml = modelXml
        this.perspective_name = perspectiveName
        this.stages = new Map() //id -> BpmnStage
        this.events = new Map() //id -> BpmnEvent
        this.connections = new Map() //id -> BpmnConnection
        this.gateways = new Map() // id-> BpmnGateway
        this.lifecycle_stage = 'CREATED' //CREATED-RUNNING-ACTIVE-COMPLETED

        this.construcs = new Map()

        this._buildModel()
    }

    _buildModel() {
        var context = this
        xml2js.parseString(this.model_xml, function (err, result) {
            if (err) {
                throw new Error('Error while parsing XML: ' + err)
            }
            var tasks = result['bpmn2:definitions']['bpmn2:process'][0]['bpmn2:task']
            for (var key in tasks) {
                var newTask = new BpmnTask(tasks[key]['$'].id, tasks[key]['$'].name, tasks[key]['bpmn2:incoming'], tasks[key]['bpmn2:outgoing'])
                context.stages.set(tasks[key]['$'].id, newTask)
                context.construcs.set(tasks[key]['$'].id, newTask)
            }

            var connections = result['bpmn2:definitions']['bpmn2:process'][0]['bpmn2:sequenceFlow']
            for (var key in connections) {
                var newConnection = new BpmnConnection(connections[key]['$'].id, connections[key]['$'].name, connections[key]['$'].sourceRef, connections[key]['$'].targetRef)
                context.connections.set(connections[key]['$'].id, newConnection)
                context.construcs.set(connections[key]['$'].id, newConnection)
            }

            var parallelGateways = result['bpmn2:definitions']['bpmn2:process'][0]['bpmn2:parallelGateway']
            for (var key in parallelGateways) {
                var newGateway = new BpmnGateway(parallelGateways[key]['$'].id, parallelGateways[key]['$'].name, 'PARALLEL',
                    parallelGateways[key]['$'].gatewayDirection, parallelGateways[key]['bpmn2:incoming'], parallelGateways[key]['bpmn2:outgoing'])
                context.gateways.set(parallelGateways[key]['$'].id, newGateway)
                context.construcs.set(parallelGateways[key]['$'].id, newGateway)
            }

            var exclusiveGateways = result['bpmn2:definitions']['bpmn2:process'][0]['bpmn2:exclusiveGateway']
            for (var key in exclusiveGateways) {
                var newGateway = new BpmnGateway(exclusiveGateways[key]['$'].id, exclusiveGateways[key]['$'].name, 'EXCLUSIVE',
                    exclusiveGateways[key]['$'].gatewayDirection, exclusiveGateways[key]['bpmn2:incoming'], exclusiveGateways[key]['bpmn2:outgoing'])
                context.gateways.set(exclusiveGateways[key]['$'].id, newGateway)
                context.construcs.set(exclusiveGateways[key]['$'].id, newGateway)
            }

            var inclusiveGateways = result['bpmn2:definitions']['bpmn2:process'][0]['bpmn2:inclusiveGateway']
            for (var key in inclusiveGateways) {
                var newGateway = new BpmnGateway(inclusiveGateways[key]['$'].id, inclusiveGateways[key]['$'].name, 'INCLUSIVE',
                    inclusiveGateways[key]['$'].gatewayDirection, inclusiveGateways[key]['bpmn2:incoming'], inclusiveGateways[key]['bpmn2:outgoing'])
                context.gateways.set(inclusiveGateways[key]['$'].id, newGateway)
                context.construcs.set(inclusiveGateways[key]['$'].id, newGateway)
            }

            var startEvents = result['bpmn2:definitions']['bpmn2:process'][0]['bpmn2:startEvent']
            for (var key in startEvents) {
                var newEvent = new BpmnEvent(startEvents[key]['$'].id, startEvents[key]['$'].name, 'START', [], startEvents[key]['bpmn2:outgoing'])
                context.events.set(startEvents[key]['$'].id, newEvent)
                context.construcs.set(startEvents[key]['$'].id, newEvent)
            }

            var endEvents = result['bpmn2:definitions']['bpmn2:process'][0]['bpmn2:endEvent']
            for (var key in endEvents) {
                var newEvent = new BpmnEvent(endEvents[key]['$'].id, endEvents[key]['$'].name, 'END', endEvents[key]['bpmn2:incoming'], [])
                context.events.set(endEvents[key]['$'].id, newEvent)
                context.construcs.set(endEvents[key]['$'].id, newEvent)
            }

            var boundaryEvents = result['bpmn2:definitions']['bpmn2:process'][0]['bpmn2:boundaryEvent']
            for (var key in boundaryEvents) {
                var newEvent = new BpmnEvent(boundaryEvents[key]['$'].id, boundaryEvents[key]['$'].name, 'BOUNDARY', [],
                    boundaryEvents[key]['bpmn2:outgoing'], boundaryEvents[key]['$'].attachedToRef)
                context.events.set(boundaryEvents[key]['$'].id, newEvent)
                context.construcs.set(boundaryEvents[key]['$'].id, newEvent)
            }

            var intermediateThrowEvents = result['bpmn2:definitions']['bpmn2:process'][0]['bpmn2:intermediateThrowEvent']
            for (var key in intermediateThrowEvents) {
                var newEvent = new BpmnEvent(intermediateThrowEvents[key]['$'].id, intermediateThrowEvents[key]['$'].name, 'INTERMEDIATE_THROW', intermediateThrowEvents[key]['bpmn2:incoming'],
                    intermediateThrowEvents[key]['bpmn2:outgoing'])
                context.events.set(intermediateThrowEvents[key]['$'].id, newEvent)
                context.construcs.set(intermediateThrowEvents[key]['$'].id, newEvent)
            }

            var intermediateCatchEvents = result['bpmn2:definitions']['bpmn2:process'][0]['bpmn2:intermediateCatchEvent']
            for (var key in intermediateCatchEvents) {
                var newEvent = new BpmnEvent(intermediateCatchEvents[key]['$'].id, intermediateCatchEvents[key]['$'].name, 'INTERMEDIATE_CATCH', intermediateCatchEvents[key]['bpmn2:incoming'],
                    intermediateCatchEvents[key]['bpmn2:outgoing'])
                context.events.set(intermediateCatchEvents[key]['$'].id, newEvent)
                context.construcs.set(intermediateCatchEvents[key]['$'].id, newEvent)
            }
        });
    }

    setLifecycle(newStage) {
        this.lifecycle_stage = newStage
    }

    setTaskState(taskId, newState) {
        if (this.stages.has(taskId)) {
            this.stages.get(taskId).update(newState)
        }
    }

    //Array of {name; status; state}
    applyEgsmStageArray(stageInfo) {
        stageInfo.forEach(element => {
            if (this.stages.has(element.name)) {
                this.stages.get(element.name).update(element.status, element.state)
            }
        });
    }

    applyDeviation(deviation) {
        switch (deviation.type) {
            //SkipDeviation consists of an OutOfOrder activityand a Skipped Sequence
            //It is represented as an arrow from the last correctly executed activity to the
            //OutOfOrder one
            case 'SKIPPED':

                break;
            //IncompleteDeviation regards always one eGSM stage only. If we are able to find the
            //matching BPMN task or block then we can add a Flag, otherwise neglect it
            case 'INCOMPLETE':

                break;

            case 'MULTI_EXECUTION':

                break;
            case 'INCORRECT_EXECUTION':

                break;
            case 'INCORRECT_BRANCH':

                break;
        }
    }

    clearDeviations() {

    }

    getOverlay() {
        var result = []
        this.construcs.forEach(element => {
            if (element.constructor.name == 'BpmnTask' || element.constructor.name == 'BpmnEvent') {
                var color = element.getBlockColor()
                var flags = []
                result.push(new BpmnBlockOverlayReport(this.perspective_name, element.id, color, flags))
            }
        });
        return result
    }
}

module.exports = {
    BpmnModel
}