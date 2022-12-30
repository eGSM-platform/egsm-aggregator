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
      element.analyse()
      overlays = overlays.concat(element.bpmn_model.getOverlay())
    });
    var result = {
      job_id: this.id,
      overlays: overlays
    }
    return result
  }

  getCompleteUpdate(){
    //TMP
    //var deviation = new SkipDeviation(['s_processstarted'], 'ParallelGateway_1')
    
    var deviation = new SkipDeviation(['ParallelGateway_1','attach_container'], 'drive_to_terminal')
    var deviation2 = new SkipDeviation(['detach_container'], 'c_portion_ended')
    var deviation3 =  new IncompleteDeviation('drive_to_terminal')
    //TMP
    var overlays = []
    var resultPerspectives = []
    this.perspectives.forEach(element => {
      //TMP
      element.bpmn_model._buildModel()
      //TMP
      resultPerspectives.push({
        name: element.perspective_name,
        bpmn_xml: element.bpmn_model.getModelXml(deviation, deviation3)
      })
    });
    this.perspectives.forEach(element => {
      element.analyse()
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


const DIAGRAM = `<?xml version="1.0" encoding="UTF-8"?>
<!-- origin at X=0.0 Y=0.0 -->
<bpmn2:definitions xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:bpmn2="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" xmlns:ext="http://org.eclipse.bpmn2/ext" xmlns:xs="http://www.w3.org/2001/XMLSchema" id="Definitions_1" exporter="org.eclipse.bpmn2.modeler.core" exporterVersion="1.5.4.RC1-v20220528-0836-B1" targetNamespace="http://org.eclipse.bpmn2/default/collaboration">
  <bpmn2:message id="m_portion_started" name="Manufacturer portion started">
    <bpmn2:extensionElements>
      <ext:style/>
    </bpmn2:extensionElements>
  </bpmn2:message>
  <bpmn2:message id="c_portion_started" name="Carrier portion started">
    <bpmn2:extensionElements>
      <ext:style/>
    </bpmn2:extensionElements>
  </bpmn2:message>
  <bpmn2:message id="t_portion_started" name="Terminal portion started">
    <bpmn2:extensionElements>
      <ext:style/>
    </bpmn2:extensionElements>
  </bpmn2:message>
  <bpmn2:message id="truck_reached_m" name="Truck reached manufacturer">
    <bpmn2:extensionElements>
      <ext:style/>
    </bpmn2:extensionElements>
  </bpmn2:message>
  <bpmn2:message id="container_attached" name="Container attached">
    <bpmn2:extensionElements>
      <ext:style/>
    </bpmn2:extensionElements>
  </bpmn2:message>
  <bpmn2:message id="m_portion_ended" name="Manufacturer portion ended">
    <bpmn2:extensionElements>
      <ext:style/>
    </bpmn2:extensionElements>
  </bpmn2:message>
  <bpmn2:message id="truck_reached_t" name="Truck reached inland terminal">
    <bpmn2:extensionElements>
      <ext:style/>
    </bpmn2:extensionElements>
  </bpmn2:message>
  <bpmn2:message id="container_detached" name="Container detached">
    <bpmn2:extensionElements>
      <ext:style/>
    </bpmn2:extensionElements>
  </bpmn2:message>
  <bpmn2:message id="c_portion_ended" name="Carrier portion ended">
    <bpmn2:extensionElements>
      <ext:style/>
    </bpmn2:extensionElements>
  </bpmn2:message>
  <bpmn2:message id="process_failed" name="Process failed">
    <bpmn2:extensionElements>
      <ext:style/>
    </bpmn2:extensionElements>
  </bpmn2:message>
  <bpmn2:message id="t_portion_ended" name="Terminal portion ended">
    <bpmn2:extensionElements>
      <ext:style/>
    </bpmn2:extensionElements>
  </bpmn2:message>
  <bpmn2:collaboration id="Collaboration_1" name="Default Collaboration">
    <bpmn2:participant id="p_container" name="Container" processRef="containerprocess"/>
  </bpmn2:collaboration>
  <bpmn2:process id="containerprocess" name="Container Process" definitionalCollaborationRef="Collaboration_1" isExecutable="false">
    <bpmn2:task id="attach_container" name="Attach container">
      <bpmn2:incoming>SequenceFlow_6</bpmn2:incoming>
      <bpmn2:outgoing>SequenceFlow_7</bpmn2:outgoing>
      <bpmn2:ioSpecification id="InputOutputSpecification_2">
        <bpmn2:dataInput id="DataInput_3" name="input1"/>
        <bpmn2:dataInput id="DataInput_7" name="input2"/>
        <bpmn2:dataOutput id="DataOutput_3" name="output1"/>
        <bpmn2:inputSet id="InputSet_10">
          <bpmn2:dataInputRefs>DataInput_3</bpmn2:dataInputRefs>
          <bpmn2:dataInputRefs>DataInput_7</bpmn2:dataInputRefs>
        </bpmn2:inputSet>
        <bpmn2:outputSet id="OutputSet_9">
          <bpmn2:dataOutputRefs>DataOutput_3</bpmn2:dataOutputRefs>
        </bpmn2:outputSet>
      </bpmn2:ioSpecification>
    </bpmn2:task>
    <bpmn2:task id="fill_in_container" name="Fill in container">
      <bpmn2:incoming>SequenceFlow_2</bpmn2:incoming>
      <bpmn2:outgoing>SequenceFlow_3</bpmn2:outgoing>
      <bpmn2:ioSpecification id="InputOutputSpecification_1">
        <bpmn2:dataInput id="DataInput_1" name="input1"/>
        <bpmn2:dataOutput id="DataOutput_1" name="output1"/>
        <bpmn2:inputSet id="InputSet_9">
          <bpmn2:dataInputRefs>DataInput_1</bpmn2:dataInputRefs>
        </bpmn2:inputSet>
        <bpmn2:outputSet id="OutputSet_8">
          <bpmn2:dataOutputRefs>DataOutput_1</bpmn2:dataOutputRefs>
        </bpmn2:outputSet>
      </bpmn2:ioSpecification>
    </bpmn2:task>
    <bpmn2:task id="drive_to_terminal" name="Drive to Inland Terminal">
      <bpmn2:incoming>SequenceFlow_7</bpmn2:incoming>
      <bpmn2:outgoing>SequenceFlow_8</bpmn2:outgoing>
      <bpmn2:ioSpecification id="InputOutputSpecification_4">
        <bpmn2:dataInput id="DataInput_9" name="input1"/>
        <bpmn2:dataInput id="DataInput_11" name="input2"/>
        <bpmn2:dataOutput id="DataOutput_7" name="output1"/>
        <bpmn2:inputSet id="InputSet_12">
          <bpmn2:dataInputRefs>DataInput_9</bpmn2:dataInputRefs>
          <bpmn2:dataInputRefs>DataInput_11</bpmn2:dataInputRefs>
        </bpmn2:inputSet>
        <bpmn2:outputSet id="OutputSet_11">
          <bpmn2:dataOutputRefs>DataOutput_7</bpmn2:dataOutputRefs>
        </bpmn2:outputSet>
      </bpmn2:ioSpecification>
    </bpmn2:task>
    <bpmn2:task id="inspect_goods" name="Inspect goods">
      <bpmn2:incoming>SequenceFlow_8</bpmn2:incoming>
      <bpmn2:outgoing>SequenceFlow_15</bpmn2:outgoing>
      <bpmn2:ioSpecification id="InputOutputSpecification_6">
        <bpmn2:dataInput id="DataInput_15" name="input1"/>
        <bpmn2:dataOutput id="DataOutput_11" name="output1"/>
        <bpmn2:inputSet id="InputSet_14">
          <bpmn2:dataInputRefs>DataInput_15</bpmn2:dataInputRefs>
        </bpmn2:inputSet>
        <bpmn2:outputSet id="OutputSet_13">
          <bpmn2:dataOutputRefs>DataOutput_11</bpmn2:dataOutputRefs>
        </bpmn2:outputSet>
      </bpmn2:ioSpecification>
    </bpmn2:task>
    <bpmn2:sequenceFlow id="SequenceFlow_15" sourceRef="inspect_goods" targetRef="detach_container"/>
    <bpmn2:task id="detach_container" name="Detach container">
      <bpmn2:incoming>SequenceFlow_15</bpmn2:incoming>
      <bpmn2:outgoing>SequenceFlow_17</bpmn2:outgoing>
      <bpmn2:ioSpecification id="InputOutputSpecification_5">
        <bpmn2:dataInput id="DataInput_13" name="input1"/>
        <bpmn2:dataInput id="DataInput_17" name="input2"/>
        <bpmn2:dataOutput id="DataOutput_9" name="output1"/>
        <bpmn2:inputSet id="InputSet_13">
          <bpmn2:dataInputRefs>DataInput_13</bpmn2:dataInputRefs>
          <bpmn2:dataInputRefs>DataInput_17</bpmn2:dataInputRefs>
        </bpmn2:inputSet>
        <bpmn2:outputSet id="OutputSet_12">
          <bpmn2:dataOutputRefs>DataOutput_9</bpmn2:dataOutputRefs>
        </bpmn2:outputSet>
      </bpmn2:ioSpecification>
    </bpmn2:task>
    <bpmn2:parallelGateway id="ParallelGateway_1" name="Parallel Gateway 1" gatewayDirection="Diverging">
      <bpmn2:incoming>SequenceFlow_1</bpmn2:incoming>
      <bpmn2:outgoing>SequenceFlow_2</bpmn2:outgoing>
      <bpmn2:outgoing>SequenceFlow_4</bpmn2:outgoing>
    </bpmn2:parallelGateway>
    <bpmn2:parallelGateway id="ParallelGateway_2" name="Parallel Gateway 2" gatewayDirection="Converging">
      <bpmn2:incoming>SequenceFlow_3</bpmn2:incoming>
      <bpmn2:incoming>SequenceFlow_5</bpmn2:incoming>
      <bpmn2:outgoing>SequenceFlow_6</bpmn2:outgoing>
    </bpmn2:parallelGateway>
    <bpmn2:startEvent id="s_processstarted" name="Process started">
      <bpmn2:outgoing>SequenceFlow_1</bpmn2:outgoing>
    </bpmn2:startEvent>
    <bpmn2:intermediateCatchEvent id="ce_c_portion_started" name="Carrier portion started">
      <bpmn2:incoming>SequenceFlow_4</bpmn2:incoming>
      <bpmn2:outgoing>SequenceFlow_5</bpmn2:outgoing>
      <bpmn2:dataOutput id="DataOutput_5" name="output1"/>
      <bpmn2:outputSet id="_OutputSet_2" name="Output Set 2">
        <bpmn2:dataOutputRefs>DataOutput_5</bpmn2:dataOutputRefs>
      </bpmn2:outputSet>
      <bpmn2:messageEventDefinition id="MessageEventDefinition_1" messageRef="c_portion_started"/>
    </bpmn2:intermediateCatchEvent>
    <bpmn2:sequenceFlow id="SequenceFlow_1" sourceRef="s_processstarted" targetRef="ParallelGateway_1"/>
    <bpmn2:sequenceFlow id="SequenceFlow_2" sourceRef="ParallelGateway_1" targetRef="fill_in_container"/>
    <bpmn2:sequenceFlow id="SequenceFlow_3" sourceRef="fill_in_container" targetRef="ParallelGateway_2"/>
    <bpmn2:sequenceFlow id="SequenceFlow_4" sourceRef="ParallelGateway_1" targetRef="ce_c_portion_started"/>
    <bpmn2:sequenceFlow id="SequenceFlow_5" sourceRef="ce_c_portion_started" targetRef="ParallelGateway_2"/>
    <bpmn2:sequenceFlow id="SequenceFlow_6" sourceRef="ParallelGateway_2" targetRef="attach_container"/>
    <bpmn2:sequenceFlow id="SequenceFlow_7" sourceRef="attach_container" targetRef="drive_to_terminal"/>
    <bpmn2:sequenceFlow id="SequenceFlow_8" sourceRef="drive_to_terminal" targetRef="inspect_goods"/>
    <bpmn2:intermediateThrowEvent id="te_c_portion_ended" name="Carrier portion ended">
      <bpmn2:incoming>SequenceFlow_17</bpmn2:incoming>
      <bpmn2:outgoing>SequenceFlow_18</bpmn2:outgoing>
      <bpmn2:dataInput id="DataInput_5" name="input1"/>
      <bpmn2:inputSet id="_InputSet_2" name="Input Set 2">
        <bpmn2:dataInputRefs>DataInput_5</bpmn2:dataInputRefs>
      </bpmn2:inputSet>
      <bpmn2:messageEventDefinition id="MessageEventDefinition_2" messageRef="c_portion_ended"/>
    </bpmn2:intermediateThrowEvent>
    <bpmn2:intermediateThrowEvent id="te_process_failed" name="Process failed">
      <bpmn2:incoming>SequenceFlow_13</bpmn2:incoming>
      <bpmn2:outgoing>SequenceFlow_14</bpmn2:outgoing>
      <bpmn2:dataInput id="DataInput_6" name="input1"/>
      <bpmn2:inputSet id="_InputSet_3" name="Input Set 3">
        <bpmn2:dataInputRefs>DataInput_6</bpmn2:dataInputRefs>
      </bpmn2:inputSet>
      <bpmn2:messageEventDefinition id="MessageEventDefinition_3" messageRef="process_failed"/>
    </bpmn2:intermediateThrowEvent>
    <bpmn2:boundaryEvent id="b_container_overheated" name="Container overheated" attachedToRef="drive_to_terminal">
      <bpmn2:outgoing>SequenceFlow_13</bpmn2:outgoing>
      <bpmn2:dataOutput id="DataOutput_4" name="output1"/>
      <bpmn2:outputSet id="_OutputSet_3" name="Output Set 3">
        <bpmn2:dataOutputRefs>DataOutput_4</bpmn2:dataOutputRefs>
      </bpmn2:outputSet>
    </bpmn2:boundaryEvent>
    <bpmn2:exclusiveGateway id="ExclusiveGateway_1" name="Exclusive Gateway 1" gatewayDirection="Converging">
      <bpmn2:incoming>SequenceFlow_14</bpmn2:incoming>
      <bpmn2:incoming>SequenceFlow_18</bpmn2:incoming>
      <bpmn2:outgoing>SequenceFlow_16</bpmn2:outgoing>
    </bpmn2:exclusiveGateway>
    <bpmn2:endEvent id="e_processended" name="Process ended">
      <bpmn2:incoming>SequenceFlow_16</bpmn2:incoming>
    </bpmn2:endEvent>
    <bpmn2:sequenceFlow id="SequenceFlow_13" sourceRef="b_container_overheated" targetRef="te_process_failed"/>
    <bpmn2:sequenceFlow id="SequenceFlow_14" sourceRef="te_process_failed" targetRef="ExclusiveGateway_1"/>
    <bpmn2:sequenceFlow id="SequenceFlow_16" sourceRef="ExclusiveGateway_1" targetRef="e_processended"/>
    <bpmn2:sequenceFlow id="SequenceFlow_17" sourceRef="detach_container" targetRef="te_c_portion_ended"/>
    <bpmn2:sequenceFlow id="SequenceFlow_18" sourceRef="te_c_portion_ended" targetRef="ExclusiveGateway_1"/>
  </bpmn2:process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_1" name="Default Collaboration Diagram">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Collaboration_1">
      <bpmndi:BPMNShape id="BPMNShape_Participant_2" bpmnElement="p_container" isHorizontal="true">
        <dc:Bounds height="371.0" width="1371.0" x="20.0" y="110.0"/>
        <bpmndi:BPMNLabel id="BPMNLabel_58" labelStyle="BPMNLabelStyle_1">
          <dc:Bounds height="63.0" width="17.0" x="26.0" y="264.0"/>
        </bpmndi:BPMNLabel>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="BPMNShape_Task_1" bpmnElement="fill_in_container">
        <dc:Bounds height="50.0" width="110.0" x="270.0" y="171.0"/>
        <bpmndi:BPMNLabel id="BPMNLabel_7" labelStyle="BPMNLabelStyle_1">
          <dc:Bounds height="17.0" width="97.0" x="276.0" y="187.0"/>
        </bpmndi:BPMNLabel>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="BPMNShape_attach_container" bpmnElement="attach_container">
        <dc:Bounds height="50.0" width="110.0" x="481.0" y="240.0"/>
        <bpmndi:BPMNLabel id="BPMNLabel_11" labelStyle="BPMNLabelStyle_1">
          <dc:Bounds height="17.0" width="105.0" x="483.0" y="256.0"/>
        </bpmndi:BPMNLabel>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="BPMNShape_Task_4" bpmnElement="drive_to_terminal">
        <dc:Bounds height="50.0" width="110.0" x="634.0" y="239.0"/>
        <bpmndi:BPMNLabel id="BPMNLabel_21" labelStyle="BPMNLabelStyle_1">
          <dc:Bounds height="34.0" width="109.0" x="634.0" y="247.0"/>
        </bpmndi:BPMNLabel>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="BPMNShape_Task_5" bpmnElement="inspect_goods">
        <dc:Bounds height="50.0" width="110.0" x="810.0" y="158.0"/>
        <bpmndi:BPMNLabel id="BPMNLabel_34" labelStyle="BPMNLabelStyle_1">
          <dc:Bounds height="17.0" width="91.0" x="819.0" y="174.0"/>
        </bpmndi:BPMNLabel>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="BPMNShape_Task_6" bpmnElement="detach_container">
        <dc:Bounds height="50.0" width="110.0" x="1000.0" y="158.0"/>
        <bpmndi:BPMNLabel id="BPMNLabel_36" labelStyle="BPMNLabelStyle_1">
          <dc:Bounds height="34.0" width="63.0" x="1023.0" y="166.0"/>
        </bpmndi:BPMNLabel>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="BPMNShape_ParallelGateway_1" bpmnElement="ParallelGateway_1" isMarkerVisible="true">
        <dc:Bounds height="50.0" width="50.0" x="180.0" y="234.0"/>
        <bpmndi:BPMNLabel id="BPMNLabel_1" labelStyle="BPMNLabelStyle_1">
          <dc:Bounds height="34.0" width="69.0" x="171.0" y="284.0"/>
        </bpmndi:BPMNLabel>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="BPMNShape_ParallelGateway_2" bpmnElement="ParallelGateway_2" isMarkerVisible="true">
        <dc:Bounds height="50.0" width="50.0" x="379.0" y="239.0"/>
        <bpmndi:BPMNLabel id="BPMNLabel_2" labelStyle="BPMNLabelStyle_1">
          <dc:Bounds height="34.0" width="69.0" x="370.0" y="289.0"/>
        </bpmndi:BPMNLabel>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="BPMNShape_s_processstarted" bpmnElement="s_processstarted">
        <dc:Bounds height="36.0" width="36.0" x="80.0" y="221.0"/>
        <bpmndi:BPMNLabel id="BPMNLabel_4" labelStyle="BPMNLabelStyle_1">
          <dc:Bounds height="34.0" width="59.0" x="69.0" y="257.0"/>
        </bpmndi:BPMNLabel>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="BPMNShape_IntermediateCatchEvent_2" bpmnElement="ce_c_portion_started">
        <dc:Bounds height="36.0" width="36.0" x="301.0" y="316.0"/>
        <bpmndi:BPMNLabel id="BPMNLabel_8" labelStyle="BPMNLabelStyle_1">
          <dc:Bounds height="51.0" width="50.0" x="294.0" y="352.0"/>
        </bpmndi:BPMNLabel>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="BPMNShape_te_c_portion_ended" bpmnElement="te_c_portion_ended">
        <dc:Bounds height="36.0" width="36.0" x="1160.0" y="171.0"/>
        <bpmndi:BPMNLabel id="BPMNLabel_31" labelStyle="BPMNLabelStyle_1">
          <dc:Bounds height="51.0" width="50.0" x="1153.0" y="207.0"/>
        </bpmndi:BPMNLabel>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="BPMNShape_te_process_failed" bpmnElement="te_process_failed">
        <dc:Bounds height="36.0" width="36.0" x="724.0" y="392.0"/>
        <bpmndi:BPMNLabel id="BPMNLabel_32" labelStyle="BPMNLabelStyle_1">
          <dc:Bounds height="34.0" width="59.0" x="713.0" y="428.0"/>
        </bpmndi:BPMNLabel>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="BPMNShape_ExclusiveGateway_1" bpmnElement="ExclusiveGateway_1" isMarkerVisible="true">
        <dc:Bounds height="50.0" width="50.0" x="1230.0" y="214.0"/>
        <bpmndi:BPMNLabel id="BPMNLabel_35" labelStyle="BPMNLabelStyle_1">
          <dc:Bounds height="34.0" width="70.0" x="1220.0" y="264.0"/>
        </bpmndi:BPMNLabel>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="BPMNShape_e_processended" bpmnElement="e_processended">
        <dc:Bounds height="36.0" width="36.0" x="1320.0" y="222.0"/>
        <bpmndi:BPMNLabel id="BPMNLabel_38" labelStyle="BPMNLabelStyle_1">
          <dc:Bounds height="34.0" width="59.0" x="1309.0" y="258.0"/>
        </bpmndi:BPMNLabel>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="BPMNShape_b_container_overheated" bpmnElement="b_container_overheated">
        <dc:Bounds height="36.0" width="36.0" x="694.0" y="271.0"/>
        <bpmndi:BPMNLabel id="BPMNLabel_33" labelStyle="BPMNLabelStyle_1">
          <dc:Bounds height="34.0" width="76.0" x="674.0" y="307.0"/>
        </bpmndi:BPMNLabel>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNEdge id="BPMNEdge_SequenceFlow_15" bpmnElement="SequenceFlow_15" sourceElement="BPMNShape_Task_5" targetElement="BPMNShape_Task_6">
        <di:waypoint xsi:type="dc:Point" x="920.0" y="183.0"/>
        <di:waypoint xsi:type="dc:Point" x="1000.0" y="183.0"/>
        <bpmndi:BPMNLabel id="BPMNLabel_37" labelStyle="BPMNLabelStyle_1"/>
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="BPMNEdge_SequenceFlow_1" bpmnElement="SequenceFlow_1" sourceElement="BPMNShape_s_processstarted" targetElement="BPMNShape_ParallelGateway_1">
        <di:waypoint xsi:type="dc:Point" x="116.0" y="239.0"/>
        <di:waypoint xsi:type="dc:Point" x="144.0" y="239.0"/>
        <di:waypoint xsi:type="dc:Point" x="144.0" y="259.0"/>
        <di:waypoint xsi:type="dc:Point" x="180.0" y="259.0"/>
        <bpmndi:BPMNLabel id="BPMNLabel_13" labelStyle="BPMNLabelStyle_1"/>
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="BPMNEdge_SequenceFlow_2" bpmnElement="SequenceFlow_2" sourceElement="BPMNShape_ParallelGateway_1" targetElement="BPMNShape_Task_1">
        <di:waypoint xsi:type="dc:Point" x="205.0" y="234.0"/>
        <di:waypoint xsi:type="dc:Point" x="205.0" y="203.0"/>
        <di:waypoint xsi:type="dc:Point" x="270.0" y="203.0"/>
        <bpmndi:BPMNLabel id="BPMNLabel_14" labelStyle="BPMNLabelStyle_1"/>
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="BPMNEdge_SequenceFlow_3" bpmnElement="SequenceFlow_3" sourceElement="BPMNShape_Task_1" targetElement="BPMNShape_ParallelGateway_2">
        <di:waypoint xsi:type="dc:Point" x="380.0" y="196.0"/>
        <di:waypoint xsi:type="dc:Point" x="404.0" y="196.0"/>
        <di:waypoint xsi:type="dc:Point" x="404.0" y="239.0"/>
        <bpmndi:BPMNLabel id="BPMNLabel_15" labelStyle="BPMNLabelStyle_1"/>
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="BPMNEdge_SequenceFlow_4" bpmnElement="SequenceFlow_4" sourceElement="BPMNShape_ParallelGateway_1" targetElement="BPMNShape_IntermediateCatchEvent_2">
        <di:waypoint xsi:type="dc:Point" x="230.0" y="259.0"/>
        <di:waypoint xsi:type="dc:Point" x="319.0" y="259.0"/>
        <di:waypoint xsi:type="dc:Point" x="319.0" y="316.0"/>
        <bpmndi:BPMNLabel id="BPMNLabel_16" labelStyle="BPMNLabelStyle_1"/>
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="BPMNEdge_SequenceFlow_5" bpmnElement="SequenceFlow_5" sourceElement="BPMNShape_IntermediateCatchEvent_2" targetElement="BPMNShape_ParallelGateway_2">
        <di:waypoint xsi:type="dc:Point" x="337.0" y="334.0"/>
        <di:waypoint xsi:type="dc:Point" x="404.0" y="334.0"/>
        <di:waypoint xsi:type="dc:Point" x="404.0" y="289.0"/>
        <bpmndi:BPMNLabel id="BPMNLabel_17" labelStyle="BPMNLabelStyle_1"/>
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="BPMNEdge_SequenceFlow_6" bpmnElement="SequenceFlow_6" sourceElement="BPMNShape_ParallelGateway_2" targetElement="BPMNShape_attach_container">
        <di:waypoint xsi:type="dc:Point" x="429.0" y="264.0"/>
        <di:waypoint xsi:type="dc:Point" x="452.0" y="264.0"/>
        <di:waypoint xsi:type="dc:Point" x="452.0" y="272.0"/>
        <di:waypoint xsi:type="dc:Point" x="481.0" y="272.0"/>
        <bpmndi:BPMNLabel id="BPMNLabel_18" labelStyle="BPMNLabelStyle_1"/>
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="BPMNEdge_SequenceFlow_7" bpmnElement="SequenceFlow_7" sourceElement="BPMNShape_attach_container" targetElement="BPMNShape_Task_4">
        <di:waypoint xsi:type="dc:Point" x="591.0" y="265.0"/>
        <di:waypoint xsi:type="dc:Point" x="610.0" y="265.0"/>
        <di:waypoint xsi:type="dc:Point" x="610.0" y="264.0"/>
        <di:waypoint xsi:type="dc:Point" x="634.0" y="264.0"/>
        <bpmndi:BPMNLabel id="BPMNLabel_19" labelStyle="BPMNLabelStyle_1"/>
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="BPMNEdge_SequenceFlow_8" bpmnElement="SequenceFlow_8" sourceElement="BPMNShape_Task_4" targetElement="BPMNShape_Task_5">
        <di:waypoint xsi:type="dc:Point" x="706.0" y="239.0"/>
        <di:waypoint xsi:type="dc:Point" x="706.0" y="183.0"/>
        <di:waypoint xsi:type="dc:Point" x="810.0" y="183.0"/>
        <bpmndi:BPMNLabel id="BPMNLabel_20" labelStyle="BPMNLabelStyle_1"/>
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="BPMNEdge_SequenceFlow_13" bpmnElement="SequenceFlow_13" sourceElement="BPMNShape_b_container_overheated" targetElement="BPMNShape_te_process_failed">
        <di:waypoint xsi:type="dc:Point" x="712.0" y="307.0"/>
        <di:waypoint xsi:type="dc:Point" x="712.0" y="345.0"/>
        <di:waypoint xsi:type="dc:Point" x="742.0" y="345.0"/>
        <di:waypoint xsi:type="dc:Point" x="742.0" y="392.0"/>
        <bpmndi:BPMNLabel id="BPMNLabel_39" labelStyle="BPMNLabelStyle_1"/>
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="BPMNEdge_SequenceFlow_14" bpmnElement="SequenceFlow_14" sourceElement="BPMNShape_te_process_failed" targetElement="BPMNShape_ExclusiveGateway_1">
        <di:waypoint xsi:type="dc:Point" x="760.0" y="410.0"/>
        <di:waypoint xsi:type="dc:Point" x="1255.0" y="410.0"/>
        <di:waypoint xsi:type="dc:Point" x="1255.0" y="264.0"/>
        <bpmndi:BPMNLabel id="BPMNLabel_40" labelStyle="BPMNLabelStyle_1"/>
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="BPMNEdge_SequenceFlow_16" bpmnElement="SequenceFlow_16" sourceElement="BPMNShape_ExclusiveGateway_1" targetElement="BPMNShape_e_processended">
        <di:waypoint xsi:type="dc:Point" x="1280.0" y="239.0"/>
        <di:waypoint xsi:type="dc:Point" x="1298.0" y="239.0"/>
        <di:waypoint xsi:type="dc:Point" x="1298.0" y="240.0"/>
        <di:waypoint xsi:type="dc:Point" x="1320.0" y="240.0"/>
        <bpmndi:BPMNLabel id="BPMNLabel_41" labelStyle="BPMNLabelStyle_1"/>
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="BPMNEdge_SequenceFlow_17" bpmnElement="SequenceFlow_17" sourceElement="BPMNShape_Task_6" targetElement="BPMNShape_te_c_portion_ended">
        <di:waypoint xsi:type="dc:Point" x="1110.0" y="183.0"/>
        <di:waypoint xsi:type="dc:Point" x="1132.0" y="183.0"/>
        <di:waypoint xsi:type="dc:Point" x="1132.0" y="189.0"/>
        <di:waypoint xsi:type="dc:Point" x="1160.0" y="189.0"/>
        <bpmndi:BPMNLabel id="BPMNLabel_42" labelStyle="BPMNLabelStyle_1"/>
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="BPMNEdge_SequenceFlow_18" bpmnElement="SequenceFlow_18" sourceElement="BPMNShape_te_c_portion_ended" targetElement="BPMNShape_ExclusiveGateway_1">
        <di:waypoint xsi:type="dc:Point" x="1196.0" y="189.0"/>
        <di:waypoint xsi:type="dc:Point" x="1255.0" y="189.0"/>
        <di:waypoint xsi:type="dc:Point" x="1255.0" y="214.0"/>
        <bpmndi:BPMNLabel id="BPMNLabel_43" labelStyle="BPMNLabelStyle_1"/>
      </bpmndi:BPMNEdge>
    </bpmndi:BPMNPlane>
    <bpmndi:BPMNLabelStyle id="BPMNLabelStyle_1">
      <dc:Font name="arial" size="9.0"/>
    </bpmndi:BPMNLabelStyle>
  </bpmndi:BPMNDiagram>
</bpmn2:definitions>`