const { ArtifactUsageStatisticProcessing } = require('../monitoring/monitoringtypes/artifact-usage-statistic-processing');
const AUX = require('../egsm-common/auxiliary/auxiliary')
const LOG = require('../egsm-common/auxiliary/logManager')

var DYNAMO = require('../egsm-common/database/dynamoconnector')
var DB = require('../egsm-common/database/databaseconnector');
const { ArtifactEvent, Artifact, ArtifactUsageEntry, FaultyRateWindow } = require('../egsm-common/auxiliary/primitives');

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

test('ArtifactUsageStatisticProcessing - No Artifact definition, startup and terminate', async () => {
    var artifact1 = new Artifact('Truck', 'abc-123')
    var job1 = new ArtifactUsageStatisticProcessing('obs-1', 'owner', [artifact1], 1)
    await wait(3000)
    expect(async () => {
        job1.terminate()
    }).not.toThrow()
    await wait(1000)
})

test('ArtifactUsageStatisticProcessing - No windows defined, startup and terminate', async () => {
    var artifact1 = new Artifact('Truck', 'abc-123')
    await DB.writeNewArtifactDefinition('Truck', 'abc-123', ['Company-1'], 'localhost', 1883)

    var job1 = new ArtifactUsageStatisticProcessing('obs-1', 'owner', [artifact1], 1)
    await wait(3000)
    expect(async () => {
        job1.terminate()
    }).not.toThrow()
    await wait(1000)
})

test('ArtifactUsageStatisticProcessing - One windows defined, no Arttifact Usage Entries', async () => {
    var artifact1 = new Artifact('Truck', 'abc-123')
    await DB.writeNewArtifactDefinition('Truck', 'abc-123', ['Company-1'], 'localhost', 1883)
    var timeBuff = Math.floor(Date.now() / 1000)
    await DB.addNewFaultyRateWindow('Truck', 'abc-123', 15)

    var job1 = new ArtifactUsageStatisticProcessing('obs-1', 'owner', [artifact1], 1)
    await wait(3000)
    expect(async () => {
        job1.terminate()
    }).not.toThrow()
    await wait(1000)

    var expected1 = new Artifact('Truck', 'abc-123', ['Company-1'], new Map([[15, new FaultyRateWindow(15, -1, timeBuff, -1)]]), new Map(), 'localhost', '1883')
    var data1 = await DB.readArtifactDefinition('Truck', 'abc-123')
    expect(data1).toEqual(expected1)
})

test('ArtifactUsageStatisticProcessing - One windows defined, not enough Artifact Usage Entry to update', async () => {
    var artifact1 = new Artifact('Truck', 'abc-123')
    var timeBuff = Math.floor(Date.now() / 1000)
    await DB.writeNewArtifactDefinition('Truck', 'abc-123', ['Company-1'], 'localhost', 1883)
    await DB.addNewFaultyRateWindow('Truck', 'abc-123', 5)
    await DB.writeArtifactUsageEntry('Truck/abc-123', 'case1', timeBuff - 10000, timeBuff - 9000, 'Process1', '01', 'success')
    await DB.writeArtifactUsageEntry('Truck/abc-123', 'case2', timeBuff - 9100, timeBuff - 8500, 'Process2', '01', 'success')
    await DB.writeArtifactUsageEntry('Truck/abc-123', 'case3', timeBuff - 8400, timeBuff - 8000, 'Process1', '01', 'success')
    await DB.writeArtifactUsageEntry('Truck/abc-123', 'case4', timeBuff - 7900, timeBuff - 7800, 'Process1', '02', 'success')

    var job1 = new ArtifactUsageStatisticProcessing('obs-1', 'owner', [artifact1], 1)
    await wait(3000)
    expect(async () => {
        job1.terminate()
    }).not.toThrow()
    await wait(1000)
    var expected1 = new Artifact('Truck', 'abc-123', ['Company-1'], new Map([[5, new FaultyRateWindow(5, -1, timeBuff, -1)]]), new Map(), 'localhost', '1883')
    var data1 = await DB.readArtifactDefinition('Truck', 'abc-123')
    expect(data1).toEqual(expected1)
})

test('ArtifactUsageStatisticProcessing - One windows defined, enough Artifact Usage Entry to update', async () => {
    var artifact1 = new Artifact('Truck', 'abc-123')
    var timeBuff = Math.floor(Date.now() / 1000)
    await DB.writeNewArtifactDefinition('Truck', 'abc-123', ['Company-1'], 'localhost', 1883)
    await DB.addNewFaultyRateWindow('Truck', 'abc-123', 5)
    await DB.writeArtifactUsageEntry('Truck/abc-123', 'case1', timeBuff - 10000, timeBuff - 9000, 'Process1', '01', 'success')
    await DB.writeArtifactUsageEntry('Truck/abc-123', 'case2', timeBuff - 9100, timeBuff - 8500, 'Process2', '01', 'success')
    await DB.writeArtifactUsageEntry('Truck/abc-123', 'case3', timeBuff - 8400, timeBuff - 8000, 'Process1', '01', 'success')
    await DB.writeArtifactUsageEntry('Truck/abc-123', 'case4', timeBuff - 7900, timeBuff - 7800, 'Process1', '02', 'success')
    await DB.writeArtifactUsageEntry('Truck/abc-123', 'case5', timeBuff - 7000, timeBuff - 6800, 'Process1', '03', 'success')

    var job1 = new ArtifactUsageStatisticProcessing('obs-1', 'owner', [artifact1], 1)
    await wait(2100)
    expect(async () => {
        job1.terminate()
    }).not.toThrow()
    await wait(200)
    var expected1 = new Artifact('Truck', 'abc-123', ['Company-1'], new Map([[5, new FaultyRateWindow(5, 0, timeBuff + 2, timeBuff - 9000)]]), new Map(), 'localhost', '1883')
    var data1 = await DB.readArtifactDefinition('Truck', 'abc-123')

    expect(Math.abs(expected1.faulty_rates.get(5).updated - data1.faulty_rates.get(5).updated) < 3).toEqual(true)
    data1.faulty_rates.set(5, 0)
    expected1.faulty_rates.set(5, 0)
    expect(data1).toEqual(expected1)
})

test('ArtifactUsageStatisticProcessing - One windows defined, more than enough Artifact Usage Entry to update (check if older one are not being considered)', async () => {
    var artifact1 = new Artifact('Truck', 'abc-123')
    var timeBuff = Math.floor(Date.now() / 1000)
    await DB.writeNewArtifactDefinition('Truck', 'abc-123', ['Company-1'], 'localhost', 1883)
    await DB.addNewFaultyRateWindow('Truck', 'abc-123', 2)
    await DB.writeArtifactUsageEntry('Truck/abc-123', 'case1', timeBuff - 10000, timeBuff - 9000, 'Process1', '01', 'failed')
    await DB.writeArtifactUsageEntry('Truck/abc-123', 'case2', timeBuff - 9100, timeBuff - 8500, 'Process2', '01', 'failed')
    await DB.writeArtifactUsageEntry('Truck/abc-123', 'case3', timeBuff - 8400, timeBuff - 8000, 'Process1', '01', 'failed')
    await DB.writeArtifactUsageEntry('Truck/abc-123', 'case4', timeBuff - 7900, timeBuff - 7800, 'Process1', '02', 'success')
    await DB.writeArtifactUsageEntry('Truck/abc-123', 'case5', timeBuff - 7000, timeBuff - 6800, 'Process1', '03', 'success')

    var job1 = new ArtifactUsageStatisticProcessing('obs-1', 'owner', [artifact1], 1)
    await wait(2100)
    expect(async () => {
        job1.terminate()
    }).not.toThrow()
    await wait(200)
    var expected1 = new Artifact('Truck', 'abc-123', ['Company-1'], new Map([[2, new FaultyRateWindow(2, 0, timeBuff + 2, timeBuff - 7800)]]), new Map(), 'localhost', '1883')
    var data1 = await DB.readArtifactDefinition('Truck', 'abc-123')

    expect(Math.abs(expected1.faulty_rates.get(2).updated - data1.faulty_rates.get(2).updated) < 3).toEqual(true)
    data1.faulty_rates.set(2, 0)
    expected1.faulty_rates.set(2, 0)
    expect(data1).toEqual(expected1)
})

test('ArtifactUsageStatisticProcessing - Multi-window defined, check calculated values', async () => {
    var artifact1 = new Artifact('Truck', 'abc-123')
    var timeBuff = Math.floor(Date.now() / 1000)
    await DB.writeNewArtifactDefinition('Truck', 'abc-123', ['Company-1'], 'localhost', 1883)
    await DB.addNewFaultyRateWindow('Truck', 'abc-123', 2)
    await DB.addNewFaultyRateWindow('Truck', 'abc-123', 3)
    await DB.addNewFaultyRateWindow('Truck', 'abc-123', 4)
    await DB.writeArtifactUsageEntry('Truck/abc-123', 'case1', timeBuff - 10000, timeBuff - 9000, 'Process1', '01', 'failed')
    await DB.writeArtifactUsageEntry('Truck/abc-123', 'case2', timeBuff - 9100, timeBuff - 8500, 'Process2', '01', 'failed')
    await DB.writeArtifactUsageEntry('Truck/abc-123', 'case3', timeBuff - 8400, timeBuff - 8000, 'Process1', '01', 'failed')
    await DB.writeArtifactUsageEntry('Truck/abc-123', 'case4', timeBuff - 7900, timeBuff - 7800, 'Process1', '02', 'success')
    await DB.writeArtifactUsageEntry('Truck/abc-123', 'case5', timeBuff - 7000, timeBuff - 6800, 'Process1', '03', 'success')

    var job1 = new ArtifactUsageStatisticProcessing('obs-1', 'owner', [artifact1], 1)
    await wait(2100)
    expect(async () => {
        job1.terminate()
    }).not.toThrow()
    await wait(200)

    var expected1 = new Artifact('Truck', 'abc-123', ['Company-1'],
        new Map([[2, new FaultyRateWindow(2, 0, timeBuff + 2, timeBuff - 7800)],
        [3, new FaultyRateWindow(3, 3 / 2, timeBuff + 2, timeBuff - 8000)],
        [4, new FaultyRateWindow(4, 0.5, timeBuff + 2, timeBuff - 8500)]]), new Map(), 'localhost', '1883')

    var data1 = await DB.readArtifactDefinition('Truck', 'abc-123')

    expect(Math.abs(expected1.faulty_rates.get(2).updated - data1.faulty_rates.get(2).updated) < 3).toEqual(true)
    expect(Math.abs(expected1.faulty_rates.get(3).updated - data1.faulty_rates.get(3).updated) < 3).toEqual(true)
    expect(Math.abs(expected1.faulty_rates.get(4).updated - data1.faulty_rates.get(4).updated) < 3).toEqual(true)
    data1.faulty_rates.set(2, 0)
    expected1.faulty_rates.set(2, 0)
    data1.faulty_rates.set(3, 0)
    expected1.faulty_rates.set(3, 0)
    data1.faulty_rates.set(4, 0)
    expected1.faulty_rates.set(4, 0)
    expect(data1).toEqual(expected1)
})

test('ArtifactUsageStatisticProcessing - One windows defined, more than enough Artifact Usage Entry to update (check if older one are not being considered)', async () => {
    var artifact1 = new Artifact('Truck', 'abc-123')
    var timeBuff = Math.floor(Date.now() / 1000)
    await DB.writeNewArtifactDefinition('Truck', 'abc-123', ['Company-1'], 'localhost', 1883)
    await DB.addNewFaultyRateWindow('Truck', 'abc-123', 2)
    await DB.writeArtifactUsageEntry('Truck/abc-123', 'case1', timeBuff - 10000, timeBuff - 9000, 'Process1', '01', 'failed')
    await DB.writeArtifactUsageEntry('Truck/abc-123', 'case2', timeBuff - 9100, timeBuff - 8500, 'Process2', '01', 'failed')
    await DB.writeArtifactUsageEntry('Truck/abc-123', 'case3', timeBuff - 8400, timeBuff - 8000, 'Process1', '01', 'failed')
    await DB.writeArtifactUsageEntry('Truck/abc-123', 'case4', timeBuff - 7900, timeBuff - 7800, 'Process1', '02', 'success')
    await DB.writeArtifactUsageEntry('Truck/abc-123', 'case5', timeBuff - 7000, timeBuff - 6800, 'Process1', '03', 'success')

    var job1 = new ArtifactUsageStatisticProcessing('obs-1', 'owner', [artifact1], 1)
    await wait(2100)
    expect(async () => {
        job1.terminate()
    }).not.toThrow()
    await wait(200)
    var expected1 = new Artifact('Truck', 'abc-123', ['Company-1'], new Map([[2, new FaultyRateWindow(2, 0, timeBuff + 2, timeBuff - 7800)]]), new Map(), 'localhost', '1883')
    var data1 = await DB.readArtifactDefinition('Truck', 'abc-123')

    expect(Math.abs(expected1.faulty_rates.get(2).updated - data1.faulty_rates.get(2).updated) < 3).toEqual(true)
    data1.faulty_rates.set(2, 0)
    expected1.faulty_rates.set(2, 0)
    expect(data1).toEqual(expected1)
})

test('ArtifactUsageStatisticProcessing - Multi-window, Multi-Artifact defined, check calculated values', async () => {
    var artifact1 = new Artifact('Truck', 'abc-123')
    var artifact2 = new Artifact('Truck', 'abc-223')
    var artifact3 = new Artifact('Truck', 'abc-323')
    var artifact4 = new Artifact('Truck', 'abc-423')
    var timeBuff = Math.floor(Date.now() / 1000)
    await DB.writeNewArtifactDefinition('Truck', 'abc-123', ['Company-1'], 'localhost', 1883)
    await DB.writeNewArtifactDefinition('Truck', 'abc-223', ['Company-1'], 'localhost', 1883)
    await DB.writeNewArtifactDefinition('Truck', 'abc-323', ['Company-1'], 'localhost', 1883)
    await DB.addNewFaultyRateWindow('Truck', 'abc-123', 2)
    await DB.addNewFaultyRateWindow('Truck', 'abc-123', 3)
    await DB.addNewFaultyRateWindow('Truck', 'abc-123', 4)
    await DB.addNewFaultyRateWindow('Truck', 'abc-223', 2)
    await DB.addNewFaultyRateWindow('Truck', 'abc-223', 3)
    await DB.addNewFaultyRateWindow('Truck', 'abc-223', 4)
    await DB.addNewFaultyRateWindow('Truck', 'abc-323', 2)
    await DB.addNewFaultyRateWindow('Truck', 'abc-323', 3)
    await DB.addNewFaultyRateWindow('Truck', 'abc-323', 4)

    await DB.writeArtifactUsageEntry('Truck/abc-123', 'case1', timeBuff - 10000, timeBuff - 9000, 'Process1', '01', 'failed')
    await DB.writeArtifactUsageEntry('Truck/abc-123', 'case2', timeBuff - 9100, timeBuff - 8500, 'Process2', '01', 'failed')
    await DB.writeArtifactUsageEntry('Truck/abc-123', 'case3', timeBuff - 8400, timeBuff - 8000, 'Process1', '01', 'failed')
    await DB.writeArtifactUsageEntry('Truck/abc-123', 'case4', timeBuff - 7900, timeBuff - 7800, 'Process1', '02', 'success')
    await DB.writeArtifactUsageEntry('Truck/abc-123', 'case5', timeBuff - 7000, timeBuff - 6800, 'Process1', '03', 'success')

    await DB.writeArtifactUsageEntry('Truck/abc-223', 'case1', timeBuff - 10000, timeBuff - 9000, 'Process1', '01', 'failed')
    await DB.writeArtifactUsageEntry('Truck/abc-223', 'case2', timeBuff - 9100, timeBuff - 8550, 'Process2', '01', 'failed')
    await DB.writeArtifactUsageEntry('Truck/abc-223', 'case3', timeBuff - 8400, timeBuff - 7900, 'Process1', '01', 'failed')
    await DB.writeArtifactUsageEntry('Truck/abc-223', 'case4', timeBuff - 7900, timeBuff - 7700, 'Process1', '02', 'success')
    await DB.writeArtifactUsageEntry('Truck/abc-223', 'case5', timeBuff - 7000, timeBuff - 6800, 'Process1', '03', 'success')

    await DB.writeArtifactUsageEntry('Truck/abc-323', 'case1', timeBuff - 10000, timeBuff - 9000, 'Process1', '01', 'failed')
    await DB.writeArtifactUsageEntry('Truck/abc-323', 'case2', timeBuff - 9100, timeBuff - 8555, 'Process2', '01', 'failed')
    await DB.writeArtifactUsageEntry('Truck/abc-323', 'case3', timeBuff - 8400, timeBuff - 8001, 'Process1', '01', 'failed')
    await DB.writeArtifactUsageEntry('Truck/abc-323', 'case4', timeBuff - 7900, timeBuff - 7000, 'Process1', '02', 'success')
    await DB.writeArtifactUsageEntry('Truck/abc-323', 'case5', timeBuff - 7000, timeBuff - 6800, 'Process1', '03', 'success')


    var job1 = new ArtifactUsageStatisticProcessing('obs-1', 'owner', [artifact1], 1)
    await wait(2100)
    expect(async () => {
        job1.terminate()
    }).not.toThrow()
    await wait(200)

    var expected1 = new Artifact('Truck', 'abc-123', ['Company-1'],
        new Map([[2, new FaultyRateWindow(2, 0, timeBuff + 2, timeBuff - 7800)],
        [3, new FaultyRateWindow(3, 3 / 2, timeBuff + 2, timeBuff - 8000)],
        [4, new FaultyRateWindow(4, 0.5, timeBuff + 2, timeBuff - 8500)]]), new Map(), 'localhost', '1883')

    var expected2 = new Artifact('Truck', 'abc-223', ['Company-1'],
        new Map([[2, new FaultyRateWindow(2, 0, timeBuff + 2, timeBuff - 7700)],
        [3, new FaultyRateWindow(3, 3 / 2, timeBuff + 2, timeBuff - 7900)],
        [4, new FaultyRateWindow(4, 0.5, timeBuff + 2, timeBuff - 8550)]]), new Map(), 'localhost', '1883')

    var expected3 = new Artifact('Truck', 'abc-323', ['Company-1'],
        new Map([[2, new FaultyRateWindow(2, 0, timeBuff + 2, timeBuff - 7000)],
        [3, new FaultyRateWindow(3, 3 / 2, timeBuff + 2, timeBuff - 8001)],
        [4, new FaultyRateWindow(4, 0.5, timeBuff + 2, timeBuff - 8555)]]), new Map(), 'localhost', '1883')

    var data1 = await DB.readArtifactDefinition('Truck', 'abc-123')
    var data2 = await DB.readArtifactDefinition('Truck', 'abc-223')
    var data3 = await DB.readArtifactDefinition('Truck', 'abc-323')

    expect(Math.abs(expected1.faulty_rates.get(2).updated - data1.faulty_rates.get(2).updated) < 3).toEqual(true)
    expect(Math.abs(expected1.faulty_rates.get(3).updated - data1.faulty_rates.get(3).updated) < 3).toEqual(true)
    expect(Math.abs(expected1.faulty_rates.get(4).updated - data1.faulty_rates.get(4).updated) < 3).toEqual(true)

    expect(Math.abs(expected2.faulty_rates.get(2).updated - data2.faulty_rates.get(2).updated) < 3).toEqual(true)
    expect(Math.abs(expected2.faulty_rates.get(3).updated - data2.faulty_rates.get(3).updated) < 3).toEqual(true)
    expect(Math.abs(expected2.faulty_rates.get(4).updated - data2.faulty_rates.get(4).updated) < 3).toEqual(true)

    expect(Math.abs(expected3.faulty_rates.get(2).updated - data3.faulty_rates.get(2).updated) < 3).toEqual(true)
    expect(Math.abs(expected3.faulty_rates.get(3).updated - data3.faulty_rates.get(3).updated) < 3).toEqual(true)
    expect(Math.abs(expected3.faulty_rates.get(4).updated - data3.faulty_rates.get(4).updated) < 3).toEqual(true)

    data1.faulty_rates.set(2, 0)
    expected1.faulty_rates.set(2, 0)
    data1.faulty_rates.set(3, 0)
    expected1.faulty_rates.set(3, 0)
    data1.faulty_rates.set(4, 0)
    expected1.faulty_rates.set(4, 0)

    data2.faulty_rates.set(2, 0)
    expected2.faulty_rates.set(2, 0)
    data2.faulty_rates.set(3, 0)
    expected2.faulty_rates.set(3, 0)
    data2.faulty_rates.set(4, 0)
    expected2.faulty_rates.set(4, 0)

    data3.faulty_rates.set(2, 0)
    expected3.faulty_rates.set(2, 0)
    data3.faulty_rates.set(3, 0)
    expected3.faulty_rates.set(3, 0)
    data3.faulty_rates.set(4, 0)
    expected3.faulty_rates.set(4, 0)

    expect(data1).toEqual(expected1)
    expect(data2).toEqual(expected2)
    expect(data3).toEqual(expected3)
})