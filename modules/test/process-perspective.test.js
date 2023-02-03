const fs = require('fs');

const { ProcessPerspective, SkipDeviation, IncorrectExecutionSequenceDeviation, IncompleteDeviation, MultiExecutionDeviation,
  IncorrectBranchDeviation } = require('../monitoring/monitoringtypes/bpmn/process-perspective');
const AUX = require('../egsm-common/auxiliary/auxiliary')
const LOG = require('../egsm-common/auxiliary/logManager');
const { EgsmModel } = require('../monitoring/monitoringtypes/bpmn/egsm-model');
const { EgsmStage } = require('../monitoring/monitoringtypes/bpmn/egsm-stage');
const { BpmnModel } = require('../monitoring/monitoringtypes/bpmn/bpmn-model');

//var EGSM , BPMN
/*beforeAll(() => {
    try {
        EGSM = fs.readFileSync('./process-perspective-test/egsm.xml', 'utf8');
        BPMN = fs.readFileSync('./process-perspective-test/model.bpmn', 'utf8');
      } catch (err) {
        console.error(err);
      }
});*/
//Test cases
test('SEQUENCE - No deviation', async () => {
  //Children stages
  var ch1 = new EgsmStage('ch1', 'ch1', 'parent', 'EXCEPTION', '')
  ch1.type = 'ACTIVITY'
  ch1.direct_successor = 'NONE'
  ch1.status = 'REGULAR'
  ch1.state = 'CLOSED'
  ch1.compliance = 'ONTIME'
  var ch2 = new EgsmStage('ch2', 'ch2', 'parent', 'EXCEPTION', '')
  ch2.type = 'ACTIVITY'
  ch2.direct_successor = 'ch1'
  ch2.status = 'REGULAR'
  ch2.state = 'CLOSED'
  ch2.compliance = 'ONTIME'
  var ch3 = new EgsmStage('ch3', 'ch3', 'parent', 'EXCEPTION', '')
  ch3.type = 'ACTIVITY'
  ch3.direct_successor = 'ch2'
  ch3.status = 'REGULAR'
  ch3.state = 'CLOSED'
  ch3.compliance = 'ONTIME'
  var ch4 = new EgsmStage('ch4', 'ch4', 'parent', 'EXCEPTION', '')
  ch4.type = 'ACTIVITY'
  ch4.direct_successor = 'ch3'
  ch4.status = 'REGULAR'
  ch4.state = 'CLOSED'
  ch4.compliance = 'ONTIME'

  //Parent stage
  var stage1 = new EgsmStage('parent', 'parent', 'NA', 'EXCEPTION', '')
  stage1.type = 'SEQUENCE'
  stage1.status = 'REGULAR'
  stage1.state = 'CLOSED'
  stage1.compliance = 'ONTIME'
  stage1.direct_successor = 'NONE'
  stage1.children = ['ch1', 'ch2', 'ch3', 'ch4']

  //Setting up the perspective
  var eGSM = new EgsmModel()
  var bpmn = new BpmnModel('pers1')
  eGSM.stages.set('parent', stage1)
  eGSM.stages.set('ch1', ch1)
  eGSM.stages.set('ch2', ch2)
  eGSM.stages.set('ch3', ch3)
  eGSM.stages.set('ch4', ch4)
  var pers1 = new ProcessPerspective('pers-1')
  pers1.egsm_model = eGSM
  pers1.bpmn_model = bpmn

  var expected = []
  var data = pers1.analyze()
  expect(data).toEqual(expected)
})


test('SEQUENCE - One stage skipped', async () => {
  //Children stages
  var ch1 = new EgsmStage('ch1', 'ch1', 'parent', 'EXCEPTION', '')
  ch1.type = 'ACTIVITY'
  ch1.direct_successor = 'NONE'
  ch1.status = 'REGULAR'
  ch1.state = 'CLOSED'
  ch1.compliance = 'ONTIME'
  var ch2 = new EgsmStage('ch2', 'ch2', 'parent', 'EXCEPTION', '')
  ch2.type = 'ACTIVITY'
  ch2.direct_successor = 'ch1'
  ch2.status = 'REGULAR'
  ch2.state = 'CLOSED'
  ch2.compliance = 'ONTIME'
  var ch3 = new EgsmStage('ch3', 'ch3', 'parent', 'EXCEPTION', '')
  ch3.type = 'ACTIVITY'
  ch3.direct_successor = 'ch2'
  ch3.status = 'REGULAR'
  ch3.state = 'UNOPENED'
  ch3.compliance = 'SKIPPED'
  var ch4 = new EgsmStage('ch4', 'ch4', 'parent', 'EXCEPTION', '')
  ch4.type = 'ACTIVITY'
  ch4.direct_successor = 'ch3'
  ch4.status = 'REGULAR'
  ch4.state = 'CLOSED'
  ch4.compliance = 'OUTOFORDER'

  //Parent stage
  var stage1 = new EgsmStage('parent', 'parent', 'NA', 'EXCEPTION', '')
  stage1.type = 'SEQUENCE'
  stage1.status = 'REGULAR'
  stage1.state = 'OPEN'
  stage1.compliance = 'ONTIME'
  stage1.direct_successor = 'NONE'
  stage1.children = ['ch1', 'ch2', 'ch3', 'ch4']

  //Setting up the perspective
  var eGSM = new EgsmModel()
  var bpmn = new BpmnModel('pers1')
  eGSM.model_roots.push('parent')
  eGSM.stages.set('parent', stage1)
  eGSM.stages.set('ch1', ch1)
  eGSM.stages.set('ch2', ch2)
  eGSM.stages.set('ch3', ch3)
  eGSM.stages.set('ch4', ch4)
  var pers1 = new ProcessPerspective('pers-1')
  pers1.egsm_model = eGSM
  pers1.bpmn_model = bpmn

  var expected = [new SkipDeviation(['ch3'], 'ch4')]
  var data = pers1.analyze()
  expect(data).toEqual(expected)
})

test('SEQUENCE - Multiple stages skipped', async () => {
  //Children stages
  var ch1 = new EgsmStage('ch1', 'ch1', 'parent', 'EXCEPTION', '')
  ch1.type = 'ACTIVITY'
  ch1.direct_successor = 'NONE'
  ch1.status = 'REGULAR'
  ch1.state = 'CLOSED'
  ch1.compliance = 'ONTIME'
  var ch2 = new EgsmStage('ch2', 'ch2', 'parent', 'EXCEPTION', '')
  ch2.type = 'ACTIVITY'
  ch2.direct_successor = 'ch1'
  ch2.status = 'REGULAR'
  ch2.state = 'UNOPENED'
  ch2.compliance = 'ONTIME'
  var ch3 = new EgsmStage('ch3', 'ch3', 'parent', 'EXCEPTION', '')
  ch3.type = 'ACTIVITY'
  ch3.direct_successor = 'ch2'
  ch3.status = 'REGULAR'
  ch3.state = 'UNOPENED'
  ch3.compliance = 'SKIPPED'
  var ch4 = new EgsmStage('ch4', 'ch4', 'parent', 'EXCEPTION', '')
  ch4.type = 'ACTIVITY'
  ch4.direct_successor = 'ch3'
  ch4.status = 'REGULAR'
  ch4.state = 'CLOSED'
  ch4.compliance = 'OUTOFORDER'

  //Parent stage
  var stage1 = new EgsmStage('parent', 'parent', 'NA', 'EXCEPTION', '')
  stage1.type = 'SEQUENCE'
  stage1.status = 'REGULAR'
  stage1.state = 'OPEN'
  stage1.compliance = 'ONTIME'
  stage1.direct_successor = 'NONE'
  stage1.children = ['ch1', 'ch2', 'ch3', 'ch4']

  //Setting up the perspective
  var eGSM = new EgsmModel()
  var bpmn = new BpmnModel('pers1')
  eGSM.model_roots.push('parent')
  eGSM.stages.set('parent', stage1)
  eGSM.stages.set('ch1', ch1)
  eGSM.stages.set('ch2', ch2)
  eGSM.stages.set('ch3', ch3)
  eGSM.stages.set('ch4', ch4)
  var pers1 = new ProcessPerspective('pers-1')
  pers1.egsm_model = eGSM
  pers1.bpmn_model = bpmn

  var expected = [new SkipDeviation(['ch2', 'ch3'], 'ch4')]
  var data = pers1.analyze()
  console.log(data)
  expect(data).toEqual(expected)
})

test('SEQUENCE - Start event skipped', async () => {
  //Children stages
  var ch1 = new EgsmStage('ch1', 'ch1', 'parent', 'EXCEPTION', '')
  ch1.type = 'ACTIVITY'
  ch1.direct_successor = 'NONE'
  ch1.status = 'REGULAR'
  ch1.state = 'UNOPENED'
  ch1.compliance = 'SKIPPED'
  var ch2 = new EgsmStage('ch2', 'ch2', 'parent', 'EXCEPTION', '')
  ch2.type = 'ACTIVITY'
  ch2.direct_successor = 'ch1'
  ch2.status = 'REGULAR'
  ch2.state = 'CLOSED'
  ch2.compliance = 'OUTOFORDER'
  var ch3 = new EgsmStage('ch3', 'ch3', 'parent', 'EXCEPTION', '')
  ch3.type = 'ACTIVITY'
  ch3.direct_successor = 'ch2'
  ch3.status = 'REGULAR'
  ch3.state = 'CLOSED'
  ch3.compliance = 'ONTIME'
  var ch4 = new EgsmStage('ch4', 'ch4', 'parent', 'EXCEPTION', '')
  ch4.type = 'ACTIVITY'
  ch4.direct_successor = 'ch3'
  ch4.status = 'REGULAR'
  ch4.state = 'CLOSED'
  ch4.compliance = 'ONTIME'

  //Parent stage
  var stage1 = new EgsmStage('parent', 'parent', 'NA', 'EXCEPTION', '')
  stage1.type = 'SEQUENCE'
  stage1.status = 'REGULAR'
  stage1.state = 'OPEN'
  stage1.compliance = 'ONTIME'
  stage1.direct_successor = 'NONE'
  stage1.children = ['ch1', 'ch2', 'ch3', 'ch4']

  //Setting up the perspective
  var eGSM = new EgsmModel()
  var bpmn = new BpmnModel('pers1')
  eGSM.model_roots.push('parent')
  eGSM.stages.set('parent', stage1)
  eGSM.stages.set('ch1', ch1)
  eGSM.stages.set('ch2', ch2)
  eGSM.stages.set('ch3', ch3)
  eGSM.stages.set('ch4', ch4)
  var pers1 = new ProcessPerspective('pers-1')
  pers1.egsm_model = eGSM
  pers1.bpmn_model = bpmn

  var expected = [new SkipDeviation(['ch1'], 'ch2')]
  var data = pers1.analyze()
  console.log(data)
  expect(data).toEqual(expected)
})

test('SEQUENCE - Multiple stages including start event skipped', async () => {
  //Children stages
  var ch1 = new EgsmStage('ch1', 'ch1', 'parent', 'EXCEPTION', '')
  ch1.type = 'ACTIVITY'
  ch1.direct_successor = 'NONE'
  ch1.status = 'REGULAR'
  ch1.state = 'UNOPENED'
  ch1.compliance = 'ONTIME'
  var ch2 = new EgsmStage('ch2', 'ch2', 'parent', 'EXCEPTION', '')
  ch2.type = 'ACTIVITY'
  ch2.direct_successor = 'ch1'
  ch2.status = 'REGULAR'
  ch2.state = 'UNOPENED'
  ch2.compliance = 'ONTIME'
  var ch3 = new EgsmStage('ch3', 'ch3', 'parent', 'EXCEPTION', '')
  ch3.type = 'ACTIVITY'
  ch3.direct_successor = 'ch2'
  ch3.status = 'REGULAR'
  ch3.state = 'UNOPENED'
  ch3.compliance = 'SKIPPED'
  var ch4 = new EgsmStage('ch4', 'ch4', 'parent', 'EXCEPTION', '')
  ch4.type = 'ACTIVITY'
  ch4.direct_successor = 'ch3'
  ch4.status = 'REGULAR'
  ch4.state = 'CLOSED'
  ch4.compliance = 'OUTOFORDER'

  //Parent stage
  var stage1 = new EgsmStage('parent', 'parent', 'NA', 'EXCEPTION', '')
  stage1.type = 'SEQUENCE'
  stage1.status = 'REGULAR'
  stage1.state = 'OPEN'
  stage1.compliance = 'ONTIME'
  stage1.direct_successor = 'NONE'
  stage1.children = ['ch1', 'ch2', 'ch3', 'ch4']

  //Setting up the perspective
  var eGSM = new EgsmModel()
  var bpmn = new BpmnModel('pers1')
  eGSM.model_roots.push('parent')
  eGSM.stages.set('parent', stage1)
  eGSM.stages.set('ch1', ch1)
  eGSM.stages.set('ch2', ch2)
  eGSM.stages.set('ch3', ch3)
  eGSM.stages.set('ch4', ch4)
  var pers1 = new ProcessPerspective('pers-1')
  pers1.egsm_model = eGSM
  pers1.bpmn_model = bpmn

  var expected = [new SkipDeviation(['ch1', 'ch2', 'ch3'], 'ch4')]
  var data = pers1.analyze()
  console.log(data)
  expect(data).toEqual(expected)
})

test('SEQUENCE - Multi-execution of a stage', async () => {
  //Children stages
  var ch1 = new EgsmStage('ch1', 'ch1', 'parent', 'EXCEPTION', '')
  ch1.type = 'ACTIVITY'
  ch1.direct_successor = 'NONE'
  ch1.status = 'REGULAR'
  ch1.state = 'CLOSED'
  ch1.compliance = 'ONTIME'
  var ch2 = new EgsmStage('ch2', 'ch2', 'parent', 'EXCEPTION', '')
  ch2.type = 'ACTIVITY'
  ch2.direct_successor = 'ch1'
  ch2.status = 'REGULAR'
  ch2.state = 'CLOSED'
  ch2.compliance = 'OUTOFORDER'
  var ch3 = new EgsmStage('ch3', 'ch3', 'parent', 'EXCEPTION', '')
  ch3.type = 'ACTIVITY'
  ch3.direct_successor = 'ch2'
  ch3.status = 'REGULAR'
  ch3.state = 'CLOSED'
  ch3.compliance = 'ONTIME'
  var ch4 = new EgsmStage('ch4', 'ch4', 'parent', 'EXCEPTION', '')
  ch4.type = 'ACTIVITY'
  ch4.direct_successor = 'ch3'
  ch4.status = 'REGULAR'
  ch4.state = 'CLOSED'
  ch4.compliance = 'ONTIME'

  //Parent stage
  var stage1 = new EgsmStage('parent', 'parent', 'NA', 'EXCEPTION', '')
  stage1.type = 'SEQUENCE'
  stage1.status = 'REGULAR'
  stage1.state = 'CLOSED'
  stage1.compliance = 'ONTIME'
  stage1.direct_successor = 'NONE'
  stage1.children = ['ch1', 'ch2', 'ch3', 'ch4']

  //Setting up the perspective
  var eGSM = new EgsmModel()
  var bpmn = new BpmnModel('pers1')
  eGSM.model_roots.push('parent')
  eGSM.stages.set('parent', stage1)
  eGSM.stages.set('ch1', ch1)
  eGSM.stages.set('ch2', ch2)
  eGSM.stages.set('ch3', ch3)
  eGSM.stages.set('ch4', ch4)
  var pers1 = new ProcessPerspective('pers-1')
  pers1.egsm_model = eGSM
  pers1.bpmn_model = bpmn

  var expected = [new IncorrectExecutionSequenceDeviation(['ch2'])]
  var data = pers1.analyze()
  console.log(data)
  expect(data).toEqual(expected)
})

test('SEQUENCE - Incorrect execution sequence including 2 stages', async () => {
  //Children stages
  var ch1 = new EgsmStage('ch1', 'ch1', 'parent', 'EXCEPTION', '')
  ch1.type = 'ACTIVITY'
  ch1.direct_successor = 'NONE'
  ch1.status = 'REGULAR'
  ch1.state = 'CLOSED'
  ch1.compliance = 'ONTIME'
  var ch2 = new EgsmStage('ch2', 'ch2', 'parent', 'EXCEPTION', '')
  ch2.type = 'ACTIVITY'
  ch2.direct_successor = 'ch1'
  ch2.status = 'REGULAR'
  ch2.state = 'CLOSED'
  ch2.compliance = 'OUTOFORDER'
  var ch3 = new EgsmStage('ch3', 'ch3', 'parent', 'EXCEPTION', '')
  ch3.type = 'ACTIVITY'
  ch3.direct_successor = 'ch2'
  ch3.status = 'REGULAR'
  ch3.state = 'CLOSED'
  ch3.compliance = 'OUTOFORDER'
  var ch4 = new EgsmStage('ch4', 'ch4', 'parent', 'EXCEPTION', '')
  ch4.type = 'ACTIVITY'
  ch4.direct_successor = 'ch3'
  ch4.status = 'REGULAR'
  ch4.state = 'CLOSED'
  ch4.compliance = 'ONTIME'

  //Parent stage
  var stage1 = new EgsmStage('parent', 'parent', 'NA', 'EXCEPTION', '')
  stage1.type = 'SEQUENCE'
  stage1.status = 'REGULAR'
  stage1.state = 'CLOSED'
  stage1.compliance = 'ONTIME'
  stage1.direct_successor = 'NONE'
  stage1.children = ['ch1', 'ch2', 'ch3', 'ch4']

  //Setting up the perspective
  var eGSM = new EgsmModel()
  var bpmn = new BpmnModel('pers1')
  eGSM.model_roots.push('parent')
  eGSM.stages.set('parent', stage1)
  eGSM.stages.set('ch1', ch1)
  eGSM.stages.set('ch2', ch2)
  eGSM.stages.set('ch3', ch3)
  eGSM.stages.set('ch4', ch4)
  var pers1 = new ProcessPerspective('pers-1')
  pers1.egsm_model = eGSM
  pers1.bpmn_model = bpmn

  var expected = [new IncorrectExecutionSequenceDeviation(['ch2', 'ch3'])]
  var data = pers1.analyze()
  console.log(data)
  expect(data).toEqual(expected)
})

test('SEQUENCE - Stage opened but not finished - parent should be closed', async () => {
  //Children stages
  var ch1 = new EgsmStage('ch1', 'ch1', 'parent', 'EXCEPTION', '')
  ch1.type = 'ACTIVITY'
  ch1.direct_successor = 'NONE'
  ch1.status = 'REGULAR'
  ch1.state = 'CLOSED'
  ch1.compliance = 'ONTIME'
  var ch2 = new EgsmStage('ch2', 'ch2', 'parent', 'EXCEPTION', '')
  ch2.type = 'ACTIVITY'
  ch2.direct_successor = 'ch1'
  ch2.status = 'REGULAR'
  ch2.state = 'OPEN'
  ch2.compliance = 'ONTIME'
  var ch3 = new EgsmStage('ch3', 'ch3', 'parent', 'EXCEPTION', '')
  ch3.type = 'ACTIVITY'
  ch3.direct_successor = 'ch2'
  ch3.status = 'REGULAR'
  ch3.state = 'CLOSED'
  ch3.compliance = 'OUTOFORDER'
  var ch4 = new EgsmStage('ch4', 'ch4', 'parent', 'EXCEPTION', '')
  ch4.type = 'ACTIVITY'
  ch4.direct_successor = 'ch3'
  ch4.status = 'REGULAR'
  ch4.state = 'CLOSED'
  ch4.compliance = 'ONTIME'

  //Parent stage
  var stage1 = new EgsmStage('parent', 'parent', 'NA', 'EXCEPTION', '')
  stage1.type = 'SEQUENCE'
  stage1.status = 'REGULAR'
  stage1.state = 'OPEN'
  stage1.compliance = 'ONTIME'
  stage1.direct_successor = 'NONE'
  stage1.children = ['ch1', 'ch2', 'ch3', 'ch4']
  stage1.propagateCondition('SHOULD_BE_CLOSED')

  //Setting up the perspective
  var eGSM = new EgsmModel()
  var bpmn = new BpmnModel('pers1')
  eGSM.model_roots.push('parent')
  eGSM.stages.set('parent', stage1)
  eGSM.stages.set('ch1', ch1)
  eGSM.stages.set('ch2', ch2)
  eGSM.stages.set('ch3', ch3)
  eGSM.stages.set('ch4', ch4)
  var pers1 = new ProcessPerspective('pers-1')
  pers1.egsm_model = eGSM
  pers1.bpmn_model = bpmn

  var expected = [
    new IncorrectExecutionSequenceDeviation(['ch3']),
    new IncompleteDeviation('ch2')]
  var data = pers1.analyze()
  console.log(data)
  expect(data).toEqual(expected)
})

test('SEQUENCE - Stage opened but not finished - parent should not be closed', async () => {
  //Children stages
  var ch1 = new EgsmStage('ch1', 'ch1', 'parent', 'EXCEPTION', '')
  ch1.type = 'ACTIVITY'
  ch1.direct_successor = 'NONE'
  ch1.status = 'REGULAR'
  ch1.state = 'CLOSED'
  ch1.compliance = 'ONTIME'
  var ch2 = new EgsmStage('ch2', 'ch2', 'parent', 'EXCEPTION', '')
  ch2.type = 'ACTIVITY'
  ch2.direct_successor = 'ch1'
  ch2.status = 'REGULAR'
  ch2.state = 'OPEN'
  ch2.compliance = 'ONTIME'
  var ch3 = new EgsmStage('ch3', 'ch3', 'parent', 'EXCEPTION', '')
  ch3.type = 'ACTIVITY'
  ch3.direct_successor = 'ch2'
  ch3.status = 'REGULAR'
  ch3.state = 'CLOSED'
  ch3.compliance = 'OUTOFORDER'
  var ch4 = new EgsmStage('ch4', 'ch4', 'parent', 'EXCEPTION', '')
  ch4.type = 'ACTIVITY'
  ch4.direct_successor = 'ch3'
  ch4.status = 'REGULAR'
  ch4.state = 'CLOSED'
  ch4.compliance = 'ONTIME'

  //Parent stage
  var stage1 = new EgsmStage('parent', 'parent', 'NA', 'EXCEPTION', '')
  stage1.type = 'SEQUENCE'
  stage1.status = 'REGULAR'
  stage1.state = 'OPEN'
  stage1.compliance = 'ONTIME'
  stage1.direct_successor = 'NONE'
  stage1.children = ['ch1', 'ch2', 'ch3', 'ch4']

  //Setting up the perspective
  var eGSM = new EgsmModel()
  var bpmn = new BpmnModel('pers1')
  eGSM.model_roots.push('parent')
  eGSM.stages.set('parent', stage1)
  eGSM.stages.set('ch1', ch1)
  eGSM.stages.set('ch2', ch2)
  eGSM.stages.set('ch3', ch3)
  eGSM.stages.set('ch4', ch4)
  var pers1 = new ProcessPerspective('pers-1')
  pers1.egsm_model = eGSM
  pers1.bpmn_model = bpmn

  var expected = [
    new IncorrectExecutionSequenceDeviation(['ch3'])]
  var data = pers1.analyze()
  console.log(data)
  expect(data).toEqual(expected)
})

test('SEQUENCE - Overlapped activities', async () => {
  //Children stages
  var ch1 = new EgsmStage('ch1', 'ch1', 'parent', 'EXCEPTION', '')
  ch1.type = 'ACTIVITY'
  ch1.direct_successor = 'NONE'
  ch1.status = 'REGULAR'
  ch1.state = 'CLOSED'
  ch1.compliance = 'ONTIME'
  var ch2 = new EgsmStage('ch2', 'ch2', 'parent', 'EXCEPTION', '')
  ch2.type = 'ACTIVITY'
  ch2.direct_successor = 'ch1'
  ch2.status = 'REGULAR'
  ch2.state = 'CLOSED'
  ch2.compliance = 'OUTOFORDER'
  var ch3 = new EgsmStage('ch3', 'ch3', 'parent', 'EXCEPTION', '')
  ch3.type = 'ACTIVITY'
  ch3.direct_successor = 'ch2'
  ch3.status = 'REGULAR'
  ch3.state = 'CLOSED'
  ch3.compliance = 'OUTOFORDER'
  var ch4 = new EgsmStage('ch4', 'ch4', 'parent', 'EXCEPTION', '')
  ch4.type = 'ACTIVITY'
  ch4.direct_successor = 'ch3'
  ch4.status = 'REGULAR'
  ch4.state = 'CLOSED'
  ch4.compliance = 'ONTIME'

  //Parent stage
  var stage1 = new EgsmStage('parent', 'parent', 'NA', 'EXCEPTION', '')
  stage1.type = 'SEQUENCE'
  stage1.status = 'REGULAR'
  stage1.state = 'CLOSED'
  stage1.compliance = 'ONTIME'
  stage1.direct_successor = 'NONE'
  stage1.children = ['ch1', 'ch2', 'ch3', 'ch4']

  //Setting up the perspective
  var eGSM = new EgsmModel()
  var bpmn = new BpmnModel('pers1')
  eGSM.model_roots.push('parent')
  eGSM.stages.set('parent', stage1)
  eGSM.stages.set('ch1', ch1)
  eGSM.stages.set('ch2', ch2)
  eGSM.stages.set('ch3', ch3)
  eGSM.stages.set('ch4', ch4)
  var pers1 = new ProcessPerspective('pers-1')
  pers1.egsm_model = eGSM
  pers1.bpmn_model = bpmn

  var expected = [
    new IncorrectExecutionSequenceDeviation(['ch2', 'ch3'])]
  var data = pers1.analyze()
  console.log(data)
  expect(data).toEqual(expected)
})



//PARALLEL block tests
test('PARALLEL - One stage not executed at all - parent should be closed', async () => {
  //Children stages
  var ch1 = new EgsmStage('ch1', 'ch1', 'parent', 'EXCEPTION', '')
  ch1.type = 'ACTIVITY'
  ch1.direct_successor = 'NA'
  ch1.status = 'REGULAR'
  ch1.state = 'UNOPENED'
  ch1.compliance = 'ONTIME'
  var ch2 = new EgsmStage('ch2', 'ch2', 'parent', 'EXCEPTION', '')
  ch2.type = 'ACTIVITY'
  ch2.direct_successor = 'NA'
  ch2.status = 'REGULAR'
  ch2.state = 'CLOSED'
  ch2.compliance = 'ONTIME'

  //Parent stage
  var stage1 = new EgsmStage('parent', 'parent', 'NA', 'EXCEPTION', '')
  stage1.type = 'PARALLEL'
  stage1.status = 'REGULAR'
  stage1.state = 'CLOSED'
  stage1.compliance = 'ONTIME'
  stage1.direct_successor = 'NONE'
  stage1.children = ['ch1', 'ch2']
  stage1.propagateCondition('SHOULD_BE_CLOSED')

  //Setting up the perspective
  var eGSM = new EgsmModel()
  var bpmn = new BpmnModel('pers1')
  eGSM.model_roots.push('parent')
  eGSM.stages.set('parent', stage1)
  eGSM.stages.set('ch1', ch1)
  eGSM.stages.set('ch2', ch2)
  var pers1 = new ProcessPerspective('pers-1')
  pers1.egsm_model = eGSM
  pers1.bpmn_model = bpmn

  var expected = [
    new SkipDeviation(['ch1'], 'NA')]
  var data = pers1.analyze()
  console.log(data)
  expect(data).toEqual(expected)
})

test('PARALLEL - One stage not executed at all - parent should not be closed yet', async () => {
  //Children stages
  var ch1 = new EgsmStage('ch1', 'ch1', 'parent', 'EXCEPTION', '')
  ch1.type = 'ACTIVITY'
  ch1.direct_successor = 'NA'
  ch1.status = 'REGULAR'
  ch1.state = 'UNOPENED'
  ch1.compliance = 'ONTIME'
  var ch2 = new EgsmStage('ch2', 'ch2', 'parent', 'EXCEPTION', '')
  ch2.type = 'ACTIVITY'
  ch2.direct_successor = 'NA'
  ch2.status = 'REGULAR'
  ch2.state = 'CLOSED'
  ch2.compliance = 'ONTIME'

  //Parent stage
  var stage1 = new EgsmStage('parent', 'parent', 'NA', 'EXCEPTION', '')
  stage1.type = 'PARALLEL'
  stage1.status = 'REGULAR'
  stage1.state = 'OPEN'
  stage1.compliance = 'ONTIME'
  stage1.direct_successor = 'NONE'
  stage1.children = ['ch1', 'ch2']

  //Setting up the perspective
  var eGSM = new EgsmModel()
  var bpmn = new BpmnModel('pers1')
  eGSM.model_roots.push('parent')
  eGSM.stages.set('parent', stage1)
  eGSM.stages.set('ch1', ch1)
  eGSM.stages.set('ch2', ch2)
  var pers1 = new ProcessPerspective('pers-1')
  pers1.egsm_model = eGSM
  pers1.bpmn_model = bpmn

  var expected = []
  var data = pers1.analyze()
  console.log(data)
  expect(data).toEqual(expected)
})

test('PARALLEL - One stage opened but not closed - parent should be closed', async () => {
  //Children stages
  var ch1 = new EgsmStage('ch1', 'ch1', 'parent', 'EXCEPTION', '')
  ch1.type = 'ACTIVITY'
  ch1.direct_successor = 'NA'
  ch1.status = 'REGULAR'
  ch1.state = 'OPEN'
  ch1.compliance = 'ONTIME'
  var ch2 = new EgsmStage('ch2', 'ch2', 'parent', 'EXCEPTION', '')
  ch2.type = 'ACTIVITY'
  ch2.direct_successor = 'NA'
  ch2.status = 'REGULAR'
  ch2.state = 'CLOSED'
  ch2.compliance = 'ONTIME'

  //Parent stage
  var stage1 = new EgsmStage('parent', 'parent', 'NA', 'EXCEPTION', '')
  stage1.type = 'PARALLEL'
  stage1.status = 'REGULAR'
  stage1.state = 'CLOSED'
  stage1.compliance = 'ONTIME'
  stage1.direct_successor = 'NONE'
  stage1.children = ['ch1', 'ch2']
  stage1.propagateCondition('SHOULD_BE_CLOSED')

  //Setting up the perspective
  var eGSM = new EgsmModel()
  var bpmn = new BpmnModel('pers1')
  eGSM.model_roots.push('parent')
  eGSM.stages.set('parent', stage1)
  eGSM.stages.set('ch1', ch1)
  eGSM.stages.set('ch2', ch2)
  var pers1 = new ProcessPerspective('pers-1')
  pers1.egsm_model = eGSM
  pers1.bpmn_model = bpmn

  var expected = [
    new IncompleteDeviation('ch1')]
  var data = pers1.analyze()
  console.log(data)
  expect(data).toEqual(expected)
})

test('PARALLEL - One stage opened but not closed - parent should not be closed yet', async () => {
  //Children stages
  var ch1 = new EgsmStage('ch1', 'ch1', 'parent', 'EXCEPTION', '')
  ch1.type = 'ACTIVITY'
  ch1.direct_successor = 'NA'
  ch1.status = 'REGULAR'
  ch1.state = 'OPEN'
  ch1.compliance = 'ONTIME'
  var ch2 = new EgsmStage('ch2', 'ch2', 'parent', 'EXCEPTION', '')
  ch2.type = 'ACTIVITY'
  ch2.direct_successor = 'NA'
  ch2.status = 'REGULAR'
  ch2.state = 'CLOSED'
  ch2.compliance = 'ONTIME'

  //Parent stage
  var stage1 = new EgsmStage('parent', 'parent', 'NA', 'EXCEPTION', '')
  stage1.type = 'PARALLEL'
  stage1.status = 'REGULAR'
  stage1.state = 'OPEN'
  stage1.compliance = 'ONTIME'
  stage1.direct_successor = 'NONE'
  stage1.children = ['ch1', 'ch2']

  //Setting up the perspective
  var eGSM = new EgsmModel()
  var bpmn = new BpmnModel('pers1')
  eGSM.model_roots.push('parent')
  eGSM.stages.set('parent', stage1)
  eGSM.stages.set('ch1', ch1)
  eGSM.stages.set('ch2', ch2)
  var pers1 = new ProcessPerspective('pers-1')
  pers1.egsm_model = eGSM
  pers1.bpmn_model = bpmn

  var expected = []
  var data = pers1.analyze()
  console.log(data)
  expect(data).toEqual(expected)
})

test('PARALLEL - Multiple stages not executed - parent should be closed', async () => {
  //Children stages
  var ch1 = new EgsmStage('ch1', 'ch1', 'parent', 'EXCEPTION', '')
  ch1.type = 'ACTIVITY'
  ch1.direct_successor = 'NA'
  ch1.status = 'REGULAR'
  ch1.state = 'UNOPENED'
  ch1.compliance = 'ONTIME'
  var ch2 = new EgsmStage('ch2', 'ch2', 'parent', 'EXCEPTION', '')
  ch2.type = 'ACTIVITY'
  ch2.direct_successor = 'NA'
  ch2.status = 'REGULAR'
  ch2.state = 'UNOPENED'
  ch2.compliance = 'ONTIME'
  var ch3 = new EgsmStage('ch3', 'ch3', 'parent', 'EXCEPTION', '')
  ch3.type = 'ACTIVITY'
  ch3.direct_successor = 'NA'
  ch3.status = 'REGULAR'
  ch3.state = 'CLOSED'
  ch3.compliance = 'ONTIME'

  //Parent stage
  var stage1 = new EgsmStage('parent', 'parent', 'NA', 'EXCEPTION', '')
  stage1.type = 'PARALLEL'
  stage1.status = 'REGULAR'
  stage1.state = 'CLOSED'
  stage1.compliance = 'ONTIME'
  stage1.direct_successor = 'NONE'
  stage1.children = ['ch1', 'ch2', 'ch3']
  stage1.propagateCondition('SHOULD_BE_CLOSED')

  //Setting up the perspective
  var eGSM = new EgsmModel()
  var bpmn = new BpmnModel('pers1')
  eGSM.model_roots.push('parent')
  eGSM.stages.set('parent', stage1)
  eGSM.stages.set('ch1', ch1)
  eGSM.stages.set('ch2', ch2)
  eGSM.stages.set('ch3', ch3)
  var pers1 = new ProcessPerspective('pers-1')
  pers1.egsm_model = eGSM
  pers1.bpmn_model = bpmn

  var expected = [
    new SkipDeviation(['ch1'], 'NA'),
    new SkipDeviation(['ch2'], 'NA')]
  var data = pers1.analyze()
  console.log(data)
  expect(data).toEqual(expected)
})

test('PARALLEL - Multiple stages not executed - parent should not be closed yet', async () => {
  //Children stages
  var ch1 = new EgsmStage('ch1', 'ch1', 'parent', 'EXCEPTION', '')
  ch1.type = 'ACTIVITY'
  ch1.direct_successor = 'NA'
  ch1.status = 'REGULAR'
  ch1.state = 'UNOPENED'
  ch1.compliance = 'ONTIME'
  var ch2 = new EgsmStage('ch2', 'ch2', 'parent', 'EXCEPTION', '')
  ch2.type = 'ACTIVITY'
  ch2.direct_successor = 'NA'
  ch2.status = 'REGULAR'
  ch2.state = 'UNOPENED'
  ch2.compliance = 'ONTIME'
  var ch3 = new EgsmStage('ch3', 'ch3', 'parent', 'EXCEPTION', '')
  ch3.type = 'ACTIVITY'
  ch3.direct_successor = 'NA'
  ch3.status = 'REGULAR'
  ch3.state = 'CLOSED'
  ch3.compliance = 'ONTIME'

  //Parent stage
  var stage1 = new EgsmStage('parent', 'parent', 'NA', 'EXCEPTION', '')
  stage1.type = 'PARALLEL'
  stage1.status = 'REGULAR'
  stage1.state = 'OPEN'
  stage1.compliance = 'ONTIME'
  stage1.direct_successor = 'NONE'
  stage1.children = ['ch1', 'ch2', 'ch3']

  //Setting up the perspective
  var eGSM = new EgsmModel()
  var bpmn = new BpmnModel('pers1')
  eGSM.model_roots.push('parent')
  eGSM.stages.set('parent', stage1)
  eGSM.stages.set('ch1', ch1)
  eGSM.stages.set('ch2', ch2)
  eGSM.stages.set('ch3', ch3)
  var pers1 = new ProcessPerspective('pers-1')
  pers1.egsm_model = eGSM
  pers1.bpmn_model = bpmn

  var expected = []
  var data = pers1.analyze()
  console.log(data)
  expect(data).toEqual(expected)
})

test('PARALLEL - Multi-executing a stage - parent should be closed', async () => {
  //Children stages
  var ch1 = new EgsmStage('ch1', 'ch1', 'parent', 'EXCEPTION', '')
  ch1.type = 'ACTIVITY'
  ch1.direct_successor = 'NA'
  ch1.status = 'REGULAR'
  ch1.state = 'CLOSED'
  ch1.compliance = 'OUTOFORDER'
  var ch2 = new EgsmStage('ch2', 'ch2', 'parent', 'EXCEPTION', '')
  ch2.type = 'ACTIVITY'
  ch2.direct_successor = 'NA'
  ch2.status = 'REGULAR'
  ch2.state = 'CLOSED'
  ch2.compliance = 'ONTIME'
  var ch3 = new EgsmStage('ch3', 'ch3', 'parent', 'EXCEPTION', '')
  ch3.type = 'ACTIVITY'
  ch3.direct_successor = 'NA'
  ch3.status = 'REGULAR'
  ch3.state = 'CLOSED'
  ch3.compliance = 'ONTIME'

  //Parent stage
  var stage1 = new EgsmStage('parent', 'parent', 'NA', 'EXCEPTION', '')
  stage1.type = 'PARALLEL'
  stage1.status = 'REGULAR'
  stage1.state = 'CLOSED'
  stage1.compliance = 'ONTIME'
  stage1.direct_successor = 'NONE'
  stage1.children = ['ch1', 'ch2', 'ch3']
  stage1.propagateCondition('SHOULD_BE_CLOSED')

  //Setting up the perspective
  var eGSM = new EgsmModel()
  var bpmn = new BpmnModel('pers1')
  eGSM.model_roots.push('parent')
  eGSM.stages.set('parent', stage1)
  eGSM.stages.set('ch1', ch1)
  eGSM.stages.set('ch2', ch2)
  eGSM.stages.set('ch3', ch3)
  var pers1 = new ProcessPerspective('pers-1')
  pers1.egsm_model = eGSM
  pers1.bpmn_model = bpmn

  var expected = [new MultiExecutionDeviation('ch1')]
  var data = pers1.analyze()
  console.log(data)
  expect(data).toEqual(expected)
})

test('PARALLEL - Multi-executing a stage - parent should not be closed yet', async () => {
  //Children stages
  var ch1 = new EgsmStage('ch1', 'ch1', 'parent', 'EXCEPTION', '')
  ch1.type = 'ACTIVITY'
  ch1.direct_successor = 'NA'
  ch1.status = 'REGULAR'
  ch1.state = 'CLOSED'
  ch1.compliance = 'OUTOFORDER'
  var ch2 = new EgsmStage('ch2', 'ch2', 'parent', 'EXCEPTION', '')
  ch2.type = 'ACTIVITY'
  ch2.direct_successor = 'NA'
  ch2.status = 'REGULAR'
  ch2.state = 'CLOSED'
  ch2.compliance = 'ONTIME'
  var ch3 = new EgsmStage('ch3', 'ch3', 'parent', 'EXCEPTION', '')
  ch3.type = 'ACTIVITY'
  ch3.direct_successor = 'NA'
  ch3.status = 'REGULAR'
  ch3.state = 'CLOSED'
  ch3.compliance = 'ONTIME'

  //Parent stage
  var stage1 = new EgsmStage('parent', 'parent', 'NA', 'EXCEPTION', '')
  stage1.type = 'PARALLEL'
  stage1.status = 'REGULAR'
  stage1.state = 'OPEN'
  stage1.compliance = 'ONTIME'
  stage1.direct_successor = 'NONE'
  stage1.children = ['ch1', 'ch2', 'ch3']

  //Setting up the perspective
  var eGSM = new EgsmModel()
  var bpmn = new BpmnModel('pers1')
  eGSM.model_roots.push('parent')
  eGSM.stages.set('parent', stage1)
  eGSM.stages.set('ch1', ch1)
  eGSM.stages.set('ch2', ch2)
  eGSM.stages.set('ch3', ch3)
  var pers1 = new ProcessPerspective('pers-1')
  pers1.egsm_model = eGSM
  pers1.bpmn_model = bpmn

  var expected = [new MultiExecutionDeviation('ch1')]
  var data = pers1.analyze()
  console.log(data)
  expect(data).toEqual(expected)
})


test('PARALLEL - Multi-executing more than one stages - parent should be closed', async () => {
  //Children stages
  var ch1 = new EgsmStage('ch1', 'ch1', 'parent', 'EXCEPTION', '')
  ch1.type = 'ACTIVITY'
  ch1.direct_successor = 'NA'
  ch1.status = 'REGULAR'
  ch1.state = 'CLOSED'
  ch1.compliance = 'OUTOFORDER'
  var ch2 = new EgsmStage('ch2', 'ch2', 'parent', 'EXCEPTION', '')
  ch2.type = 'ACTIVITY'
  ch2.direct_successor = 'NA'
  ch2.status = 'REGULAR'
  ch2.state = 'CLOSED'
  ch2.compliance = 'OUTOFORDER'
  var ch3 = new EgsmStage('ch3', 'ch3', 'parent', 'EXCEPTION', '')
  ch3.type = 'ACTIVITY'
  ch3.direct_successor = 'NA'
  ch3.status = 'REGULAR'
  ch3.state = 'CLOSED'
  ch3.compliance = 'ONTIME'

  //Parent stage
  var stage1 = new EgsmStage('parent', 'parent', 'NA', 'EXCEPTION', '')
  stage1.type = 'PARALLEL'
  stage1.status = 'REGULAR'
  stage1.state = 'CLOSED'
  stage1.compliance = 'ONTIME'
  stage1.direct_successor = 'NONE'
  stage1.children = ['ch1', 'ch2', 'ch3']
  stage1.propagateCondition('SHOULD_BE_CLOSED')

  //Setting up the perspective
  var eGSM = new EgsmModel()
  var bpmn = new BpmnModel('pers1')
  eGSM.model_roots.push('parent')
  eGSM.stages.set('parent', stage1)
  eGSM.stages.set('ch1', ch1)
  eGSM.stages.set('ch2', ch2)
  eGSM.stages.set('ch3', ch3)
  var pers1 = new ProcessPerspective('pers-1')
  pers1.egsm_model = eGSM
  pers1.bpmn_model = bpmn

  var expected = [new MultiExecutionDeviation('ch1'),
  new MultiExecutionDeviation('ch2')]
  var data = pers1.analyze()
  console.log(data)
  expect(data).toEqual(expected)
})

test('PARALLEL - Multi-executing more than one stages - parent should not be closed yet', async () => {
  //Children stages
  var ch1 = new EgsmStage('ch1', 'ch1', 'parent', 'EXCEPTION', '')
  ch1.type = 'ACTIVITY'
  ch1.direct_successor = 'NA'
  ch1.status = 'REGULAR'
  ch1.state = 'CLOSED'
  ch1.compliance = 'OUTOFORDER'
  var ch2 = new EgsmStage('ch2', 'ch2', 'parent', 'EXCEPTION', '')
  ch2.type = 'ACTIVITY'
  ch2.direct_successor = 'NA'
  ch2.status = 'REGULAR'
  ch2.state = 'CLOSED'
  ch2.compliance = 'OUTOFORDER'
  var ch3 = new EgsmStage('ch3', 'ch3', 'parent', 'EXCEPTION', '')
  ch3.type = 'ACTIVITY'
  ch3.direct_successor = 'NA'
  ch3.status = 'REGULAR'
  ch3.state = 'CLOSED'
  ch3.compliance = 'ONTIME'

  //Parent stage
  var stage1 = new EgsmStage('parent', 'parent', 'NA', 'EXCEPTION', '')
  stage1.type = 'PARALLEL'
  stage1.status = 'REGULAR'
  stage1.state = 'OPEN'
  stage1.compliance = 'ONTIME'
  stage1.direct_successor = 'NONE'
  stage1.children = ['ch1', 'ch2', 'ch3']

  //Setting up the perspective
  var eGSM = new EgsmModel()
  var bpmn = new BpmnModel('pers1')
  eGSM.model_roots.push('parent')
  eGSM.stages.set('parent', stage1)
  eGSM.stages.set('ch1', ch1)
  eGSM.stages.set('ch2', ch2)
  eGSM.stages.set('ch3', ch3)
  var pers1 = new ProcessPerspective('pers-1')
  pers1.egsm_model = eGSM
  pers1.bpmn_model = bpmn

  var expected = [new MultiExecutionDeviation('ch1'),
  new MultiExecutionDeviation('ch2')]
  var data = pers1.analyze()
  console.log(data)
  expect(data).toEqual(expected)
})


//Exclusive block tests
test('EXCLUSIVE - Executing and incorrect branch', async () => {
  //Children stages
  var ch1 = new EgsmStage('ch1', 'ch1', 'parent', 'EXCEPTION', '')
  ch1.type = 'ACTIVITY'
  ch1.direct_successor = 'NA'
  ch1.status = 'REGULAR'
  ch1.state = 'UNOPENED'
  ch1.compliance = 'ONTIME'
  var ch2 = new EgsmStage('ch2', 'ch2', 'parent', 'EXCEPTION', '')
  ch2.type = 'ACTIVITY'
  ch2.direct_successor = 'NA'
  ch2.status = 'REGULAR'
  ch2.state = 'CLOSED'
  ch2.compliance = 'OUTOFORDER'
  var ch3 = new EgsmStage('ch3', 'ch3', 'parent', 'EXCEPTION', '')
  ch3.type = 'ACTIVITY'
  ch3.direct_successor = 'NA'
  ch3.status = 'REGULAR'
  ch3.state = 'UNOPENED'
  ch3.compliance = 'ONTIME'

  //Parent stage
  var stage1 = new EgsmStage('parent', 'parent', 'NA', 'EXCEPTION', '')
  stage1.type = 'EXCLUSIVE'
  stage1.status = 'REGULAR'
  stage1.state = 'OPEN'
  stage1.compliance = 'ONTIME'
  stage1.direct_successor = 'NONE'
  stage1.children = ['ch1', 'ch2', 'ch3']

  //Setting up the perspective
  var eGSM = new EgsmModel()
  var bpmn = new BpmnModel('pers1')
  eGSM.model_roots.push('parent')
  eGSM.stages.set('parent', stage1)
  eGSM.stages.set('ch1', ch1)
  eGSM.stages.set('ch2', ch2)
  eGSM.stages.set('ch3', ch3)
  var pers1 = new ProcessPerspective('pers-1')
  pers1.egsm_model = eGSM
  pers1.bpmn_model = bpmn

  var expected = [new IncorrectBranchDeviation('ch2')]
  var data = pers1.analyze()
  console.log(data)
  expect(data).toEqual(expected)
})

test('EXCLUSIVE - Partially executing the correct branch - parent should be closed', async () => {
  //Children stages
  var ch1 = new EgsmStage('ch1', 'ch1', 'parent', 'EXCEPTION', '')
  ch1.type = 'ACTIVITY'
  ch1.direct_successor = 'NA'
  ch1.status = 'REGULAR'
  ch1.state = 'OPEN'
  ch1.compliance = 'ONTIME'
  var ch2 = new EgsmStage('ch2', 'ch2', 'parent', 'EXCEPTION', '')
  ch2.type = 'ACTIVITY'
  ch2.direct_successor = 'NA'
  ch2.status = 'REGULAR'
  ch2.state = 'UNOPENED'
  ch2.compliance = 'ONTIME'
  var ch3 = new EgsmStage('ch3', 'ch3', 'parent', 'EXCEPTION', '')
  ch3.type = 'ACTIVITY'
  ch3.direct_successor = 'NA'
  ch3.status = 'REGULAR'
  ch3.state = 'UNOPENED'
  ch3.compliance = 'ONTIME'

  //Parent stage
  var stage1 = new EgsmStage('parent', 'parent', 'NA', 'EXCEPTION', '')
  stage1.type = 'EXCLUSIVE'
  stage1.status = 'REGULAR'
  stage1.state = 'OPEN'
  stage1.compliance = 'ONTIME'
  stage1.direct_successor = 'NONE'
  stage1.children = ['ch1', 'ch2', 'ch3']
  stage1.propagateCondition('SHOULD_BE_CLOSED')

  //Setting up the perspective
  var eGSM = new EgsmModel()
  var bpmn = new BpmnModel('pers1')
  eGSM.model_roots.push('parent')
  eGSM.stages.set('parent', stage1)
  eGSM.stages.set('ch1', ch1)
  eGSM.stages.set('ch2', ch2)
  eGSM.stages.set('ch3', ch3)
  var pers1 = new ProcessPerspective('pers-1')
  pers1.egsm_model = eGSM
  pers1.bpmn_model = bpmn

  var expected = [new IncompleteDeviation('ch1')]
  var data = pers1.analyze()
  console.log(data)
  expect(data).toEqual(expected)
})

test('EXCLUSIVE - Partially executing the correct branch - parent should not be closed', async () => {
  //Children stages
  var ch1 = new EgsmStage('ch1', 'ch1', 'parent', 'EXCEPTION', '')
  ch1.type = 'ACTIVITY'
  ch1.direct_successor = 'NA'
  ch1.status = 'REGULAR'
  ch1.state = 'OPEN'
  ch1.compliance = 'ONTIME'
  var ch2 = new EgsmStage('ch2', 'ch2', 'parent', 'EXCEPTION', '')
  ch2.type = 'ACTIVITY'
  ch2.direct_successor = 'NA'
  ch2.status = 'REGULAR'
  ch2.state = 'UNOPENED'
  ch2.compliance = 'ONTIME'
  var ch3 = new EgsmStage('ch3', 'ch3', 'parent', 'EXCEPTION', '')
  ch3.type = 'ACTIVITY'
  ch3.direct_successor = 'NA'
  ch3.status = 'REGULAR'
  ch3.state = 'UNOPENED'
  ch3.compliance = 'ONTIME'

  //Parent stage
  var stage1 = new EgsmStage('parent', 'parent', 'NA', 'EXCEPTION', '')
  stage1.type = 'EXCLUSIVE'
  stage1.status = 'REGULAR'
  stage1.state = 'OPEN'
  stage1.compliance = 'ONTIME'
  stage1.direct_successor = 'NONE'
  stage1.children = ['ch1', 'ch2', 'ch3']

  //Setting up the perspective
  var eGSM = new EgsmModel()
  var bpmn = new BpmnModel('pers1')
  eGSM.model_roots.push('parent')
  eGSM.stages.set('parent', stage1)
  eGSM.stages.set('ch1', ch1)
  eGSM.stages.set('ch2', ch2)
  eGSM.stages.set('ch3', ch3)
  var pers1 = new ProcessPerspective('pers-1')
  pers1.egsm_model = eGSM
  pers1.bpmn_model = bpmn

  var expected = []
  var data = pers1.analyze()
  console.log(data)
  expect(data).toEqual(expected)
})

test('EXCLUSIVE - Partially executing an incorrect branch - parent should be closed', async () => {
  //Children stages
  var ch1 = new EgsmStage('ch1', 'ch1', 'parent', 'EXCEPTION', '')
  ch1.type = 'ACTIVITY'
  ch1.direct_successor = 'NA'
  ch1.status = 'REGULAR'
  ch1.state = 'UNOPENED'
  ch1.compliance = 'SKIPPED'
  var ch2 = new EgsmStage('ch2', 'ch2', 'parent', 'EXCEPTION', '')
  ch2.type = 'ACTIVITY'
  ch2.direct_successor = 'NA'
  ch2.status = 'REGULAR'
  ch2.state = 'OPEN'
  ch2.compliance = 'ONTIME'
  var ch3 = new EgsmStage('ch3', 'ch3', 'parent', 'EXCEPTION', '')
  ch3.type = 'ACTIVITY'
  ch3.direct_successor = 'NA'
  ch3.status = 'REGULAR'
  ch3.state = 'UNOPENED'
  ch3.compliance = 'ONTIME'

  //Parent stage
  var stage1 = new EgsmStage('parent', 'parent', 'NA', 'EXCEPTION', '')
  stage1.type = 'EXCLUSIVE'
  stage1.status = 'REGULAR'
  stage1.state = 'OPEN'
  stage1.compliance = 'ONTIME'
  stage1.direct_successor = 'NONE'
  stage1.children = ['ch1', 'ch2', 'ch3']
  stage1.propagateCondition('SHOULD_BE_CLOSED')

  //Setting up the perspective
  var eGSM = new EgsmModel()
  var bpmn = new BpmnModel('pers1')
  eGSM.model_roots.push('parent')
  eGSM.stages.set('parent', stage1)
  eGSM.stages.set('ch1', ch1)
  eGSM.stages.set('ch2', ch2)
  eGSM.stages.set('ch3', ch3)
  var pers1 = new ProcessPerspective('pers-1')
  pers1.egsm_model = eGSM
  pers1.bpmn_model = bpmn

  var expected = [new IncompleteDeviation('ch2'), new SkipDeviation(['ch1'], 'NA')]
  var data = pers1.analyze()
  console.log(data)
  expect(data).toEqual(expected)
})

test('EXCLUSIVE - Partially executing an incorrect branch - parent should not be closed', async () => {
  //Children stages
  var ch1 = new EgsmStage('ch1', 'ch1', 'parent', 'EXCEPTION', '')
  ch1.type = 'ACTIVITY'
  ch1.direct_successor = 'NA'
  ch1.status = 'REGULAR'
  ch1.state = 'UNOPENED'
  ch1.compliance = 'SKIPPED'
  var ch2 = new EgsmStage('ch2', 'ch2', 'parent', 'EXCEPTION', '')
  ch2.type = 'ACTIVITY'
  ch2.direct_successor = 'NA'
  ch2.status = 'REGULAR'
  ch2.state = 'OPEN'
  ch2.compliance = 'ONTIME'
  var ch3 = new EgsmStage('ch3', 'ch3', 'parent', 'EXCEPTION', '')
  ch3.type = 'ACTIVITY'
  ch3.direct_successor = 'NA'
  ch3.status = 'REGULAR'
  ch3.state = 'UNOPENED'
  ch3.compliance = 'ONTIME'

  //Parent stage
  var stage1 = new EgsmStage('parent', 'parent', 'NA', 'EXCEPTION', '')
  stage1.type = 'EXCLUSIVE'
  stage1.status = 'REGULAR'
  stage1.state = 'OPEN'
  stage1.compliance = 'ONTIME'
  stage1.direct_successor = 'NONE'
  stage1.children = ['ch1', 'ch2', 'ch3']

  //Setting up the perspective
  var eGSM = new EgsmModel()
  var bpmn = new BpmnModel('pers1')
  eGSM.model_roots.push('parent')
  eGSM.stages.set('parent', stage1)
  eGSM.stages.set('ch1', ch1)
  eGSM.stages.set('ch2', ch2)
  eGSM.stages.set('ch3', ch3)
  var pers1 = new ProcessPerspective('pers-1')
  pers1.egsm_model = eGSM
  pers1.bpmn_model = bpmn

  var expected = [new SkipDeviation(['ch1'], 'NA')]
  var data = pers1.analyze()
  console.log(data)
  expect(data).toEqual(expected)
})

test('EXCLUSIVE - Partially executing a correct branch and executing and incorrect one - parent should not be closed', async () => {
  //Children stages
  var ch1 = new EgsmStage('ch1', 'ch1', 'parent', 'EXCEPTION', '')
  ch1.type = 'ACTIVITY'
  ch1.direct_successor = 'NA'
  ch1.status = 'REGULAR'
  ch1.state = 'OPEN'
  ch1.compliance = 'ONTIME'
  var ch2 = new EgsmStage('ch2', 'ch2', 'parent', 'EXCEPTION', '')
  ch2.type = 'ACTIVITY'
  ch2.direct_successor = 'NA'
  ch2.status = 'REGULAR'
  ch2.state = 'CLOSED'
  ch2.compliance = 'OUTOFORDER'
  var ch3 = new EgsmStage('ch3', 'ch3', 'parent', 'EXCEPTION', '')
  ch3.type = 'ACTIVITY'
  ch3.direct_successor = 'NA'
  ch3.status = 'REGULAR'
  ch3.state = 'UNOPENED'
  ch3.compliance = 'ONTIME'

  //Parent stage
  var stage1 = new EgsmStage('parent', 'parent', 'NA', 'EXCEPTION', '')
  stage1.type = 'EXCLUSIVE'
  stage1.status = 'REGULAR'
  stage1.state = 'OPEN'
  stage1.compliance = 'ONTIME'
  stage1.direct_successor = 'NONE'
  stage1.children = ['ch1', 'ch2', 'ch3']

  //Setting up the perspective
  var eGSM = new EgsmModel()
  var bpmn = new BpmnModel('pers1')
  eGSM.model_roots.push('parent')
  eGSM.stages.set('parent', stage1)
  eGSM.stages.set('ch1', ch1)
  eGSM.stages.set('ch2', ch2)
  eGSM.stages.set('ch3', ch3)
  var pers1 = new ProcessPerspective('pers-1')
  pers1.egsm_model = eGSM
  pers1.bpmn_model = bpmn

  var expected = [new IncorrectBranchDeviation('ch2')]
  var data = pers1.analyze()
  console.log(data)
  expect(data).toEqual(expected)
})

test('EXCLUSIVE - Partially executing a correct branch and executing and incorrect one - parent should be closed', async () => {
  //Children stages
  var ch1 = new EgsmStage('ch1', 'ch1', 'parent', 'EXCEPTION', '')
  ch1.type = 'ACTIVITY'
  ch1.direct_successor = 'NA'
  ch1.status = 'REGULAR'
  ch1.state = 'OPEN'
  ch1.compliance = 'ONTIME'
  var ch2 = new EgsmStage('ch2', 'ch2', 'parent', 'EXCEPTION', '')
  ch2.type = 'ACTIVITY'
  ch2.direct_successor = 'NA'
  ch2.status = 'REGULAR'
  ch2.state = 'CLOSED'
  ch2.compliance = 'OUTOFORDER'
  var ch3 = new EgsmStage('ch3', 'ch3', 'parent', 'EXCEPTION', '')
  ch3.type = 'ACTIVITY'
  ch3.direct_successor = 'NA'
  ch3.status = 'REGULAR'
  ch3.state = 'UNOPENED'
  ch3.compliance = 'ONTIME'

  //Parent stage
  var stage1 = new EgsmStage('parent', 'parent', 'NA', 'EXCEPTION', '')
  stage1.type = 'EXCLUSIVE'
  stage1.status = 'REGULAR'
  stage1.state = 'OPEN'
  stage1.compliance = 'ONTIME'
  stage1.direct_successor = 'NONE'
  stage1.children = ['ch1', 'ch2', 'ch3']
  stage1.propagateCondition('SHOULD_BE_CLOSED')

  //Setting up the perspective
  var eGSM = new EgsmModel()
  var bpmn = new BpmnModel('pers1')
  eGSM.model_roots.push('parent')
  eGSM.stages.set('parent', stage1)
  eGSM.stages.set('ch1', ch1)
  eGSM.stages.set('ch2', ch2)
  eGSM.stages.set('ch3', ch3)
  var pers1 = new ProcessPerspective('pers-1')
  pers1.egsm_model = eGSM
  pers1.bpmn_model = bpmn

  var expected = [new IncompleteDeviation('ch1'), new IncorrectBranchDeviation('ch2')]
  var data = pers1.analyze()
  console.log(data)
  expect(data).toEqual(expected)
})

test('EXCLUSIVE - Partially executing an incorrect branch and executing the correct one - parent should be closed', async () => {
  //Children stages
  var ch1 = new EgsmStage('ch1', 'ch1', 'parent', 'EXCEPTION', '')
  ch1.type = 'ACTIVITY'
  ch1.direct_successor = 'NA'
  ch1.status = 'REGULAR'
  ch1.state = 'CLOSED'
  ch1.compliance = 'ONTIME'
  var ch2 = new EgsmStage('ch2', 'ch2', 'parent', 'EXCEPTION', '')
  ch2.type = 'ACTIVITY'
  ch2.direct_successor = 'NA'
  ch2.status = 'REGULAR'
  ch2.state = 'OPEN'
  ch2.compliance = 'OUTOFORDER'
  var ch3 = new EgsmStage('ch3', 'ch3', 'parent', 'EXCEPTION', '')
  ch3.type = 'ACTIVITY'
  ch3.direct_successor = 'NA'
  ch3.status = 'REGULAR'
  ch3.state = 'UNOPENED'
  ch3.compliance = 'ONTIME'

  //Parent stage
  var stage1 = new EgsmStage('parent', 'parent', 'NA', 'EXCEPTION', '')
  stage1.type = 'EXCLUSIVE'
  stage1.status = 'REGULAR'
  stage1.state = 'OPEN'
  stage1.compliance = 'ONTIME'
  stage1.direct_successor = 'NONE'
  stage1.children = ['ch1', 'ch2', 'ch3']
  stage1.propagateCondition('SHOULD_BE_CLOSED')

  //Setting up the perspective
  var eGSM = new EgsmModel()
  var bpmn = new BpmnModel('pers1')
  eGSM.model_roots.push('parent')
  eGSM.stages.set('parent', stage1)
  eGSM.stages.set('ch1', ch1)
  eGSM.stages.set('ch2', ch2)
  eGSM.stages.set('ch3', ch3)
  var pers1 = new ProcessPerspective('pers-1')
  pers1.egsm_model = eGSM
  pers1.bpmn_model = bpmn

  var expected = [new IncompleteDeviation('ch2'), new IncorrectBranchDeviation('ch2')]
  var data = pers1.analyze()
  console.log(data)
  expect(data).toEqual(expected)
})

test('EXCLUSIVE - Partially executing a correct branch and executing and incorrect one - parent should be closed', async () => {
  //Children stages
  var ch1 = new EgsmStage('ch1', 'ch1', 'parent', 'EXCEPTION', '')
  ch1.type = 'ACTIVITY'
  ch1.direct_successor = 'NA'
  ch1.status = 'REGULAR'
  ch1.state = 'OPEN'
  ch1.compliance = 'ONTIME'
  var ch2 = new EgsmStage('ch2', 'ch2', 'parent', 'EXCEPTION', '')
  ch2.type = 'ACTIVITY'
  ch2.direct_successor = 'NA'
  ch2.status = 'REGULAR'
  ch2.state = 'CLOSED'
  ch2.compliance = 'OUTOFORDER'
  var ch3 = new EgsmStage('ch3', 'ch3', 'parent', 'EXCEPTION', '')
  ch3.type = 'ACTIVITY'
  ch3.direct_successor = 'NA'
  ch3.status = 'REGULAR'
  ch3.state = 'UNOPENED'
  ch3.compliance = 'ONTIME'

  //Parent stage
  var stage1 = new EgsmStage('parent', 'parent', 'NA', 'EXCEPTION', '')
  stage1.type = 'EXCLUSIVE'
  stage1.status = 'REGULAR'
  stage1.state = 'OPEN'
  stage1.compliance = 'ONTIME'
  stage1.direct_successor = 'NONE'
  stage1.children = ['ch1', 'ch2', 'ch3']
  stage1.propagateCondition('SHOULD_BE_CLOSED')

  //Setting up the perspective
  var eGSM = new EgsmModel()
  var bpmn = new BpmnModel('pers1')
  eGSM.model_roots.push('parent')
  eGSM.stages.set('parent', stage1)
  eGSM.stages.set('ch1', ch1)
  eGSM.stages.set('ch2', ch2)
  eGSM.stages.set('ch3', ch3)
  var pers1 = new ProcessPerspective('pers-1')
  pers1.egsm_model = eGSM
  pers1.bpmn_model = bpmn

  var expected = [new IncompleteDeviation('ch1'), new IncorrectBranchDeviation('ch2')]
  var data = pers1.analyze()
  console.log(data)
  expect(data).toEqual(expected)
})

test('EXCLUSIVE - Partially executing an incorrect branch and executing the correct one - parent should not be closed', async () => {
  //Children stages
  var ch1 = new EgsmStage('ch1', 'ch1', 'parent', 'EXCEPTION', '')
  ch1.type = 'ACTIVITY'
  ch1.direct_successor = 'NA'
  ch1.status = 'REGULAR'
  ch1.state = 'CLOSED'
  ch1.compliance = 'ONTIME'
  var ch2 = new EgsmStage('ch2', 'ch2', 'parent', 'EXCEPTION', '')
  ch2.type = 'ACTIVITY'
  ch2.direct_successor = 'NA'
  ch2.status = 'REGULAR'
  ch2.state = 'OPEN'
  ch2.compliance = 'OUTOFORDER'
  var ch3 = new EgsmStage('ch3', 'ch3', 'parent', 'EXCEPTION', '')
  ch3.type = 'ACTIVITY'
  ch3.direct_successor = 'NA'
  ch3.status = 'REGULAR'
  ch3.state = 'UNOPENED'
  ch3.compliance = 'ONTIME'

  //Parent stage
  var stage1 = new EgsmStage('parent', 'parent', 'NA', 'EXCEPTION', '')
  stage1.type = 'EXCLUSIVE'
  stage1.status = 'REGULAR'
  stage1.state = 'OPEN'
  stage1.compliance = 'ONTIME'
  stage1.direct_successor = 'NONE'
  stage1.children = ['ch1', 'ch2', 'ch3']

  //Setting up the perspective
  var eGSM = new EgsmModel()
  var bpmn = new BpmnModel('pers1')
  eGSM.model_roots.push('parent')
  eGSM.stages.set('parent', stage1)
  eGSM.stages.set('ch1', ch1)
  eGSM.stages.set('ch2', ch2)
  eGSM.stages.set('ch3', ch3)
  var pers1 = new ProcessPerspective('pers-1')
  pers1.egsm_model = eGSM
  pers1.bpmn_model = bpmn

  var expected = [new IncorrectBranchDeviation('ch2')]
  var data = pers1.analyze()
  console.log(data)
  expect(data).toEqual(expected)
})

test('EXCLUSIVE - Overlapped executions', async () => {
  //Children stages
  var ch1 = new EgsmStage('ch1', 'ch1', 'parent', 'EXCEPTION', '')
  ch1.type = 'ACTIVITY'
  ch1.direct_successor = 'NA'
  ch1.status = 'REGULAR'
  ch1.state = 'CLOSED'
  ch1.compliance = 'OUTOFORDER'
  var ch2 = new EgsmStage('ch2', 'ch2', 'parent', 'EXCEPTION', '')
  ch2.type = 'ACTIVITY'
  ch2.direct_successor = 'NA'
  ch2.status = 'REGULAR'
  ch2.state = 'OPEN'
  ch2.compliance = 'OUTOFORDER'
  var ch3 = new EgsmStage('ch3', 'ch3', 'parent', 'EXCEPTION', '')
  ch3.type = 'ACTIVITY'
  ch3.direct_successor = 'NA'
  ch3.status = 'REGULAR'
  ch3.state = 'UNOPENED'
  ch3.compliance = 'ONTIME'

  //Parent stage
  var stage1 = new EgsmStage('parent', 'parent', 'NA', 'EXCEPTION', '')
  stage1.type = 'EXCLUSIVE'
  stage1.status = 'REGULAR'
  stage1.state = 'OPEN'
  stage1.compliance = 'ONTIME'
  stage1.direct_successor = 'NONE'
  stage1.children = ['ch1', 'ch2', 'ch3']

  //Setting up the perspective
  var eGSM = new EgsmModel()
  var bpmn = new BpmnModel('pers1')
  eGSM.model_roots.push('parent')
  eGSM.stages.set('parent', stage1)
  eGSM.stages.set('ch1', ch1)
  eGSM.stages.set('ch2', ch2)
  eGSM.stages.set('ch3', ch3)
  var pers1 = new ProcessPerspective('pers-1')
  pers1.egsm_model = eGSM
  pers1.bpmn_model = bpmn

  var expected = [new IncorrectBranchDeviation('ch1'), new IncorrectBranchDeviation('ch2')]
  var data = pers1.analyze()
  console.log(data)
  expect(data).toEqual(expected)
})

//Inclusive Block tests
test('INCLUSIVE - Executing one of the correct branches twice', async () => {
  //Children stages
  var ch1 = new EgsmStage('ch1', 'ch1', 'parent', 'EXCEPTION', '')
  ch1.type = 'ACTIVITY'
  ch1.direct_successor = 'NA'
  ch1.status = 'REGULAR'
  ch1.state = 'CLOSED'
  ch1.compliance = 'OUTOFORDER'
  var ch2 = new EgsmStage('ch2', 'ch2', 'parent', 'EXCEPTION', '')
  ch2.type = 'ACTIVITY'
  ch2.direct_successor = 'NA'
  ch2.status = 'REGULAR'
  ch2.state = 'CLOSED'
  ch2.compliance = 'ONTIME'
  var ch3 = new EgsmStage('ch3', 'ch3', 'parent', 'EXCEPTION', '')
  ch3.type = 'ACTIVITY'
  ch3.direct_successor = 'NA'
  ch3.status = 'REGULAR'
  ch3.state = 'UNOPENED'
  ch3.compliance = 'ONTIME'

  //Parent stage
  var stage1 = new EgsmStage('parent', 'parent', 'NA', 'EXCEPTION', '')
  stage1.type = 'INCLUSIVE'
  stage1.status = 'REGULAR'
  stage1.state = 'OPEN'
  stage1.compliance = 'ONTIME'
  stage1.direct_successor = 'NONE'
  stage1.children = ['ch1', 'ch2', 'ch3']

  //Setting up the perspective
  var eGSM = new EgsmModel()
  var bpmn = new BpmnModel('pers1')
  eGSM.model_roots.push('parent')
  eGSM.stages.set('parent', stage1)
  eGSM.stages.set('ch1', ch1)
  eGSM.stages.set('ch2', ch2)
  eGSM.stages.set('ch3', ch3)
  var pers1 = new ProcessPerspective('pers-1')
  pers1.egsm_model = eGSM
  pers1.bpmn_model = bpmn

  var expected = [new IncorrectBranchDeviation('ch1')]
  var data = pers1.analyze()
  console.log(data)
  expect(data).toEqual(expected)
})

test('INCLUSIVE - Executing one of the correct branches partially only - parent should be closed', async () => {
  //Children stages
  var ch1 = new EgsmStage('ch1', 'ch1', 'parent', 'EXCEPTION', '')
  ch1.type = 'ACTIVITY'
  ch1.direct_successor = 'NA'
  ch1.status = 'REGULAR'
  ch1.state = 'OPEN'
  ch1.compliance = 'ONTIME'
  var ch2 = new EgsmStage('ch2', 'ch2', 'parent', 'EXCEPTION', '')
  ch2.type = 'ACTIVITY'
  ch2.direct_successor = 'NA'
  ch2.status = 'REGULAR'
  ch2.state = 'CLOSED'
  ch2.compliance = 'ONTIME'
  var ch3 = new EgsmStage('ch3', 'ch3', 'parent', 'EXCEPTION', '')
  ch3.type = 'ACTIVITY'
  ch3.direct_successor = 'NA'
  ch3.status = 'REGULAR'
  ch3.state = 'UNOPENED'
  ch3.compliance = 'ONTIME'

  //Parent stage
  var stage1 = new EgsmStage('parent', 'parent', 'NA', 'EXCEPTION', '')
  stage1.type = 'INCLUSIVE'
  stage1.status = 'REGULAR'
  stage1.state = 'OPEN'
  stage1.compliance = 'ONTIME'
  stage1.direct_successor = 'NONE'
  stage1.children = ['ch1', 'ch2', 'ch3']
  stage1.propagateCondition('SHOULD_BE_CLOSED')

  //Setting up the perspective
  var eGSM = new EgsmModel()
  var bpmn = new BpmnModel('pers1')
  eGSM.model_roots.push('parent')
  eGSM.stages.set('parent', stage1)
  eGSM.stages.set('ch1', ch1)
  eGSM.stages.set('ch2', ch2)
  eGSM.stages.set('ch3', ch3)
  var pers1 = new ProcessPerspective('pers-1')
  pers1.egsm_model = eGSM
  pers1.bpmn_model = bpmn

  var expected = [new IncompleteDeviation('ch1')]
  var data = pers1.analyze()
  console.log(data)
  expect(data).toEqual(expected)
})

test('INCLUSIVE - Executing one of the correct branches partially only - parent should not be closed yet', async () => {
  //Children stages
  var ch1 = new EgsmStage('ch1', 'ch1', 'parent', 'EXCEPTION', '')
  ch1.type = 'ACTIVITY'
  ch1.direct_successor = 'NA'
  ch1.status = 'REGULAR'
  ch1.state = 'OPEN'
  ch1.compliance = 'ONTIME'
  var ch2 = new EgsmStage('ch2', 'ch2', 'parent', 'EXCEPTION', '')
  ch2.type = 'ACTIVITY'
  ch2.direct_successor = 'NA'
  ch2.status = 'REGULAR'
  ch2.state = 'CLOSED'
  ch2.compliance = 'ONTIME'
  var ch3 = new EgsmStage('ch3', 'ch3', 'parent', 'EXCEPTION', '')
  ch3.type = 'ACTIVITY'
  ch3.direct_successor = 'NA'
  ch3.status = 'REGULAR'
  ch3.state = 'UNOPENED'
  ch3.compliance = 'ONTIME'

  //Parent stage
  var stage1 = new EgsmStage('parent', 'parent', 'NA', 'EXCEPTION', '')
  stage1.type = 'INCLUSIVE'
  stage1.status = 'REGULAR'
  stage1.state = 'OPEN'
  stage1.compliance = 'ONTIME'
  stage1.direct_successor = 'NONE'
  stage1.children = ['ch1', 'ch2', 'ch3']

  //Setting up the perspective
  var eGSM = new EgsmModel()
  var bpmn = new BpmnModel('pers1')
  eGSM.model_roots.push('parent')
  eGSM.stages.set('parent', stage1)
  eGSM.stages.set('ch1', ch1)
  eGSM.stages.set('ch2', ch2)
  eGSM.stages.set('ch3', ch3)
  var pers1 = new ProcessPerspective('pers-1')
  pers1.egsm_model = eGSM
  pers1.bpmn_model = bpmn

  var expected = []
  var data = pers1.analyze()
  console.log(data)
  expect(data).toEqual(expected)
})

test('INCLUSIVE - Executing unintended branch beside the correct ones', async () => {
  //Children stages
  var ch1 = new EgsmStage('ch1', 'ch1', 'parent', 'EXCEPTION', '')
  ch1.type = 'ACTIVITY'
  ch1.direct_successor = 'NA'
  ch1.status = 'REGULAR'
  ch1.state = 'CLOSED'
  ch1.compliance = 'ONTIME'
  var ch2 = new EgsmStage('ch2', 'ch2', 'parent', 'EXCEPTION', '')
  ch2.type = 'ACTIVITY'
  ch2.direct_successor = 'NA'
  ch2.status = 'REGULAR'
  ch2.state = 'CLOSED'
  ch2.compliance = 'ONTIME'
  var ch3 = new EgsmStage('ch3', 'ch3', 'parent', 'EXCEPTION', '')
  ch3.type = 'ACTIVITY'
  ch3.direct_successor = 'NA'
  ch3.status = 'REGULAR'
  ch3.state = 'CLOSED'
  ch3.compliance = 'OUTOFORDER'

  //Parent stage
  var stage1 = new EgsmStage('parent', 'parent', 'NA', 'EXCEPTION', '')
  stage1.type = 'INCLUSIVE'
  stage1.status = 'REGULAR'
  stage1.state = 'OPEN'
  stage1.compliance = 'ONTIME'
  stage1.direct_successor = 'NONE'
  stage1.children = ['ch1', 'ch2', 'ch3']

  //Setting up the perspective
  var eGSM = new EgsmModel()
  var bpmn = new BpmnModel('pers1')
  eGSM.model_roots.push('parent')
  eGSM.stages.set('parent', stage1)
  eGSM.stages.set('ch1', ch1)
  eGSM.stages.set('ch2', ch2)
  eGSM.stages.set('ch3', ch3)
  var pers1 = new ProcessPerspective('pers-1')
  pers1.egsm_model = eGSM
  pers1.bpmn_model = bpmn

  var expected = [new IncorrectBranchDeviation('ch3')]
  var data = pers1.analyze()
  console.log(data)
  expect(data).toEqual(expected)
})

test('INCLUSIVE - Executing multiple unintended branches beside the correct one', async () => {
  //Children stages
  var ch1 = new EgsmStage('ch1', 'ch1', 'parent', 'EXCEPTION', '')
  ch1.type = 'ACTIVITY'
  ch1.direct_successor = 'NA'
  ch1.status = 'REGULAR'
  ch1.state = 'CLOSED'
  ch1.compliance = 'ONTIME'
  var ch2 = new EgsmStage('ch2', 'ch2', 'parent', 'EXCEPTION', '')
  ch2.type = 'ACTIVITY'
  ch2.direct_successor = 'NA'
  ch2.status = 'REGULAR'
  ch2.state = 'CLOSED'
  ch2.compliance = 'OUTOFORDER'
  var ch3 = new EgsmStage('ch3', 'ch3', 'parent', 'EXCEPTION', '')
  ch3.type = 'ACTIVITY'
  ch3.direct_successor = 'NA'
  ch3.status = 'REGULAR'
  ch3.state = 'CLOSED'
  ch3.compliance = 'OUTOFORDER'

  //Parent stage
  var stage1 = new EgsmStage('parent', 'parent', 'NA', 'EXCEPTION', '')
  stage1.type = 'INCLUSIVE'
  stage1.status = 'REGULAR'
  stage1.state = 'OPEN'
  stage1.compliance = 'ONTIME'
  stage1.direct_successor = 'NONE'
  stage1.children = ['ch1', 'ch2', 'ch3']

  //Setting up the perspective
  var eGSM = new EgsmModel()
  var bpmn = new BpmnModel('pers1')
  eGSM.model_roots.push('parent')
  eGSM.stages.set('parent', stage1)
  eGSM.stages.set('ch1', ch1)
  eGSM.stages.set('ch2', ch2)
  eGSM.stages.set('ch3', ch3)
  var pers1 = new ProcessPerspective('pers-1')
  pers1.egsm_model = eGSM
  pers1.bpmn_model = bpmn

  var expected = [new IncorrectBranchDeviation('ch2'), new IncorrectBranchDeviation('ch3')]
  var data = pers1.analyze()
  console.log(data)
  expect(data).toEqual(expected)
})

test('ITERATION - Incorrect execution sequence - 1 stage', async () => {
  //Children stages
  var ch1 = new EgsmStage('ch1', 'ch1', 'parent', 'EXCEPTION', '')
  ch1.type = 'ACTIVITY'
  ch1.direct_successor = 'NA'
  ch1.status = 'REGULAR'
  ch1.state = 'CLOSED'
  ch1.compliance = 'OUTOFORDER'
  var ch2 = new EgsmStage('ch2', 'ch2', 'parent', 'EXCEPTION', '')
  ch2.type = 'ACTIVITY'
  ch2.direct_successor = 'NA'
  ch2.status = 'REGULAR'
  ch2.state = 'CLOSED'
  ch2.compliance = 'ONTIME'

  //Parent stage
  var stage1 = new EgsmStage('parent', 'parent', 'NA', 'EXCEPTION', '')
  stage1.type = 'ITERATION'
  stage1.status = 'REGULAR'
  stage1.state = 'OPEN'
  stage1.compliance = 'ONTIME'
  stage1.direct_successor = 'NONE'
  stage1.children = ['ch1', 'ch2']

  //Setting up the perspective
  var eGSM = new EgsmModel()
  var bpmn = new BpmnModel('pers1')
  eGSM.model_roots.push('parent')
  eGSM.stages.set('parent', stage1)
  eGSM.stages.set('ch1', ch1)
  eGSM.stages.set('ch2', ch2)
  var pers1 = new ProcessPerspective('pers-1')
  pers1.egsm_model = eGSM
  pers1.bpmn_model = bpmn

  var expected = [new IncorrectExecutionSequenceDeviation(['ch1'])]
  var data = pers1.analyze()
  console.log(data)
  expect(data).toEqual(expected)
})

test('ITERATION - Incorrect execution sequence - 2 stages', async () => {
  //Children stages
  var ch1 = new EgsmStage('ch1', 'ch1', 'parent', 'EXCEPTION', '')
  ch1.type = 'ACTIVITY'
  ch1.direct_successor = 'NA'
  ch1.status = 'REGULAR'
  ch1.state = 'CLOSED'
  ch1.compliance = 'OUTOFORDER'
  var ch2 = new EgsmStage('ch2', 'ch2', 'parent', 'EXCEPTION', '')
  ch2.type = 'ACTIVITY'
  ch2.direct_successor = 'NA'
  ch2.status = 'REGULAR'
  ch2.state = 'CLOSED'
  ch2.compliance = 'OUTOFORDER'

  //Parent stage
  var stage1 = new EgsmStage('parent', 'parent', 'NA', 'EXCEPTION', '')
  stage1.type = 'ITERATION'
  stage1.status = 'REGULAR'
  stage1.state = 'OPEN'
  stage1.compliance = 'ONTIME'
  stage1.direct_successor = 'NONE'
  stage1.children = ['ch1', 'ch2']

  //Setting up the perspective
  var eGSM = new EgsmModel()
  var bpmn = new BpmnModel('pers1')
  eGSM.model_roots.push('parent')
  eGSM.stages.set('parent', stage1)
  eGSM.stages.set('ch1', ch1)
  eGSM.stages.set('ch2', ch2)
  var pers1 = new ProcessPerspective('pers-1')
  pers1.egsm_model = eGSM
  pers1.bpmn_model = bpmn

  var expected = [new IncorrectExecutionSequenceDeviation(['ch1']), new IncorrectExecutionSequenceDeviation(['ch2'])]
  var data = pers1.analyze()
  console.log(data)
  expect(data).toEqual(expected)
})

test('ITERATION - Skipping A1', async () => {
  //Children stages
  var ch1 = new EgsmStage('ch1', 'ch1', 'parent', 'EXCEPTION', '')
  ch1.type = 'ACTIVITY'
  ch1.direct_successor = 'NA'
  ch1.status = 'REGULAR'
  ch1.state = 'CLOSED'
  ch1.compliance = 'SKIPPED'
  var ch2 = new EgsmStage('ch2', 'ch2', 'parent', 'EXCEPTION', '')
  ch2.type = 'ACTIVITY'
  ch2.direct_successor = 'NA'
  ch2.status = 'REGULAR'
  ch2.state = 'CLOSED'
  ch2.compliance = 'OUTOFORDER'

  //Parent stage
  var stage1 = new EgsmStage('parent', 'parent', 'NA', 'EXCEPTION', '')
  stage1.type = 'ITERATION'
  stage1.status = 'REGULAR'
  stage1.state = 'OPEN'
  stage1.compliance = 'ONTIME'
  stage1.direct_successor = 'NONE'
  stage1.children = ['ch1', 'ch2']

  //Setting up the perspective
  var eGSM = new EgsmModel()
  var bpmn = new BpmnModel('pers1')
  eGSM.model_roots.push('parent')
  eGSM.stages.set('parent', stage1)
  eGSM.stages.set('ch1', ch1)
  eGSM.stages.set('ch2', ch2)
  var pers1 = new ProcessPerspective('pers-1')
  pers1.egsm_model = eGSM
  pers1.bpmn_model = bpmn

  var expected = [new IncorrectExecutionSequenceDeviation(['ch2']), new SkipDeviation(['ch1'], 'NA')]
  var data = pers1.analyze()
  console.log(data)
  expect(data).toEqual(expected)
})

test('ITERATION - Incomplete execution of one stage - parent should not be executed yet', async () => {
  //Children stages
  var ch1 = new EgsmStage('ch1', 'ch1', 'parent', 'EXCEPTION', '')
  ch1.type = 'ACTIVITY'
  ch1.direct_successor = 'NA'
  ch1.status = 'REGULAR'
  ch1.state = 'OPEN'
  ch1.compliance = 'ONTIME'
  var ch2 = new EgsmStage('ch2', 'ch2', 'parent', 'EXCEPTION', '')
  ch2.type = 'ACTIVITY'
  ch2.direct_successor = 'NA'
  ch2.status = 'REGULAR'
  ch2.state = 'CLOSED'
  ch2.compliance = 'ONTIME'

  //Parent stage
  var stage1 = new EgsmStage('parent', 'parent', 'NA', 'EXCEPTION', '')
  stage1.type = 'ITERATION'
  stage1.status = 'REGULAR'
  stage1.state = 'OPEN'
  stage1.compliance = 'ONTIME'
  stage1.direct_successor = 'NONE'
  stage1.children = ['ch1', 'ch2']

  //Setting up the perspective
  var eGSM = new EgsmModel()
  var bpmn = new BpmnModel('pers1')
  eGSM.model_roots.push('parent')
  eGSM.stages.set('parent', stage1)
  eGSM.stages.set('ch1', ch1)
  eGSM.stages.set('ch2', ch2)
  var pers1 = new ProcessPerspective('pers-1')
  pers1.egsm_model = eGSM
  pers1.bpmn_model = bpmn

  var expected = []
  var data = pers1.analyze()
  console.log(data)
  expect(data).toEqual(expected)
})

test('ITERATION - Incomplete execution of 2 stages - parent should not be executed yet', async () => {
  //Children stages
  var ch1 = new EgsmStage('ch1', 'ch1', 'parent', 'EXCEPTION', '')
  ch1.type = 'ACTIVITY'
  ch1.direct_successor = 'NA'
  ch1.status = 'REGULAR'
  ch1.state = 'OPEN'
  ch1.compliance = 'ONTIME'
  var ch2 = new EgsmStage('ch2', 'ch2', 'parent', 'EXCEPTION', '')
  ch2.type = 'ACTIVITY'
  ch2.direct_successor = 'NA'
  ch2.status = 'REGULAR'
  ch2.state = 'OPEN'
  ch2.compliance = 'ONTIME'

  //Parent stage
  var stage1 = new EgsmStage('parent', 'parent', 'NA', 'EXCEPTION', '')
  stage1.type = 'ITERATION'
  stage1.status = 'REGULAR'
  stage1.state = 'OPEN'
  stage1.compliance = 'ONTIME'
  stage1.direct_successor = 'NONE'
  stage1.children = ['ch1', 'ch2']

  //Setting up the perspective
  var eGSM = new EgsmModel()
  var bpmn = new BpmnModel('pers1')
  eGSM.model_roots.push('parent')
  eGSM.stages.set('parent', stage1)
  eGSM.stages.set('ch1', ch1)
  eGSM.stages.set('ch2', ch2)
  var pers1 = new ProcessPerspective('pers-1')
  pers1.egsm_model = eGSM
  pers1.bpmn_model = bpmn

  var expected = []
  var data = pers1.analyze()
  console.log(data)
  expect(data).toEqual(expected)
})

test('ITERATION - Incomplete execution of one stage - parent should be executed', async () => {
  //Children stages
  var ch1 = new EgsmStage('ch1', 'ch1', 'parent', 'EXCEPTION', '')
  ch1.type = 'ACTIVITY'
  ch1.direct_successor = 'NA'
  ch1.status = 'REGULAR'
  ch1.state = 'OPEN'
  ch1.compliance = 'ONTIME'
  var ch2 = new EgsmStage('ch2', 'ch2', 'parent', 'EXCEPTION', '')
  ch2.type = 'ACTIVITY'
  ch2.direct_successor = 'NA'
  ch2.status = 'REGULAR'
  ch2.state = 'CLOSED'
  ch2.compliance = 'ONTIME'

  //Parent stage
  var stage1 = new EgsmStage('parent', 'parent', 'NA', 'EXCEPTION', '')
  stage1.type = 'ITERATION'
  stage1.status = 'REGULAR'
  stage1.state = 'OPEN'
  stage1.compliance = 'ONTIME'
  stage1.direct_successor = 'NONE'
  stage1.children = ['ch1', 'ch2']
  stage1.propagateCondition('SHOULD_BE_CLOSED')

  //Setting up the perspective
  var eGSM = new EgsmModel()
  var bpmn = new BpmnModel('pers1')
  eGSM.model_roots.push('parent')
  eGSM.stages.set('parent', stage1)
  eGSM.stages.set('ch1', ch1)
  eGSM.stages.set('ch2', ch2)
  var pers1 = new ProcessPerspective('pers-1')
  pers1.egsm_model = eGSM
  pers1.bpmn_model = bpmn

  var expected = [new IncompleteDeviation('ch1')]
  var data = pers1.analyze()
  console.log(data)
  expect(data).toEqual(expected)
})

test('ITERATION - Incomplete execution of 2 stages - parent should be executed', async () => {
  //Children stages
  var ch1 = new EgsmStage('ch1', 'ch1', 'parent', 'EXCEPTION', '')
  ch1.type = 'ACTIVITY'
  ch1.direct_successor = 'NA'
  ch1.status = 'REGULAR'
  ch1.state = 'OPEN'
  ch1.compliance = 'ONTIME'
  var ch2 = new EgsmStage('ch2', 'ch2', 'parent', 'EXCEPTION', '')
  ch2.type = 'ACTIVITY'
  ch2.direct_successor = 'NA'
  ch2.status = 'REGULAR'
  ch2.state = 'OPEN'
  ch2.compliance = 'ONTIME'

  //Parent stage
  var stage1 = new EgsmStage('parent', 'parent', 'NA', 'EXCEPTION', '')
  stage1.type = 'ITERATION'
  stage1.status = 'REGULAR'
  stage1.state = 'OPEN'
  stage1.compliance = 'ONTIME'
  stage1.direct_successor = 'NONE'
  stage1.children = ['ch1', 'ch2']
  stage1.propagateCondition('SHOULD_BE_CLOSED')

  //Setting up the perspective
  var eGSM = new EgsmModel()
  var bpmn = new BpmnModel('pers1')
  eGSM.model_roots.push('parent')
  eGSM.stages.set('parent', stage1)
  eGSM.stages.set('ch1', ch1)
  eGSM.stages.set('ch2', ch2)
  var pers1 = new ProcessPerspective('pers-1')
  pers1.egsm_model = eGSM
  pers1.bpmn_model = bpmn

  var expected = [new IncompleteDeviation('ch1'), new IncompleteDeviation('ch2')]
  var data = pers1.analyze()
  console.log(data)
  expect(data).toEqual(expected)
})


test('SEQUENCE&PARALLEL - Missing parallel stage execution', async () => {
  //Children stages
  var ch1 = new EgsmStage('ch1', 'ch1', 'parent', 'EXCEPTION', '')
  ch1.type = 'ACTIVITY'
  ch1.direct_successor = 'NA'
  ch1.status = 'REGULAR'
  ch1.state = 'CLOSED'
  ch1.compliance = 'ONTIME'
  var ch2 = new EgsmStage('ch2', 'ch2', 'parent', 'EXCEPTION', '')
  var ch3 = new EgsmStage('ch3', 'ch3', 'parent', 'EXCEPTION', '')
  ch3.type = 'ACTIVITY'
  ch3.direct_successor = 'ch2'
  ch3.status = 'REGULAR'
  ch3.state = 'CLOSED'
  ch3.compliance = 'OUTOFORDER'
  var ch4 = new EgsmStage('ch4', 'ch4', 'ch2', 'EXCEPTION', '')
  ch4.type = 'ACTIVITY'
  ch4.direct_successor = 'NA'
  ch4.status = 'REGULAR'
  ch4.state = 'OPEN'
  ch4.compliance = 'ONTIME'
  var ch5 = new EgsmStage('ch5', 'ch5', 'ch2', 'EXCEPTION', '')
  ch5.type = 'ACTIVITY'
  ch5.direct_successor = 'NA'
  ch5.status = 'REGULAR'
  ch5.state = 'CLOSED'
  ch5.compliance = 'ONTIME'

  //Parent stage
  var stage1 = new EgsmStage('parent', 'parent', 'NA', 'EXCEPTION', '')
  stage1.type = 'SEQUENCE'
  stage1.status = 'REGULAR'
  stage1.state = 'OPEN'
  stage1.compliance = 'ONTIME'
  stage1.direct_successor = 'NONE'
  stage1.children = ['ch1', 'ch2', 'ch3']
  stage1.propagateCondition('SHOULD_BE_CLOSED')

  ch2.type = 'PARALLEL'
  ch2.status = 'REGULAR'
  ch2.state = 'OPEN'
  ch2.compliance = 'ONTIME'
  ch2.direct_successor = 'ch1'
  ch2.children = ['ch4', 'ch5']

  //Setting up the perspective
  var eGSM = new EgsmModel()
  var bpmn = new BpmnModel('pers1')
  eGSM.model_roots.push('parent')
  eGSM.stages.set('parent', stage1)
  eGSM.stages.set('ch1', ch1)
  eGSM.stages.set('ch2', ch2)
  eGSM.stages.set('ch3', ch3)
  eGSM.stages.set('ch4', ch4)
  eGSM.stages.set('ch5', ch5)
  var pers1 = new ProcessPerspective('pers-1')
  pers1.egsm_model = eGSM
  pers1.bpmn_model = bpmn

  var expected = [new IncorrectExecutionSequenceDeviation(['ch3']), new IncompleteDeviation('ch2'), new IncompleteDeviation('ch4')]
  var data = pers1.analyze()
  console.log(data)
  expect(data).toEqual(expected)
})

test('SEQUENCE&PARALLEL - Incomplete parallel stage execution', async () => {
  //Children stages
  var ch1 = new EgsmStage('ch1', 'ch1', 'parent', 'EXCEPTION', '')
  ch1.type = 'ACTIVITY'
  ch1.direct_successor = 'NA'
  ch1.status = 'REGULAR'
  ch1.state = 'CLOSED'
  ch1.compliance = 'ONTIME'
  var ch2 = new EgsmStage('ch2', 'ch2', 'parent', 'EXCEPTION', '')
  var ch3 = new EgsmStage('ch3', 'ch3', 'parent', 'EXCEPTION', '')
  ch3.type = 'ACTIVITY'
  ch3.direct_successor = 'ch2'
  ch3.status = 'REGULAR'
  ch3.state = 'CLOSED'
  ch3.compliance = 'OUTOFORDER'
  var ch4 = new EgsmStage('ch4', 'ch4', 'ch2', 'EXCEPTION', '')
  ch4.type = 'ACTIVITY'
  ch4.direct_successor = 'NA'
  ch4.status = 'REGULAR'
  ch4.state = 'OPEN'
  ch4.compliance = 'ONTIME'
  var ch5 = new EgsmStage('ch5', 'ch5', 'ch2', 'EXCEPTION', '')
  ch5.type = 'ACTIVITY'
  ch5.direct_successor = 'NA'
  ch5.status = 'REGULAR'
  ch5.state = 'CLOSED'
  ch5.compliance = 'ONTIME'

  //Parent stage
  var stage1 = new EgsmStage('parent', 'parent', 'NA', 'EXCEPTION', '')
  stage1.type = 'SEQUENCE'
  stage1.status = 'REGULAR'
  stage1.state = 'OPEN'
  stage1.compliance = 'ONTIME'
  stage1.direct_successor = 'NONE'
  stage1.children = ['ch1', 'ch2', 'ch3']
  stage1.propagateCondition('SHOULD_BE_CLOSED')

  ch2.type = 'PARALLEL'
  ch2.status = 'REGULAR'
  ch2.state = 'OPEN'
  ch2.compliance = 'ONTIME'
  ch2.direct_successor = 'ch1'
  ch2.children = ['ch4', 'ch5']

  //Setting up the perspective
  var eGSM = new EgsmModel()
  var bpmn = new BpmnModel('pers1')
  eGSM.model_roots.push('parent')
  eGSM.stages.set('parent', stage1)
  eGSM.stages.set('ch1', ch1)
  eGSM.stages.set('ch2', ch2)
  eGSM.stages.set('ch3', ch3)
  eGSM.stages.set('ch4', ch4)
  eGSM.stages.set('ch5', ch5)
  var pers1 = new ProcessPerspective('pers-1')
  pers1.egsm_model = eGSM
  pers1.bpmn_model = bpmn

  var expected = [new IncorrectExecutionSequenceDeviation(['ch3']), new IncompleteDeviation('ch2'), new IncompleteDeviation('ch4')]
  var data = pers1.analyze()
  console.log(data)
  expect(data).toEqual(expected)
})

test('SEQUENCE&PARALLEL - Executing one parallel stage more than once', async () => {
  //Children stages
  var ch1 = new EgsmStage('ch1', 'ch1', 'parent', 'EXCEPTION', '')
  ch1.type = 'ACTIVITY'
  ch1.direct_successor = 'NA'
  ch1.status = 'REGULAR'
  ch1.state = 'CLOSED'
  ch1.compliance = 'ONTIME'
  var ch2 = new EgsmStage('ch2', 'ch2', 'parent', 'EXCEPTION', '')
  var ch3 = new EgsmStage('ch3', 'ch3', 'parent', 'EXCEPTION', '')
  ch3.type = 'ACTIVITY'
  ch3.direct_successor = 'ch2'
  ch3.status = 'REGULAR'
  ch3.state = 'CLOSED'
  ch3.compliance = 'ONTIME'
  var ch4 = new EgsmStage('ch4', 'ch4', 'ch2', 'EXCEPTION', '')
  ch4.type = 'ACTIVITY'
  ch4.direct_successor = 'NA'
  ch4.status = 'REGULAR'
  ch4.state = 'CLOSED'
  ch4.compliance = 'OUTOFORDER'
  var ch5 = new EgsmStage('ch5', 'ch5', 'ch2', 'EXCEPTION', '')
  ch5.type = 'ACTIVITY'
  ch5.direct_successor = 'NA'
  ch5.status = 'REGULAR'
  ch5.state = 'CLOSED'
  ch5.compliance = 'ONTIME'

  //Parent stage
  var stage1 = new EgsmStage('parent', 'parent', 'NA', 'EXCEPTION', '')
  stage1.type = 'SEQUENCE'
  stage1.status = 'REGULAR'
  stage1.state = 'CLOSED'
  stage1.compliance = 'ONTIME'
  stage1.direct_successor = 'NONE'
  stage1.children = ['ch1', 'ch2', 'ch3']
  stage1.propagateCondition('SHOULD_BE_CLOSED')

  ch2.type = 'PARALLEL'
  ch2.status = 'REGULAR'
  ch2.state = 'CLOSED'
  ch2.compliance = 'ONTIME'
  ch2.direct_successor = 'ch1'
  ch2.children = ['ch4', 'ch5']

  //Setting up the perspective
  var eGSM = new EgsmModel()
  var bpmn = new BpmnModel('pers1')
  eGSM.model_roots.push('parent')
  eGSM.stages.set('parent', stage1)
  eGSM.stages.set('ch1', ch1)
  eGSM.stages.set('ch2', ch2)
  eGSM.stages.set('ch3', ch3)
  eGSM.stages.set('ch4', ch4)
  eGSM.stages.set('ch5', ch5)
  var pers1 = new ProcessPerspective('pers-1')
  pers1.egsm_model = eGSM
  pers1.bpmn_model = bpmn

  var expected = [new MultiExecutionDeviation('ch4')]
  var data = pers1.analyze()
  console.log(data)
  expect(data).toEqual(expected)
})

test('SEQUENCE&EXCLUSIVE - Executing and incorrect exclusive branch', async () => {
  //Children stages
  var ch1 = new EgsmStage('ch1', 'ch1', 'parent', 'EXCEPTION', '')
  ch1.type = 'ACTIVITY'
  ch1.direct_successor = 'NA'
  ch1.status = 'REGULAR'
  ch1.state = 'CLOSED'
  ch1.compliance = 'ONTIME'
  var ch2 = new EgsmStage('ch2', 'ch2', 'parent', 'EXCEPTION', '')
  var ch3 = new EgsmStage('ch3', 'ch3', 'parent', 'EXCEPTION', '')
  ch3.type = 'ACTIVITY'
  ch3.direct_successor = 'ch2'
  ch3.status = 'REGULAR'
  ch3.state = 'CLOSED'
  ch3.compliance = 'ONTIME'
  var ch4 = new EgsmStage('ch4', 'ch4', 'ch2', 'EXCEPTION', '')
  ch4.type = 'ACTIVITY'
  ch4.direct_successor = 'NA'
  ch4.status = 'REGULAR'
  ch4.state = 'CLOSED'
  ch4.compliance = 'OUTOFORDER'
  var ch5 = new EgsmStage('ch5', 'ch5', 'ch2', 'EXCEPTION', '')
  ch5.type = 'ACTIVITY'
  ch5.direct_successor = 'NA'
  ch5.status = 'REGULAR'
  ch5.state = 'CLOSED'
  ch5.compliance = 'ONTIME'

  //Parent stage
  var stage1 = new EgsmStage('parent', 'parent', 'NA', 'EXCEPTION', '')
  stage1.type = 'SEQUENCE'
  stage1.status = 'REGULAR'
  stage1.state = 'CLOSED'
  stage1.compliance = 'ONTIME'
  stage1.direct_successor = 'NONE'
  stage1.children = ['ch1', 'ch2', 'ch3']
  stage1.propagateCondition('SHOULD_BE_CLOSED')

  ch2.type = 'EXCLUSIVE'
  ch2.status = 'REGULAR'
  ch2.state = 'CLOSED'
  ch2.compliance = 'ONTIME'
  ch2.direct_successor = 'ch1'
  ch2.children = ['ch4', 'ch5']

  //Setting up the perspective
  var eGSM = new EgsmModel()
  var bpmn = new BpmnModel('pers1')
  eGSM.model_roots.push('parent')
  eGSM.stages.set('parent', stage1)
  eGSM.stages.set('ch1', ch1)
  eGSM.stages.set('ch2', ch2)
  eGSM.stages.set('ch3', ch3)
  eGSM.stages.set('ch4', ch4)
  eGSM.stages.set('ch5', ch5)
  var pers1 = new ProcessPerspective('pers-1')
  pers1.egsm_model = eGSM
  pers1.bpmn_model = bpmn

  var expected = [new IncorrectBranchDeviation('ch4')]
  var data = pers1.analyze()
  console.log(data)
  expect(data).toEqual(expected)
})

test('SEQUENCE&EXCLUSIVE - Not executing the desired branch and executing a non-desired', async () => {
  //Children stages
  var ch1 = new EgsmStage('ch1', 'ch1', 'parent', 'EXCEPTION', '')
  ch1.type = 'ACTIVITY'
  ch1.direct_successor = 'NA'
  ch1.status = 'REGULAR'
  ch1.state = 'CLOSED'
  ch1.compliance = 'ONTIME'
  var ch2 = new EgsmStage('ch2', 'ch2', 'parent', 'EXCEPTION', '')
  var ch3 = new EgsmStage('ch3', 'ch3', 'parent', 'EXCEPTION', '')
  ch3.type = 'ACTIVITY'
  ch3.direct_successor = 'ch2'
  ch3.status = 'REGULAR'
  ch3.state = 'CLOSED'
  ch3.compliance = 'OUTOFORDER'
  var ch4 = new EgsmStage('ch4', 'ch4', 'ch2', 'EXCEPTION', '')
  ch4.type = 'ACTIVITY'
  ch4.direct_successor = 'NA'
  ch4.status = 'REGULAR'
  ch4.state = 'UNOPENED'
  ch4.compliance = 'SKIPPED'
  var ch5 = new EgsmStage('ch5', 'ch5', 'ch2', 'EXCEPTION', '')
  ch5.type = 'ACTIVITY'
  ch5.direct_successor = 'NA'
  ch5.status = 'REGULAR'
  ch5.state = 'CLOSED'
  ch5.compliance = 'OUTOFORDER'

  //Parent stage
  var stage1 = new EgsmStage('parent', 'parent', 'NA', 'EXCEPTION', '')
  stage1.type = 'SEQUENCE'
  stage1.status = 'REGULAR'
  stage1.state = 'CLOSED'
  stage1.compliance = 'ONTIME'
  stage1.direct_successor = 'NONE'
  stage1.children = ['ch1', 'ch2', 'ch3']
  stage1.propagateCondition('SHOULD_BE_CLOSED')

  ch2.type = 'EXCLUSIVE'
  ch2.status = 'REGULAR'
  ch2.state = 'OPEN'
  ch2.compliance = 'ONTIME'
  ch2.direct_successor = 'ch1'
  ch2.children = ['ch4', 'ch5']

  //Setting up the perspective
  var eGSM = new EgsmModel()
  var bpmn = new BpmnModel('pers1')
  eGSM.model_roots.push('parent')
  eGSM.stages.set('parent', stage1)
  eGSM.stages.set('ch1', ch1)
  eGSM.stages.set('ch2', ch2)
  eGSM.stages.set('ch3', ch3)
  eGSM.stages.set('ch4', ch4)
  eGSM.stages.set('ch5', ch5)
  var pers1 = new ProcessPerspective('pers-1')
  pers1.egsm_model = eGSM
  pers1.bpmn_model = bpmn

  var expected = [new IncorrectExecutionSequenceDeviation(['ch3']), new IncompleteDeviation('ch2'), new IncorrectBranchDeviation('ch5'), new SkipDeviation(['ch4'], 'NA')]
  var data = pers1.analyze()
  console.log(data)
  expect(data).toEqual(expected)
})

test('SEQUENCE&INCLUSIVE - Executing an incorrect branch', async () => {
  //Children stages
  var ch1 = new EgsmStage('ch1', 'ch1', 'parent', 'EXCEPTION', '')
  ch1.type = 'ACTIVITY'
  ch1.direct_successor = 'NA'
  ch1.status = 'REGULAR'
  ch1.state = 'CLOSED'
  ch1.compliance = 'ONTIME'
  var ch2 = new EgsmStage('ch2', 'ch2', 'parent', 'EXCEPTION', '')
  var ch3 = new EgsmStage('ch3', 'ch3', 'parent', 'EXCEPTION', '')
  ch3.type = 'ACTIVITY'
  ch3.direct_successor = 'ch2'
  ch3.status = 'REGULAR'
  ch3.state = 'CLOSED'
  ch3.compliance = 'OUTOFORDER'
  var ch4 = new EgsmStage('ch4', 'ch4', 'ch2', 'EXCEPTION', '')
  ch4.type = 'ACTIVITY'
  ch4.direct_successor = 'NA'
  ch4.status = 'REGULAR'
  ch4.state = 'UNOPENED'
  ch4.compliance = 'ONTIME'
  var ch5 = new EgsmStage('ch5', 'ch5', 'ch2', 'EXCEPTION', '')
  ch5.type = 'ACTIVITY'
  ch5.direct_successor = 'NA'
  ch5.status = 'REGULAR'
  ch5.state = 'CLOSED'
  ch5.compliance = 'OUTOFORDER'

  //Parent stage
  var stage1 = new EgsmStage('parent', 'parent', 'NA', 'EXCEPTION', '')
  stage1.type = 'SEQUENCE'
  stage1.status = 'REGULAR'
  stage1.state = 'CLOSED'
  stage1.compliance = 'ONTIME'
  stage1.direct_successor = 'NONE'
  stage1.children = ['ch1', 'ch2', 'ch3']
  stage1.propagateCondition('SHOULD_BE_CLOSED')

  ch2.type = 'INCLUSIVE'
  ch2.status = 'REGULAR'
  ch2.state = 'OPEN'
  ch2.compliance = 'ONTIME'
  ch2.direct_successor = 'ch1'
  ch2.children = ['ch4', 'ch5']

  //Setting up the perspective
  var eGSM = new EgsmModel()
  var bpmn = new BpmnModel('pers1')
  eGSM.model_roots.push('parent')
  eGSM.stages.set('parent', stage1)
  eGSM.stages.set('ch1', ch1)
  eGSM.stages.set('ch2', ch2)
  eGSM.stages.set('ch3', ch3)
  eGSM.stages.set('ch4', ch4)
  eGSM.stages.set('ch5', ch5)
  var pers1 = new ProcessPerspective('pers-1')
  pers1.egsm_model = eGSM
  pers1.bpmn_model = bpmn

  var expected = [new IncorrectExecutionSequenceDeviation(['ch3']), new IncompleteDeviation('ch2'), new IncorrectBranchDeviation('ch5')]
  var data = pers1.analyze()
  console.log(data)
  expect(data).toEqual(expected)
})

test('SEQUENCE&INCLUSIVE - Incomplete branch execution', async () => {
  //Children stages
  var ch1 = new EgsmStage('ch1', 'ch1', 'parent', 'EXCEPTION', '')
  ch1.type = 'ACTIVITY'
  ch1.direct_successor = 'NA'
  ch1.status = 'REGULAR'
  ch1.state = 'CLOSED'
  ch1.compliance = 'ONTIME'
  var ch2 = new EgsmStage('ch2', 'ch2', 'parent', 'EXCEPTION', '')
  var ch3 = new EgsmStage('ch3', 'ch3', 'parent', 'EXCEPTION', '')
  ch3.type = 'ACTIVITY'
  ch3.direct_successor = 'ch2'
  ch3.status = 'REGULAR'
  ch3.state = 'CLOSED'
  ch3.compliance = 'OUTOFORDER'
  var ch4 = new EgsmStage('ch4', 'ch4', 'ch2', 'EXCEPTION', '')
  ch4.type = 'ACTIVITY'
  ch4.direct_successor = 'NA'
  ch4.status = 'REGULAR'
  ch4.state = 'UNOPENED'
  ch4.compliance = 'ONTIME'
  var ch5 = new EgsmStage('ch5', 'ch5', 'ch2', 'EXCEPTION', '')
  ch5.type = 'ACTIVITY'
  ch5.direct_successor = 'NA'
  ch5.status = 'REGULAR'
  ch5.state = 'OPEN'
  ch5.compliance = 'ONTIME'

  //Parent stage
  var stage1 = new EgsmStage('parent', 'parent', 'NA', 'EXCEPTION', '')
  stage1.type = 'SEQUENCE'
  stage1.status = 'REGULAR'
  stage1.state = 'CLOSED'
  stage1.compliance = 'ONTIME'
  stage1.direct_successor = 'NONE'
  stage1.children = ['ch1', 'ch2', 'ch3']
  stage1.propagateCondition('SHOULD_BE_CLOSED')

  ch2.type = 'INCLUSIVE'
  ch2.status = 'REGULAR'
  ch2.state = 'OPEN'
  ch2.compliance = 'ONTIME'
  ch2.direct_successor = 'ch1'
  ch2.children = ['ch4', 'ch5']

  //Setting up the perspective
  var eGSM = new EgsmModel()
  var bpmn = new BpmnModel('pers1')
  eGSM.model_roots.push('parent')
  eGSM.stages.set('parent', stage1)
  eGSM.stages.set('ch1', ch1)
  eGSM.stages.set('ch2', ch2)
  eGSM.stages.set('ch3', ch3)
  eGSM.stages.set('ch4', ch4)
  eGSM.stages.set('ch5', ch5)
  var pers1 = new ProcessPerspective('pers-1')
  pers1.egsm_model = eGSM
  pers1.bpmn_model = bpmn

  var expected = [new IncorrectExecutionSequenceDeviation(['ch3']), new IncompleteDeviation('ch2'), new IncompleteDeviation('ch5')]
  var data = pers1.analyze()
  console.log(data)
  expect(data).toEqual(expected)
})