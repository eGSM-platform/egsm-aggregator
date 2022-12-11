const { ArtifactEventProcessing } = require('../monitoring/monitoringtypes/artifact-event-processing');
const AUX = require('../egsm-common/auxiliary/auxiliary')
const LOG = require('../egsm-common/auxiliary/logManager')

var DYNAMO = require('../egsm-common/database/dynamoconnector')
var DB = require('../egsm-common/database/databaseconnector');
const { ArtifactEvent, Artifact, ArtifactUsageEntry } = require('../egsm-common/auxiliary/primitives');

async function initTables() {
    var promises = []
    promises.push(DYNAMO.initTable('PROCESS_TYPE', 'PROCESS_TYPE_NAME', undefined))
    promises.push(DYNAMO.initTable('PROCESS_INSTANCE', 'PROCESS_TYPE_NAME', 'INSTANCE_ID'))
    promises.push(DYNAMO.initTable('PROCESS_GROUP_DEFINITION', 'NAME', undefined))
    promises.push(DYNAMO.initTable('STAKEHOLDERS', 'STAKEHOLDER_ID', undefined))

    promises.push(DYNAMO.initTable('ARTIFACT_DEFINITION', 'ARTIFACT_TYPE', 'ARTIFACT_ID'))
    promises.push(DYNAMO.initTable('ARTIFACT_USAGE', 'ARTIFACT_NAME', 'CASE_ID'))
    promises.push(DYNAMO.initTable('ARTIFACT_EVENT', 'ARTIFACT_NAME', 'EVENT_ID', { indexname: 'PROCESSED_INDEX', pk: { name: 'ENTRY_PROCESSED', type: 'N' } }))
    promises.push(DYNAMO.initTable('STAGE_EVENT', 'PROCESS_NAME', 'EVENT_ID'))
    await Promise.all(promises)
}

async function deleteTables() {
    var TABLES = [
        'PROCESS_TYPE', 'PROCESS_INSTANCE', 'PROCESS_GROUP_DEFINITION', 'STAKEHOLDERS',
        'ARTIFACT_EVENT', 'ARTIFACT_USAGE', 'ARTIFACT_DEFINITION', 'STAGE_EVENT'
    ]
    var promises = []
    TABLES.forEach(element => {
        promises.push(DYNAMO.deleteTable(element))
    });
    await Promise.all(promises)
}

beforeAll(() => {
    DYNAMO.initDynamo('fakeMyKeyId', 'fakeSecretAccessKey', 'local', 'http://localhost:8000')
});

beforeEach(async () => {
    LOG.setLogLevel(5)
    await initTables()
});

afterEach(async () => {
    await deleteTables()
})


async function wait(delay) {
    await AUX.sleep(delay)
}

//TEST CASES BEGIN

test('ArtifactEventProcessing - no Event and not Artifact in DB', async () => {
    var artifact1 = {
        type: 'Truck',
        id: 'abc-123'
    }
    var job1 = new ArtifactEventProcessing('obs-1', 'owner', 2)
    await wait(3000)
    job1.terminate()
    var data = await DB.readArtifactUsageEntries('Truck/abc-123', '0', '999999999')
    var expected = []
    expect(data).toEqual(expected)
})

test('ArtifactEventProcessing - Unprocessed Events and not defined Artifacts in DB', async () => {
    var event1 = new ArtifactEvent('Truck/abc-123', 'attached', 100, 'process_type1', '001', 'event-001')
    var event2 = new ArtifactEvent('Truck/abc-123', 'detached', 500, 'process_type1', '002', 'event-002')
    var event3 = new ArtifactEvent('Truck/abc-123', 'detached', 1000, 'process_type1', '001', 'event-003')
    var event4 = new ArtifactEvent('Truck/abc-123', 'attached', 1500, 'process_type1', '002', 'event-004')
    await DB.writeArtifactEvent(event1)
    await DB.writeArtifactEvent(event2)
    await DB.writeArtifactEvent(event3)
    await DB.writeArtifactEvent(event4)

    var job1 = new ArtifactEventProcessing('obs-1', 'owner', 2)
    await wait(3000)
    job1.terminate()
    var data = await DB.readArtifactUsageEntries('Truck/abc-123', '0', '999999999')
    var expected = []
    expect(data).toEqual(expected)
})


test('ArtifactEventProcessing - Unprocessed Events and defined Artifact and Process instances in DB, Process Instance is not finished yet', async () => {
    var event1 = new ArtifactEvent('Truck/abc-123', 'attached', 100, 'process_type1', '001', 'event-001')
    var event2 = new ArtifactEvent('Truck/abc-123', 'detached', 500, 'process_type1', '002', 'event-002')
    var event3 = new ArtifactEvent('Truck/abc-123', 'detached', 1000, 'process_type1', '001', 'event-003')
    var event4 = new ArtifactEvent('Truck/abc-123', 'attached', 1500, 'process_type1', '002', 'event-004')

    await DB.writeNewArtifactDefinition('Truck', 'abc-123', ['Company-1'], 'localhost', 1883)
    await DB.writeNewProcessInstance('process_type1', '001', ['stakeholder-1'], '10', 'localhost', 1883)
    await DB.writeNewProcessInstance('process_type1', '002', ['stakeholder-2'], '20', 'localhost', 1883)
    await DB.writeArtifactEvent(event1)
    await DB.writeArtifactEvent(event2)
    await DB.writeArtifactEvent(event3)
    await DB.writeArtifactEvent(event4)

    var job1 = new ArtifactEventProcessing('obs-1', 'owner', 2)
    await wait(3000)
    job1.terminate()
    await wait(1000)
    var data = await DB.readArtifactUsageEntries('Truck/abc-123', '0', '999999999')
    var expected = []
    expect(data).toEqual(expected)
})

test('ArtifactEventProcessing - Unprocessed Events and defined Artifact and Process instances in DB, Process Instance Finished', async () => {
    var event1 = new ArtifactEvent('Truck/abc-123', 'attached', 100, 'process_type1', '001', 'event-001')
    var event2 = new ArtifactEvent('Truck/abc-123', 'detached', 500, 'process_type1', '002', 'event-002')
    var event3 = new ArtifactEvent('Truck/abc-123', 'detached', 1000, 'process_type1', '001', 'event-003')
    var event4 = new ArtifactEvent('Truck/abc-123', 'attached', 200, 'process_type1', '002', 'event-004')

    await DB.writeNewArtifactDefinition('Truck', 'abc-123', ['Company-1'], 'localhost', 1883)
    await DB.writeNewProcessInstance('process_type1', '001', ['stakeholder-1'], '10', 'localhost', 1883)
    await DB.writeNewProcessInstance('process_type1', '002', ['stakeholder-2'], '20', 'localhost', 1883)
    await DB.closeOngoingProcessInstance('process_type1', '001', 999, 'success')
    await DB.closeOngoingProcessInstance('process_type1', '002', 999, 'faulty')
    await DB.writeArtifactEvent(event1)
    await DB.writeArtifactEvent(event2)
    await DB.writeArtifactEvent(event3)
    await DB.writeArtifactEvent(event4)

    var job1 = new ArtifactEventProcessing('obs-1', 'owner', 2)
    await wait(3000)
    job1.terminate()
    await wait(1000)
    var data = await DB.readArtifactUsageEntries('Truck/abc-123', '0', '999999999')
    var expected = [
        new ArtifactUsageEntry('Truck/abc-123', 'event-001_event-003', 100, 1000, 'process_type1', '001', 'success'),
        new ArtifactUsageEntry('Truck/abc-123', 'event-004_event-002', 200, 500, 'process_type1', '002', 'faulty')
    ]
    expect(data).toEqual(expected)
})

test('ArtifactEventProcessing - Unprocessed Events and defined Artifact and Process instances in DB, Process Instance Finished, wait for 2 cycles', async () => {
    var event1 = new ArtifactEvent('Truck/abc-123', 'attached', 100, 'process_type1', '001', 'event-001')
    var event2 = new ArtifactEvent('Truck/abc-123', 'detached', 500, 'process_type1', '002', 'event-002')
    var event3 = new ArtifactEvent('Truck/abc-123', 'detached', 1000, 'process_type1', '001', 'event-003')
    var event4 = new ArtifactEvent('Truck/abc-123', 'attached', 200, 'process_type1', '002', 'event-004')

    await DB.writeNewArtifactDefinition('Truck', 'abc-123', ['Company-1'], 'localhost', 1883)
    await DB.writeNewProcessInstance('process_type1', '001', ['stakeholder-1'], '10', 'localhost', 1883)
    await DB.writeNewProcessInstance('process_type1', '002', ['stakeholder-2'], '20', 'localhost', 1883)
    await DB.closeOngoingProcessInstance('process_type1', '001', 999, 'success')
    await DB.closeOngoingProcessInstance('process_type1', '002', 999, 'faulty')
    await DB.writeArtifactEvent(event1)
    await DB.writeArtifactEvent(event2)
    await DB.writeArtifactEvent(event3)
    await DB.writeArtifactEvent(event4)

    var job1 = new ArtifactEventProcessing('obs-1', 'owner', 1)
    await wait(2500)
    job1.terminate()
    await wait(1000)
    var data = await DB.readArtifactUsageEntries('Truck/abc-123', '0', '999999999')
    var expected = [
        new ArtifactUsageEntry('Truck/abc-123', 'event-001_event-003', 100, 1000, 'process_type1', '001', 'success'),
        new ArtifactUsageEntry('Truck/abc-123', 'event-004_event-002', 200, 500, 'process_type1', '002', 'faulty')
    ]
    expect(data).toEqual(expected)
})