var EventEmitter = require('events')
var xml2js = require('xml2js');
const { BpmnTask, BpmnConnection, BpmnGateway, BpmnEvent } = require("./bpmn-constructs")

class BpmnModel {
    constructor(modelXml) {
        this.model_xml = modelXml
        this.stages = new Map() //id -> BpmnStage
        this.events = new Map() //id -> BpmnEvent
        this.connections = new Map() //id -> BpmnConnection
        this.gateways = new Map() // id-> BpmnGateway

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
            }

            var connections = result['bpmn2:definitions']['bpmn2:process'][0]['bpmn2:sequenceFlow']
            for (var key in connections) {
                var newConnection = new BpmnConnection(connections[key]['$'].id, connections[key]['$'].name, connections[key]['$'].sourceRef, connections[key]['$'].targetRef)
                context.connections.set(connections[key]['$'].id, newConnection)
            }

            var parallelGateways = result['bpmn2:definitions']['bpmn2:process'][0]['bpmn2:parallelGateway']
            for (var key in parallelGateways) {
                var newGateway = new BpmnGateway(parallelGateways[key]['$'].id, parallelGateways[key]['$'].name, 'PARALLEL',
                    parallelGateways[key]['$'].gatewayDirection, parallelGateways[key]['bpmn2:incoming'], parallelGateways[key]['bpmn2:outgoing'])
                context.gateways.set(parallelGateways[key]['$'].id, newGateway)
            }

            var exclusiveGateways = result['bpmn2:definitions']['bpmn2:process'][0]['bpmn2:exclusiveGateway']
            for (var key in exclusiveGateways) {
                var newGateway = new BpmnGateway(exclusiveGateways[key]['$'].id, exclusiveGateways[key]['$'].name, 'EXCLUSIVE',
                    exclusiveGateways[key]['$'].gatewayDirection, exclusiveGateways[key]['bpmn2:incoming'], exclusiveGateways[key]['bpmn2:outgoing'])
                context.gateways.set(exclusiveGateways[key]['$'].id, newGateway)
            }

            var inclusiveGateways = result['bpmn2:definitions']['bpmn2:process'][0]['bpmn2:inclusiveGateway']
            for (var key in inclusiveGateways) {
                var newGateway = new BpmnGateway(inclusiveGateways[key]['$'].id, inclusiveGateways[key]['$'].name, 'INCLUSIVE',
                    inclusiveGateways[key]['$'].gatewayDirection, inclusiveGateways[key]['bpmn2:incoming'], inclusiveGateways[key]['bpmn2:outgoing'])
                context.gateways.set(exclusiveGateways[key]['$'].id, newGateway)
            }

            var startEvents = result['bpmn2:definitions']['bpmn2:process'][0]['bpmn2:startEvent']
            for (var key in startEvents) {
                var newEvent = new BpmnEvent(startEvents[key]['$'].id, startEvents[key]['$'].name, 'START', [], startEvents[key]['bpmn2:outgoing'])
                context.events.set(startEvents[key]['$'].id, newEvent)
            }

            var endEvents = result['bpmn2:definitions']['bpmn2:process'][0]['bpmn2:endEvent']
            for (var key in endEvents) {
                var newEvent = new BpmnEvent(endEvents[key]['$'].id, endEvents[key]['$'].name, 'END', endEvents[key]['bpmn2:incoming'], [])
                context.events.set(endEvents[key]['$'].id, newEvent)
            }

            var boundaryEvents = result['bpmn2:definitions']['bpmn2:process'][0]['bpmn2:boundaryEvent']
            for (var key in boundaryEvents) {
                var newEvent = new BpmnEvent(boundaryEvents[key]['$'].id, boundaryEvents[key]['$'].name, 'BOUNDARY', [],
                    boundaryEvents[key]['bpmn2:outgoing'], boundaryEvents[key]['$'].attachedToRef)
                context.events.set(boundaryEvents[key]['$'].id, newEvent)
            }

            var intermediateThrowEvents = result['bpmn2:definitions']['bpmn2:process'][0]['bpmn2:intermediateThrowEvent']
            for (var key in intermediateThrowEvents) {
                var newEvent = new BpmnEvent(intermediateThrowEvents[key]['$'].id, intermediateThrowEvents[key]['$'].name, 'INTERMEDIATE_THROW', intermediateThrowEvents[key]['bpmn2:incoming'],
                    intermediateThrowEvents[key]['bpmn2:outgoing'])
                context.events.set(intermediateThrowEvents[key]['$'].id, newEvent)
            }

            var intermediateCatchEvents = result['bpmn2:definitions']['bpmn2:process'][0]['bpmn2:intermediateCatchEvent']
            for (var key in intermediateCatchEvents) {
                var newEvent = new BpmnEvent(intermediateCatchEvents[key]['$'].id, intermediateCatchEvents[key]['$'].name, 'INTERMEDIATE_CATCH', intermediateCatchEvents[key]['bpmn2:incoming'],
                    intermediateCatchEvents[key]['bpmn2:outgoing'])
                context.events.set(intermediateCatchEvents[key]['$'].id, newEvent)
            }
        });
    }
}

module.exports = {
    BpmnModel
}