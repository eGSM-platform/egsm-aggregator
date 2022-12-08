const { ArtifactEventProcessing } = require('../monitoring/monitoringtypes/artifact-event-processing');
const AUX = require('../egsm-common/auxiliary/auxiliary')
const LOG = require('../egsm-common/auxiliary/logManager')
var MQTTCOMM = require('../communication/mqttcommunication')
var PRIM = require('../egsm-common/auxiliary/primitives')

var broker = new PRIM.Broker('localhost', 1883, '', '')

var DYNAMO = require('../egsm-common/database/dynamoconnector')
var DB = require('../egsm-common/database/databaseconnector')

var broker = new PRIM.Broker('localhost', 1883, '', '')

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
    MQTTCOMM.initPrimaryBrokerConnection(broker)
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
    var job1 = new ArtifactEventProcessing('obs-1', [broker], 'owner', [artifact1], 2)
    await wait(3000)
    job1.terminate()
    var data = await DB.readArtifactUsageEntries('Truck/abc-123', '0', '999999999')
    var expected = []
    expect(data).toEqual(expected)
})

test('ArtifactEventProcessing - Unprocessed Events and not defined Artifacts in DB', async () => {
    var artifact1 = {
        type: 'Truck',
        id: 'abc-123'
    }
    var eventDetailJson1 = {
        timestamp: 100,
        artifact_name: 'Truck/abc-123',
        artifact_state: 'attached',
        process_type: 'process_type1',
        process_id: '001',
        event_id: 'event-001'
    }
    var eventDetailJson2 = {
        timestamp: 500,
        artifact_name: 'Truck/abc-123',
        artifact_state: 'detached',
        process_type: 'process_type1',
        process_id: '002',
        event_id: 'event-002'
    }
    var eventDetailJson3 = {
        timestamp: 1000,
        artifact_name: 'Truck/abc-123',
        artifact_state: 'detached',
        process_type: 'process_type1',
        process_id: '001',
        event_id: 'event-003'
    }
    var eventDetailJson4 = {
        timestamp: 1500,
        artifact_name: 'Truck/abc-123',
        artifact_state: 'attached',
        process_type: 'process_type1',
        process_id: '002',
        event_id: 'event-004'
    }
    await DB.writeArtifactEvent(eventDetailJson1)
    await DB.writeArtifactEvent(eventDetailJson2)
    await DB.writeArtifactEvent(eventDetailJson3)
    await DB.writeArtifactEvent(eventDetailJson4)

    var job1 = new ArtifactEventProcessing('obs-1', [broker], 'owner', [artifact1], 2)
    await wait(3000)
    job1.terminate()
    var data = await DB.readArtifactUsageEntries('Truck/abc-123', '0', '999999999')
    var expected = []
    expect(data).toEqual(expected)
})


test('ArtifactEventProcessing - Unprocessed Events and defined Artifact and Process instances in DB, Process Instance is not finished yet', async () => {
    var artifact1 = {
        type: 'Truck',
        id: 'abc-123'
    }
    var eventDetailJson1 = {
        timestamp: 100,
        artifact_name: 'Truck/abc-123',
        artifact_state: 'attached',
        process_type: 'process_type1',
        process_id: '001',
        event_id: 'event-001'
    }
    var eventDetailJson2 = {
        timestamp: 500,
        artifact_name: 'Truck/abc-123',
        artifact_state: 'detached',
        process_type: 'process_type1',
        process_id: '002',
        event_id: 'event-002'
    }
    var eventDetailJson3 = {
        timestamp: 1000,
        artifact_name: 'Truck/abc-123',
        artifact_state: 'detached',
        process_type: 'process_type1',
        process_id: '001',
        event_id: 'event-003'
    }
    var eventDetailJson4 = {
        timestamp: 1500,
        artifact_name: 'Truck/abc-123',
        artifact_state: 'attached',
        process_type: 'process_type1',
        process_id: '002',
        event_id: 'event-004'
    }
    await DB.writeNewArtifactDefinition('Truck', 'abc-123', ['Company-1'], 'localhost', 1883)
    await DB.writeNewProcessInstance('process_type1', '001', ['stakeholder-1'], '10', [], 'localhost', 1883)
    await DB.writeNewProcessInstance('process_type1', '002', ['stakeholder-2'], '20', [], 'localhost', 1883)
    await DB.writeArtifactEvent(eventDetailJson1)
    await DB.writeArtifactEvent(eventDetailJson2)
    await DB.writeArtifactEvent(eventDetailJson3)
    await DB.writeArtifactEvent(eventDetailJson4)

    var job1 = new ArtifactEventProcessing('obs-1', [broker], 'owner', [artifact1], 2)
    await wait(3000)
    job1.terminate()
    await wait(1000)
    var data = await DB.readArtifactUsageEntries('Truck/abc-123', '0', '999999999')
    var expected = []
    expect(data).toEqual(expected)
})

test('ArtifactEventProcessing - Unprocessed Events and defined Artifact and Process instances in DB, Process Instance Finished', async () => {
    var artifact1 = {
        type: 'Truck',
        id: 'abc-123'
    }
    var eventDetailJson1 = {
        timestamp: 100,
        artifact_name: 'Truck/abc-123',
        artifact_state: 'attached',
        process_type: 'process_type1',
        process_id: '001',
        event_id: 'event-001'
    }
    var eventDetailJson2 = {
        timestamp: 500,
        artifact_name: 'Truck/abc-123',
        artifact_state: 'detached',
        process_type: 'process_type1',
        process_id: '002',
        event_id: 'event-002'
    }
    var eventDetailJson3 = {
        timestamp: 1000,
        artifact_name: 'Truck/abc-123',
        artifact_state: 'detached',
        process_type: 'process_type1',
        process_id: '001',
        event_id: 'event-003'
    }
    var eventDetailJson4 = {
        timestamp: 200,
        artifact_name: 'Truck/abc-123',
        artifact_state: 'attached',
        process_type: 'process_type1',
        process_id: '002',
        event_id: 'event-004'
    }
    await DB.writeNewArtifactDefinition('Truck', 'abc-123', ['Company-1'], 'localhost', 1883)
    await DB.writeNewProcessInstance('process_type1', '001', ['stakeholder-1'], '10', [], 'localhost', 1883)
    await DB.writeNewProcessInstance('process_type1', '002', ['stakeholder-2'], '20', [], 'localhost', 1883)
    await DB.closeOngoingProcessInstance('process_type1', '001', 999, 'success')
    await DB.closeOngoingProcessInstance('process_type1', '002', 999, 'faulty')
    await DB.writeArtifactEvent(eventDetailJson1)
    await DB.writeArtifactEvent(eventDetailJson2)
    await DB.writeArtifactEvent(eventDetailJson3)
    await DB.writeArtifactEvent(eventDetailJson4)

    var job1 = new ArtifactEventProcessing('obs-1', [broker], 'owner', [artifact1], 2)
    await wait(3000)
    job1.terminate()
    await wait(1000)
    var data = await DB.readArtifactUsageEntries('Truck/abc-123', '0', '999999999')
    var expected = [
        {
            "ARTIFACT_NAME": "Truck/abc-123",
            "ATTACHED_TIME": "100",
            "CASE_ID": "event-001_event-003",
            "DETACHED_TIME": "1000",
            "OUTCOME": "success",
            "PROCESS_ID": "001",
            "PROCESS_TYPE": "process_type1",
        },
        {
            "ARTIFACT_NAME": "Truck/abc-123",
            "ATTACHED_TIME": "200",
            "CASE_ID": "event-004_event-002",
            "DETACHED_TIME": "500",
            "OUTCOME": "faulty",
            "PROCESS_ID": "002",
            "PROCESS_TYPE": "process_type1",
        }]
    expect(data).toEqual(expected)
})

test('ArtifactEventProcessing - Unprocessed Events and defined Artifact and Process instances in DB, Process Instance Finished, wait for 2 cycles', async () => {
    var artifact1 = {
        type: 'Truck',
        id: 'abc-123'
    }
    var eventDetailJson1 = {
        timestamp: 100,
        artifact_name: 'Truck/abc-123',
        artifact_state: 'attached',
        process_type: 'process_type1',
        process_id: '001',
        event_id: 'event-001'
    }
    var eventDetailJson2 = {
        timestamp: 500,
        artifact_name: 'Truck/abc-123',
        artifact_state: 'detached',
        process_type: 'process_type1',
        process_id: '002',
        event_id: 'event-002'
    }
    var eventDetailJson3 = {
        timestamp: 1000,
        artifact_name: 'Truck/abc-123',
        artifact_state: 'detached',
        process_type: 'process_type1',
        process_id: '001',
        event_id: 'event-003'
    }
    var eventDetailJson4 = {
        timestamp: 200,
        artifact_name: 'Truck/abc-123',
        artifact_state: 'attached',
        process_type: 'process_type1',
        process_id: '002',
        event_id: 'event-004'
    }
    await DB.writeNewArtifactDefinition('Truck', 'abc-123', ['Company-1'], 'localhost', 1883)
    await DB.writeNewProcessInstance('process_type1', '001', ['stakeholder-1'], '10', [], 'localhost', 1883)
    await DB.writeNewProcessInstance('process_type1', '002', ['stakeholder-2'], '20', [], 'localhost', 1883)
    await DB.closeOngoingProcessInstance('process_type1', '001', 999, 'success')
    await DB.closeOngoingProcessInstance('process_type1', '002', 999, 'faulty')
    await DB.writeArtifactEvent(eventDetailJson1)
    await DB.writeArtifactEvent(eventDetailJson2)
    await DB.writeArtifactEvent(eventDetailJson3)
    await DB.writeArtifactEvent(eventDetailJson4)

    var job1 = new ArtifactEventProcessing('obs-1', [broker], 'owner', [artifact1], 1)
    await wait(2500)
    job1.terminate()
    await wait(1000)
    var data = await DB.readArtifactUsageEntries('Truck/abc-123', '0', '999999999')
    var expected = [
        {
            "ARTIFACT_NAME": "Truck/abc-123",
            "ATTACHED_TIME": "100",
            "CASE_ID": "event-001_event-003",
            "DETACHED_TIME": "1000",
            "OUTCOME": "success",
            "PROCESS_ID": "001",
            "PROCESS_TYPE": "process_type1",
        },
        {
            "ARTIFACT_NAME": "Truck/abc-123",
            "ATTACHED_TIME": "200",
            "CASE_ID": "event-004_event-002",
            "DETACHED_TIME": "500",
            "OUTCOME": "faulty",
            "PROCESS_ID": "002",
            "PROCESS_TYPE": "process_type1",
        }]
    expect(data).toEqual(expected)
})