var UUID = require("uuid");
var EventEmitter = require('events')
var xml2js = require('xml2js');
const { BpmnTask, BpmnConnection, BpmnGateway, BpmnEvent, BpmnBlockOverlayReport, Point } = require("./bpmn-constructs");

class BpmnModel {
    constructor(perspectiveName, modelXml) {
        this.model_xml = modelXml
        this.parsed_model_xml = undefined
        this.perspective_name = perspectiveName
        this.stages = new Map() //id -> BpmnStage
        this.events = new Map() //id -> BpmnEvent
        this.connections = new Map() //id -> BpmnConnection
        this.gateways = new Map() // id-> BpmnGateway
        this.lifecycle_stage = 'CREATED' //CREATED-RUNNING-ACTIVE-COMPLETED

        this.construcs = new Map()
        this.overlay_constructs = new Map() //Contains Bpmn Blocks which are created to represent eviation, but not part of the original model

        this.parseModelXml()
        this._buildModel()

        //Visual elements
        this.planes = []
    }

    parseModelXml() {
        var context = this
        xml2js.parseString(this.model_xml, function (err, result) {
            if (err) {
                throw new Error('Error while parsing XML: ' + err)
            }
            context.parsed_model_xml = result
        })
    }

    _buildModel() {
        //Creating a temporary map containing all blocks and their position information, to make data retieval efficient
        //The information from this map will be used during block instantiations
        var diagram_elements = new Map()
        var shapes = this.parsed_model_xml['bpmn2:definitions']['bpmndi:BPMNDiagram'][0]['bpmndi:BPMNPlane'][0]['bpmndi:BPMNShape']
        var edges = this.parsed_model_xml['bpmn2:definitions']['bpmndi:BPMNDiagram'][0]['bpmndi:BPMNPlane'][0]['bpmndi:BPMNEdge']
        //Reset model data structures
        this.construcs.clear()
        this.overlay_constructs.clear()
        shapes.forEach(element => {
            var shape = {
                x: element['dc:Bounds'][0]['$'].x,
                y: element['dc:Bounds'][0]['$'].y,
                width: element['dc:Bounds'][0]['$'].width,
                height: element['dc:Bounds'][0]['$'].height
            }
            diagram_elements.set(element['$'].bpmnElement, shape)
        });
        edges.forEach(element => {
            var waypoints = []
            element['di:waypoint'].forEach(point => {
                waypoints.push({ x: point['$'].x, y: point['$'].y })
            });
            diagram_elements.set(element['$'].bpmnElement, waypoints)
        });

        //Creating BPMN construct instances
        var tasks = this.parsed_model_xml['bpmn2:definitions']['bpmn2:process'][0]['bpmn2:task']
        for (var key in tasks) {
            var newTask = new BpmnTask(tasks[key]['$'].id, tasks[key]['$'].name, tasks[key]['bpmn2:incoming'], tasks[key]['bpmn2:outgoing'],
                diagram_elements.get(tasks[key]['$'].id))
            this.stages.set(tasks[key]['$'].id, newTask)
            this.construcs.set(tasks[key]['$'].id, newTask)
        }

        var connections = this.parsed_model_xml['bpmn2:definitions']['bpmn2:process'][0]['bpmn2:sequenceFlow']
        for (var key in connections) {
            var newConnection = new BpmnConnection(connections[key]['$'].id, connections[key]['$'].name, connections[key]['$'].sourceRef,
                connections[key]['$'].targetRef, diagram_elements.get(connections[key]['$'].id))
            this.connections.set(connections[key]['$'].id, newConnection)
            this.construcs.set(connections[key]['$'].id, newConnection)
        }

        var parallelGateways = this.parsed_model_xml['bpmn2:definitions']['bpmn2:process'][0]['bpmn2:parallelGateway']
        for (var key in parallelGateways) {
            var newGateway = new BpmnGateway(parallelGateways[key]['$'].id, parallelGateways[key]['$'].name, 'PARALLEL',
                parallelGateways[key]['$'].gatewayDirection, parallelGateways[key]['bpmn2:incoming'], parallelGateways[key]['bpmn2:outgoing'],
                diagram_elements.get(parallelGateways[key]['$'].id))
            this.gateways.set(parallelGateways[key]['$'].id, newGateway)
            this.construcs.set(parallelGateways[key]['$'].id, newGateway)
        }

        var exclusiveGateways = this.parsed_model_xml['bpmn2:definitions']['bpmn2:process'][0]['bpmn2:exclusiveGateway']
        for (var key in exclusiveGateways) {
            var newGateway = new BpmnGateway(exclusiveGateways[key]['$'].id, exclusiveGateways[key]['$'].name, 'EXCLUSIVE',
                exclusiveGateways[key]['$'].gatewayDirection, exclusiveGateways[key]['bpmn2:incoming'], exclusiveGateways[key]['bpmn2:outgoing'],
                diagram_elements.get(exclusiveGateways[key]['$'].id))
            this.gateways.set(exclusiveGateways[key]['$'].id, newGateway)
            this.construcs.set(exclusiveGateways[key]['$'].id, newGateway)
        }

        var inclusiveGateways = this.parsed_model_xml['bpmn2:definitions']['bpmn2:process'][0]['bpmn2:inclusiveGateway']
        for (var key in inclusiveGateways) {
            var newGateway = new BpmnGateway(inclusiveGateways[key]['$'].id, inclusiveGateways[key]['$'].name, 'INCLUSIVE',
                inclusiveGateways[key]['$'].gatewayDirection, inclusiveGateways[key]['bpmn2:incoming'], inclusiveGateways[key]['bpmn2:outgoing'],
                diagram_elements.get(inclusiveGateways[key]['$'].id))
            this.gateways.set(inclusiveGateways[key]['$'].id, newGateway)
            this.construcs.set(inclusiveGateways[key]['$'].id, newGateway)
        }

        var startEvents = this.parsed_model_xml['bpmn2:definitions']['bpmn2:process'][0]['bpmn2:startEvent']
        for (var key in startEvents) {
            var newEvent = new BpmnEvent(startEvents[key]['$'].id, startEvents[key]['$'].name, 'START', [], startEvents[key]['bpmn2:outgoing'], undefined,
                diagram_elements.get(startEvents[key]['$'].id))
            this.events.set(startEvents[key]['$'].id, newEvent)
            this.construcs.set(startEvents[key]['$'].id, newEvent)
        }

        var endEvents = this.parsed_model_xml['bpmn2:definitions']['bpmn2:process'][0]['bpmn2:endEvent']
        for (var key in endEvents) {
            var newEvent = new BpmnEvent(endEvents[key]['$'].id, endEvents[key]['$'].name, 'END', endEvents[key]['bpmn2:incoming'], [], undefined,
                diagram_elements.get(endEvents[key]['$'].id))
            this.events.set(endEvents[key]['$'].id, newEvent)
            this.construcs.set(endEvents[key]['$'].id, newEvent)
        }

        var boundaryEvents = this.parsed_model_xml['bpmn2:definitions']['bpmn2:process'][0]['bpmn2:boundaryEvent']
        for (var key in boundaryEvents) {
            var newEvent = new BpmnEvent(boundaryEvents[key]['$'].id, boundaryEvents[key]['$'].name, 'BOUNDARY', [],
                boundaryEvents[key]['bpmn2:outgoing'], boundaryEvents[key]['$'].attachedToRef, diagram_elements.get(boundaryEvents[key]['$'].id))
            this.events.set(boundaryEvents[key]['$'].id, newEvent)
            this.construcs.set(boundaryEvents[key]['$'].id, newEvent)
        }

        var intermediateThrowEvents = this.parsed_model_xml['bpmn2:definitions']['bpmn2:process'][0]['bpmn2:intermediateThrowEvent']
        for (var key in intermediateThrowEvents) {
            var newEvent = new BpmnEvent(intermediateThrowEvents[key]['$'].id, intermediateThrowEvents[key]['$'].name, 'INTERMEDIATE_THROW', intermediateThrowEvents[key]['bpmn2:incoming'],
                intermediateThrowEvents[key]['bpmn2:outgoing'], undefined, diagram_elements.get(intermediateThrowEvents[key]['$'].id))
            this.events.set(intermediateThrowEvents[key]['$'].id, newEvent)
            this.construcs.set(intermediateThrowEvents[key]['$'].id, newEvent)
        }

        var intermediateCatchEvents = this.parsed_model_xml['bpmn2:definitions']['bpmn2:process'][0]['bpmn2:intermediateCatchEvent']
        for (var key in intermediateCatchEvents) {
            var newEvent = new BpmnEvent(intermediateCatchEvents[key]['$'].id, intermediateCatchEvents[key]['$'].name, 'INTERMEDIATE_CATCH', intermediateCatchEvents[key]['bpmn2:incoming'],
                intermediateCatchEvents[key]['bpmn2:outgoing'], undefined, diagram_elements.get(intermediateCatchEvents[key]['$'].id))
            this.events.set(intermediateCatchEvents[key]['$'].id, newEvent)
            this.construcs.set(intermediateCatchEvents[key]['$'].id, newEvent)
        }

        //When the model is complete, iterating through the blocks and for each diverging BpmnGateway one find the converging
        this.construcs.forEach(element => {
            if (element.constructor.name == 'BpmnGateway' && element.subtype == 'Diverging') {
                var convergingGateway = this.findConvergingGateway(element)
                if (convergingGateway != element) {
                    element.pair_gateway = convergingGateway.id
                    convergingGateway.pair_gateway = element.id
                }
                else {
                    console.warn('ERROR while trying to find Converging gateway for: ' + element.id)
                }
            }
        });
        console.log('Model Build finished')
    }

    setLifecycle(newStage) {
        this.lifecycle_stage = newStage
    }

    findConvergingGateway(divergingGateway) {
        var counter = 1
        var currentNode = divergingGateway
        while (counter != 0) {
            var outputs = currentNode.outputs
            if (outputs.length == 0) {
                currentNode = divergingGateway.id
                break
            }
            var currentNode = this.construcs.get(this.construcs.get(outputs[0]).target)
            if (currentNode.constructor.name == 'BpmnGateway' && currentNode.subtype == 'Diverging') {
                counter++
            }
            else if (currentNode.constructor.name == 'BpmnGateway' && currentNode.subtype == 'Converging') {
                counter--
            }
        }
        return currentNode
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
                var firstSkippedBlock = deviation.block_a[0]
                var lastSkippedBlock = deviation.block_a.at(-1)

                //It means that the first and last blocks which has been skipped exist in the BPMN diagram as well
                if (this.construcs.has(firstSkippedBlock) && this.construcs.has(lastSkippedBlock)) {
                    var inputEdge = this.construcs.get(firstSkippedBlock).inputs?.[0] || 'NONE'
                    var outputEdge = this.construcs.get(lastSkippedBlock).outputs?.[0] || 'NONE'
                    //If a whole block has been skipped we need to use the pair_gateway
                    if (this.construcs.get(lastSkippedBlock).constructor.name == 'BpmnGateway') {
                        if (this.construcs.get(lastSkippedBlock).pair_gateway != 'NA') {
                            outputEdge = this.construcs.get(this.construcs.get(lastSkippedBlock).pair_gateway)?.outputs[0] || 'NONE'
                        }
                    }
                    var source = 'NONE'
                    var destination = 'NONE'
                    if (inputEdge != 'NONE') {
                        source = this.construcs.get(inputEdge).source || 'NONE'
                    }
                    if (outputEdge != 'NONE') {
                        destination = this.construcs.get(outputEdge).target || 'NONE'
                    }
                    //IF any of source of destination is 'NONE', then it requires further consideration, since BPMN specification
                    //requires to provide the source and destination of the edge
                    if (source != 'NONE' && destination != 'NONE') {
                        var waypoints = [this.construcs.get(inputEdge).waypoints[0], new Point(this.construcs.get(inputEdge).waypoints[0].x, 450),
                        new Point(this.construcs.get(outputEdge).waypoints.at(-1).x, 450),
                        this.construcs.get(outputEdge).waypoints.at(-1)]
                        this._addSkippingEdgeToModel(UUID.v4(), waypoints, source, destination)
                    }
                    //StartEvent has been skipped, we need to add a virtual start event to draw the skipping edge
                    if (source == 'NONE' && destination != 'NONE') {
                        var idShape = UUID.v4()
                        var idEdge = UUID.v4()
                        var eventPosition = new Point(80, 450)
                        var eventWidth = 36
                        var eventHeight = 36
                        var waypoints = [new Point(eventPosition.x + eventWidth / 2, eventPosition.y + eventHeight / 2), new Point(eventPosition.x + eventWidth / 2, 450 + eventHeight / 2),
                        new Point(this.construcs.get(outputEdge).waypoints.at(-1).x, 450 + eventHeight / 2),
                        this.construcs.get(outputEdge).waypoints.at(-1)]
                        var edgeId = this._addSkippingEdgeToModel(idEdge, waypoints, idShape, destination)
                        this._addIllegalEntryToModel(idShape, eventPosition, eventWidth, eventHeight, edgeId)
                    }
                }

                break;
            //IncompleteDeviation regards always one eGSM stage only. If we are able to find the
            //matching BPMN task or block then we can add a Flag, otherwise neglect it
            case 'INCOMPLETE':
                if (this.construcs.has(deviation.block_a)) {
                    this.construcs.get(deviation.block_a).addDeviation('INCOMPLETE')
                }
                break;

            case 'MULTI_EXECUTION':
                if (this.construcs.has(deviation.block_a)) {
                    this.construcs.get(deviation.block_a).addDeviation('MULTI_EXECUTION')
                }
                break;
            case 'INCORRECT_EXECUTION':
                deviation.block_a.forEach(element => {
                    if (this.construcs.has(element)) {
                        this.construcs.get(element).addDeviation('MULTI_EXECUTION')
                    }
                });
                break;
            case 'INCORRECT_BRANCH':

                break;
        }
    }

    clearDeviations() {

    }

    getModelXml(deviation, deviation2) {
        //TMP
        this.applyDeviation(deviation)
        this.applyDeviation(deviation2)
        //TMP
        var builder = new xml2js.Builder();
        return builder.buildObject(this.parsed_model_xml);
    }

    _addSkippingEdgeToModel(id, waypoints, sourceNode, targetNode) {
        var newBpmnSequence = {
            $: {
                id: id,
                sourceRef: sourceNode,
                targetRef: targetNode
            }
        }
        var newBpmnEdge = {
            $: {
                id: 'BPMNEdge_' + id,
                bpmnElement: id,
                sourceElement: 'BPMNShape_' + sourceNode,
                targetElement: 'BPMNShape_' + targetNode
            },
            'di:waypoint': []
        }
        waypoints.forEach(point => {
            newBpmnEdge['di:waypoint'].push({
                $: {
                    'xsi:type': 'dc:Point',
                    x: point.x,
                    y: point.y
                }
            })
        });
        this.parsed_model_xml['bpmn2:definitions']['bpmn2:process'][0]['bpmn2:sequenceFlow'].push(newBpmnSequence)
        this.parsed_model_xml['bpmn2:definitions']['bpmndi:BPMNDiagram'][0]['bpmndi:BPMNPlane'][0]['bpmndi:BPMNEdge'].push(newBpmnEdge)
        this.overlay_constructs.set(id, new BpmnConnection(id, '', sourceNode, targetNode, waypoints))
        this.overlay_constructs.get(id).status = 'FAULTY'
        return id
    }

    _addIllegalEntryToModel(id, position, width, height, outgoingEdge) {
        var newBpmnStartEvent = {
            $: {
                id: id,
                name: ''
            },
            'bpmn2:outgoing': outgoingEdge
        }
        var newBpmnShape = {
            $: {
                id: 'BPMNEdge_' + id,
                bpmnElement: id
            },
            'dc:Bounds': {
                $: {
                    height: height,
                    width: width,
                    x: position.x,
                    y: position.y
                }
            }
        }
        this.parsed_model_xml['bpmn2:definitions']['bpmn2:process'][0]['bpmn2:startEvent'].push(newBpmnStartEvent)
        this.parsed_model_xml['bpmn2:definitions']['bpmndi:BPMNDiagram'][0]['bpmndi:BPMNPlane'][0]['bpmndi:BPMNShape'].push(newBpmnShape)
        this.overlay_constructs.set(id, new BpmnEvent(id, '', 'START', [], [outgoingEdge], undefined, position))
        this.overlay_constructs.get(id).illegal = true
        return id
    }

    getOverlay() {
        var result = []
        this.construcs.forEach(element => {
            if (element.constructor.name == 'BpmnTask' || element.constructor.name == 'BpmnEvent' || element.constructor.name == 'BpmnConnection') {
                var color = element.getBlockColor()
                var flags = element.deviations || []
                result.push(new BpmnBlockOverlayReport(this.perspective_name, element.id, color, flags))
            }
        });

        this.overlay_constructs.forEach(element => {
            if (element.constructor.name == 'BpmnTask' || element.constructor.name == 'BpmnEvent' || element.constructor.name == 'BpmnConnection') {
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