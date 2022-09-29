var AWS = require('aws-sdk');
var LOG = require('../auxiliary/LogManager')
var AUX = require('../auxiliary/auxiliary')
//LOG.setLogLevel(5)

var DYNAMO = require('./dynamoconnector')
var DB = require('./databaseconnector')
const accessKeyId = 'fakeMyKeyId';
const secretAccessKey = 'fakeSecretAccessKey';
// Create the DynamoDB service object
// Set the region 
AWS.config.update({
    region: "local",
    endpoint: "http://localhost:8000",
    accessKeyId,
    secretAccessKey,
});
var DDB = new AWS.DynamoDB({ apiVersion: '2012-08-10' });

async function initTable(tablename, pk, sk) {
    var params = {
        AttributeDefinitions: [
            {
                AttributeName: pk,
                AttributeType: 'S'
            }
        ],
        KeySchema: [
            {
                AttributeName: pk,
                KeyType: 'HASH'
            }
        ],
        ProvisionedThroughput: {
            ReadCapacityUnits: 5,
            WriteCapacityUnits: 5
        },
        TableName: tablename,
        StreamSpecification: {
            StreamEnabled: false
        }
    };
    if (sk != undefined) {
        params.AttributeDefinitions.push(
            {
                AttributeName: sk,
                AttributeType: 'S'
            })
        params.KeySchema.push(
            {
                AttributeName: sk,
                KeyType: 'RANGE'
            })
    }

    // Call DynamoDB to create the table
    return new Promise((resolve, reject) => {
        DDB.createTable(params, function (err, data) {
            if (err) {
                reject(err)
            } else {
                resolve(data)
            }
        });
    })
}

async function initTables() {
    var promises = []
    promises.push(initTable('PROCESS_TYPE', 'PROCESS_TYPE_NAME', undefined))
    promises.push(initTable('PROCESS_INSTANCE', 'PROCESS_TYPE_NAME', 'INSTANCE_ID'))
    promises.push(initTable('PROCESS_GROUP_DEFINITION', 'NAME', undefined))
    promises.push(initTable('STAKEHOLDERS', 'STAKEHOLDER_ID', undefined))

    promises.push(initTable('ARTIFACT_DEFINITION', 'ARTIFACT_TYPE', 'ARTIFACT_ID'))
    promises.push(initTable('ARTIFACT_USAGE', 'ARTIFACT_NAME', 'CASE_ID'))
    promises.push(initTable('ARTIFACT_EVENT', 'ARTIFACT_NAME', 'EVENT_ID'))
    await Promise.all(promises)
}

async function deleteTables() {
    var TABLES = [
        'PROCESS_TYPE', 'PROCESS_INSTANCE', 'PROCESS_GROUP_DEFINITION', 'STAKEHOLDERS',
        'ARTIFACT_EVENT', 'ARTIFACT_USAGE', 'ARTIFACT_DEFINITION'
    ]
    var promises = []

    TABLES.forEach(element => {
        var params = {
            TableName: element
        };
        promises.push(new Promise((resolve, reject) => {
            DDB.deleteTable(params, function (err, data) {
                if (err) {
                    reject(err)
                } else {
                    resolve(data)
                }
            });
        }))
    });
    await Promise.all(promises)
}


beforeEach(async () => {
    LOG.setLogLevel(5)
    await initTables()
});

afterEach(async () => {
    await deleteTables()
})

//TEST CASES BEGIN

test('[writeNewArtifactDefinition] [WRITE AND READ]', async () => {
    await DB.writeNewArtifactDefinition('truck', 'instance-1', ['Best Truck Company', 'Maintainer Company'])

    var pk = { name: 'ARTIFACT_TYPE', value: 'truck' }
    var sk = { name: 'ARTIFACT_ID', value: 'instance-1' }
    const data = await DYNAMO.readItem('ARTIFACT_DEFINITION', pk, sk)
    var expected = {
        Item: {
            ARTIFACT_TYPE: { S: 'truck' },
            ARTIFACT_ID: { S: 'instance-1' },
            //ATTACHED_TO: { SS: [] },
            FAULTY_RATES: { M: {} },
            TIMING_FAULTY_RATES: { M: {} },
            STAKEHOLDERS: { SS: ['Best Truck Company', 'Maintainer Company'] },
        }
    }
    expect(data).toEqual(expected)
})

test('[isArtifactDefined] [WRITE AND READ]', async () => {
    await DB.writeNewArtifactDefinition('truck', 'instance-1', ['Best Truck Company', 'Maintainer Company'])

    const data = await DB.isArtifactDefined('truck', 'instance-1')
    expect(data).toEqual(true)

    const data2 = await DB.isArtifactDefined('truck', 'instance-2')
    expect(data2).toEqual(false)
})

test('[getArtifactStakeholders] [WRITE AND READ]', async () => {
    //Assumed that the list is not empty (There is always at least one stakeholder)
    await DB.writeNewArtifactDefinition('truck', 'instance-1', ['Best Truck Company', 'Maintainer Company'])

    const data = await DB.getArtifactStakeholders('truck', 'instance-1')
    var expected = ["Best Truck Company", "Maintainer Company"]
    expect(data).toEqual(expected)
})

test('[addNewFaultyRateWindow] [WRITE AND READ]', async () => {
    //Adding a new Artifact
    await DB.writeNewArtifactDefinition('truck', 'instance-2', ['Best Truck Company', 'Maintainer Company'])

    //Defining a new Faulty Rate Window
    await DB.addNewFaultyRateWindow('truck', 'instance-2', 10)

    var pk = { name: 'ARTIFACT_TYPE', value: 'truck' }
    var sk = { name: 'ARTIFACT_ID', value: 'instance-2' }
    const data = await DYNAMO.readItem('ARTIFACT_DEFINITION', pk, sk, 'FAULTY_RATES.w10')

    var expected = {
        Item: {
            FAULTY_RATES: {
                M: {
                    w10: {
                        L: []
                    }
                }
            }
        }
    }
    expect(data).toEqual(expected)

    const data2 = await DYNAMO.readItem('ARTIFACT_DEFINITION', pk, sk, 'FAULTY_RATE_10')
    var expected2 = {
        Item: {
            FAULTY_RATE_10: {
                N: '-1'
            }
        }
    }
    expect(data2).toEqual(expected2)
})

test('[addArtifactFaultyRateToWindow] [WRITE AND READ]', async () => {
    //Adding a new Artifact
    await DB.writeNewArtifactDefinition('truck', 'instance-2', ['Best Truck Company', 'Maintainer Company'])

    //Defining a new Faulty Rate Window
    await DB.addNewFaultyRateWindow('truck', 'instance-2', 10)

    //Adding the first faulty rate to the prepared data structures
    await DB.addArtifactFaultyRateToWindow('truck', 'instance-2', 10, 1000, 25.254, 'case_123')

    var pk = { name: 'ARTIFACT_TYPE', value: 'truck' }
    var sk = { name: 'ARTIFACT_ID', value: 'instance-2' }
    const data = await DYNAMO.readItem('ARTIFACT_DEFINITION', pk, sk, 'FAULTY_RATES.w10')

    var expected = {
        Item: {
            FAULTY_RATES: {
                M: {
                    w10: {
                        L: [{ L: [{ S: 'case_123' }, { N: '1000' }, { N: '25.254' }] }]
                    }
                }
            }
        }
    }
    expect(data).toEqual(expected)

    const data2 = await DYNAMO.readItem('ARTIFACT_DEFINITION', pk, sk, 'FAULTY_RATE_10')
    var expected2 = {
        Item: {
            FAULTY_RATE_10: {
                N: '25.254'
            }
        }
    }
    expect(data2).toEqual(expected2)

    //Adding a second value to the same window
    await DB.addArtifactFaultyRateToWindow('truck', 'instance-2', 10, 1100, 15.15, 'case_321')

    const data3 = await DYNAMO.readItem('ARTIFACT_DEFINITION', pk, sk, 'FAULTY_RATES.w10')

    var expected3 = {
        Item: {
            FAULTY_RATES: {
                M: {
                    w10: {
                        L: [{ L: [{ S: 'case_123' }, { N: '1000' }, { N: '25.254' }] },
                        { L: [{ S: 'case_321' }, { N: '1100' }, { N: '15.15' }] }]
                    }
                }
            }
        }
    }
    expect(data3).toEqual(expected3)

    const data4 = await DYNAMO.readItem('ARTIFACT_DEFINITION', pk, sk, 'FAULTY_RATE_10')
    var expected4 = {
        Item: {
            FAULTY_RATE_10: {
                N: '15.15'
            }
        }
    }
    expect(data4).toEqual(expected4)

    //Adding a second window
    //Defining a new Faulty Rate Window
    await DB.addNewFaultyRateWindow('truck', 'instance-2', 20)

    //Adding the first faulty rate to the prepared data structures
    await DB.addArtifactFaultyRateToWindow('truck', 'instance-2', 20, 2000, 99.99, 'case_555')

    const data5 = await DYNAMO.readItem('ARTIFACT_DEFINITION', pk, sk, 'FAULTY_RATES')

    var expected5 = {
        Item: {
            FAULTY_RATES: {
                M: {
                    w10: {
                        L: [{ L: [{ S: 'case_123' }, { N: '1000' }, { N: '25.254' }] },
                        { L: [{ S: 'case_321' }, { N: '1100' }, { N: '15.15' }] }]
                    },
                    w20: {
                        L: [{ L: [{ S: 'case_555' }, { N: '2000' }, { N: '99.99' }] }]
                    }
                }
            }
        }
    }
    expect(data5).toEqual(expected5)

    const data6 = await DYNAMO.readItem('ARTIFACT_DEFINITION', pk, sk, 'FAULTY_RATE_20')
    var expected6 = {
        Item: {
            FAULTY_RATE_20: {
                N: '99.99'
            }
        }
    }
    expect(data6).toEqual(expected6)
})


test('[getArtifactFaultyRateValues] [WRITE AND READ]', async () => {
    //Adding a new Artifact
    await DB.writeNewArtifactDefinition('truck', 'instance-2', ['Best Truck Company', 'Maintainer Company'])

    //Defining a new Faulty Rate Window
    await DB.addNewFaultyRateWindow('truck', 'instance-2', 10)

    //Adding the first faulty rate to the prepared data structures
    await DB.addArtifactFaultyRateToWindow('truck', 'instance-2', 10, 1000, 25.254, 'case_123')

    const data = await DB.getArtifactFaultyRateValues('truck', 'instance-2', 10)

    var expected = [{ case_id: 'case_123', timestamp: 1000, faulty_rate: 25.254 }]
    expect(data).toEqual(expected)

    //Adding a second entry
    await DB.addArtifactFaultyRateToWindow('truck', 'instance-2', 10, 2000, 99.99, 'case_555')

    const data2 = await DB.getArtifactFaultyRateValues('truck', 'instance-2', 10)

    var expected2 = [{ case_id: 'case_123', timestamp: 1000, faulty_rate: 25.254 },
    { case_id: 'case_555', timestamp: 2000, faulty_rate: 99.99 }]
    expect(data2).toEqual(expected2)
})


test('[getArtifactFaultyRateLatest] [WRITE AND READ]', async () => {
    //Adding a new Artifact
    await DB.writeNewArtifactDefinition('truck', 'instance-3', ['Best Truck Company', 'Maintainer Company'])

    //Defining a new Faulty Rate Window
    await DB.addNewFaultyRateWindow('truck', 'instance-3', 10)

    const data = await DB.getArtifactFaultyRateLatest('truck', 'instance-3', 10)

    var expected = -1
    expect(data).toEqual(expected)

    //Adding the first faulty rate to the prepared data structures
    await DB.addArtifactFaultyRateToWindow('truck', 'instance-3', 10, 1000, 25.254, 'case_123')

    const data1 = await DB.getArtifactFaultyRateLatest('truck', 'instance-3', 10)

    var expected1 = 25.254
    expect(data1).toEqual(expected1)

    //Adding a second entry
    await DB.addArtifactFaultyRateToWindow('truck', 'instance-3', 10, 2000, 99.99, 'case_555')

    const data2 = await DB.getArtifactFaultyRateLatest('truck', 'instance-3', 10)

    var expected2 = 99.99
    expect(data2).toEqual(expected2)
})


//EVENT RELATED TESTS
test('[writeArtifactEvent] [WRITE AND READ]', async () => {
    //Writing Artifact Event
    var eventDetailJson = {
        timestamp: 1000,
        artifact_name: 'artifact/instance1',
        artifact_state: 'attached',
        process_type: 'process_type1',
        process_id: '001',
        event_id: 'event-001'
    }
    await DB.writeArtifactEvent(eventDetailJson)

    var pk = { name: 'ARTIFACT_NAME', value: 'artifact/instance1' }
    var sk = { name: 'EVENT_ID', value: 'event-001' }
    const data = await DYNAMO.readItem('ARTIFACT_EVENT', pk, sk)
    var expected = {
        Item: {
            ARTIFACT_NAME: { S: 'artifact/instance1' },
            EVENT_ID: { S: 'event-001' },
            UTC_TIME: { N: '1000' },
            ARTIFACT_STATE: { S: 'attached' },
            PROCESS_TYPE: { S: 'process_type1' },
            PROCESS_ID: { S: '001' },
            ENTRY_PROCESSED: { N: '0' }
        }
    }
    expect(data).toEqual(expected)

})


test('[readUnprocessedArtifactEvents] [WRITE AND READ]', async () => {
    //Writing Artifact Events
    for (var i = 0; i < 5; i++) {
        var eventDetailJson = {
            timestamp: 1000,
            artifact_name: 'artifact1/instance1',
            artifact_state: 'attached',
            process_type: 'process_type1',
            process_id: '001',
            event_id: `event-${i}`
        }
        await DB.writeArtifactEvent(eventDetailJson)
    }

    //Read unprocessed entries (all should be unprocessed)
    var data1 = await DB.readUnprocessedArtifactEvents('artifact1/instance1')
    var expected1 = []
    for (var i = 0; i < 5; i++) {
        expected1.push({
            ARTIFACT_NAME: { S: 'artifact1/instance1' },
            EVENT_ID: { S: `event-${i}` },
            UTC_TIME: { N: '1000' },
            ARTIFACT_STATE: { S: 'attached' },
            PROCESS_TYPE: { S: 'process_type1' },
            PROCESS_ID: { S: '001' },
            ENTRY_PROCESSED: { N: '0' }
        })
    }
    expect(data1).toEqual(expected1)
})

test('[readOlderArtifactEvents] [WRITE AND READ]', async () => {
    //Writing Artifact Events
    for (var i = 0; i < 15; i++) {
        var eventDetailJson = {
            timestamp: 1000 + i,
            artifact_name: 'artifact1/instance1',
            artifact_state: 'attached',
            process_type: 'process_type1',
            process_id: '001',
            event_id: `event-${i}`
        }
        await DB.writeArtifactEvent(eventDetailJson)
    }

    //Read unprocessed entries (all should be unprocessed)
    var data1 = await DB.readOlderArtifactEvents('artifact1/instance1', 1004)
    var expected1 = []
    for (var i = 0; i < 5; i++) {
        expected1.push({
            ARTIFACT_NAME: { S: 'artifact1/instance1' },
            EVENT_ID: { S: `event-${i}` },
            UTC_TIME: { N: `${1000 + i}` },
            ARTIFACT_STATE: { S: 'attached' },
            PROCESS_TYPE: { S: 'process_type1' },
            PROCESS_ID: { S: '001' },
            ENTRY_PROCESSED: { N: '0' }
        })
    }
    expect(data1).toEqual(expected1)
})

test('[setArtifactEventToProcessed] [WRITE AND READ]', async () => {
    //Writing Artifact Events
    for (var i = 0; i < 2; i++) {
        var eventDetailJson = {
            timestamp: 1000 + i,
            artifact_name: 'artifact1/instance1',
            artifact_state: 'attached',
            process_type: 'process_type1',
            process_id: '001',
            event_id: `event-${i}`
        }
        await DB.writeArtifactEvent(eventDetailJson)
    }

    for (var i = 0; i < 1; i++) {
        await DB.setArtifactEventToProcessed('artifact1/instance1', `event-${i}`)
    }

    //Read unprocessed entries (all should be unprocessed)
    var data1 = await DB.readUnprocessedArtifactEvents('artifact1/instance1')
    var expected1 = []
    for (var i = 1; i < 2; i++) {
        expected1.push({
            ARTIFACT_NAME: { S: 'artifact1/instance1' },
            EVENT_ID: { S: `event-${i}` },
            UTC_TIME: { N: `${1000 + i}` },
            ARTIFACT_STATE: { S: 'attached' },
            PROCESS_TYPE: { S: 'process_type1' },
            PROCESS_ID: { S: '001' },
            ENTRY_PROCESSED: { N: '0' }
        })
    }
    expect(data1).toEqual(expected1)
})

test('[deleteArtifactEvent] [WRITE AND READ]', async () => {
    //Writing Artifact Events
    for (var i = 0; i < 15; i++) {
        var eventDetailJson = {
            timestamp: 1000 + i,
            artifact_name: 'artifact1/instance1',
            artifact_state: 'attached',
            process_type: 'process_type1',
            process_id: '001',
            event_id: `event-${i}`
        }
        await DB.writeArtifactEvent(eventDetailJson)
    }

    for (var i = 0; i < 15; i++) {
        await DB.deleteArtifactEvent('artifact1/instance1', `event-${i}`)
    }

    //Read unprocessed entries (all should be unprocessed)
    var data1 = await DB.readUnprocessedArtifactEvents('artifact1/instance1')
    var expected1 = []

    expect(data1).toEqual(expected1)
})

test('[writeArtifactUsageEntry][readArtifactUsageEntries] [WRITE AND READ]', async () => {
    for (var i = 0; i < 5; i++) {
        await DB.writeArtifactUsageEntry('truck/001', `case_${i}`, 1000 + 1, 1500 + i, 'dummy', 'instance_1', 'success')
    }
    for (var i = 0; i < 5; i++) {
        await DB.writeArtifactUsageEntry('truck/001', `case_${i + 10}`, 1000 + 1, 1250 + i, 'dummy', 'instance_1', 'success')
    }

    var data1 = await DB.readArtifactUsageEntries('truck/001', 1500, 1500)
    var expected1 = [{
        "ARTIFACT_NAME": "truck/001",
        "ATTACHED_TIME": "1001",
        "CASE_ID": "case_0",
        "DETACHED_TIME": "1500",
        "OUTCOME": "success",
        "PROCESS_ID": "instance_1",
        "PROCESS_TYPE": "dummy",
    }]

    expect(data1).toEqual(expected1)

    var data2 = await DB.readArtifactUsageEntries('truck/001', 1250, 1499)
    var expected2 = []
    for (var i = 0; i < 5; i++) {
        expected2.push({
            "ARTIFACT_NAME": "truck/001",
            "ATTACHED_TIME": "1001",
            "CASE_ID": `case_${i + 10}`,
            "DETACHED_TIME": `${1250 + i}`,
            "OUTCOME": "success",
            "PROCESS_ID": "instance_1",
            "PROCESS_TYPE": "dummy",
        })
    }

    expect(data2).toEqual(expected2)
})

test('[writeArtifactUsageEntry][deleteArtifactUsageEntries] [WRITE AND DELETE]', async () => {
    for (var i = 0; i < 10; i++) {
        await DB.writeArtifactUsageEntry('truck/001', `case_${i}`, 1000 + 1, 1500 + i, 'dummy', 'instance_1', 'success')
    }

    for (var i = 0; i < 10; i++) {
        await DB.deleteArtifactUsageEntries('truck/001', `case_${i}`)
    }
    var data1 = await DB.readArtifactUsageEntries('truck/001', 1500, 1500)
    var expected1 = []

    expect(data1).toEqual(expected1)
})

test('[writeNewProcessType][WRITE AND READ]', async () => {

    await DB.writeNewProcessType('dummy', 'egsm', 'bpmn')
    var pk = { name: 'PROCESS_TYPE_NAME', value: 'dummy' }
    var data1 = await DYNAMO.readItem('PROCESS_TYPE', pk)
    var expected1 = {
        Item: {
            PROCESS_TYPE_NAME: { S: 'dummy' },
            EGSM_MODEL: { S: 'egsm' },
            BPMN_MODEL: { S: 'bpmn' }
        }
    }
    expect(data1).toEqual(expected1)
})

test('[readProcessType][WRITE AND READ]', async () => {

    await DB.writeNewProcessType('dummy', 'egsm1', 'bpmn1')
    var data1 = await DB.readProcessType('dummy')
    var expected1 = {
        processtype: 'dummy',
        egsmmodel: 'egsm1',
        bpmnmodel: 'bpmn1'
    }
    expect(data1).toEqual(expected1)

    var data2 = await DB.readProcessType('dummy2')
    var expected2 = undefined
    expect(data2).toEqual(expected2)
})

test('[writeNewProcessInstance][readProcessInstance][WRITE AND READ]', async () => {
    await DB.writeNewProcessInstance('dummy1', 'instance-1', ['stakeholder1', 'stakeholder2', 'stakeholder3'], ['group1', 'group2'], 1000)
    const data1 = await DB.readProcessInstance('dummy1', 'instance-1')
    var expected1 = {
        processtype: 'dummy1',
        instanceid: 'instance-1',
        startingtime: 1000,
        endingtime: -1,
        status: 'ongoing',
        stakeholders: ['stakeholder1', 'stakeholder2', 'stakeholder3'],
        groups: ['group1', 'group2']
    }
    expect(data1).toEqual(expected1)

    //With empty arrays
    await DB.writeNewProcessInstance('dummy2', 'instance-1', [], [], 1000)
    const data2 = await DB.readProcessInstance('dummy2', 'instance-1')
    var expected2 = {
        processtype: 'dummy2',
        instanceid: 'instance-1',
        startingtime: 1000,
        endingtime: -1,
        status: 'ongoing',
        stakeholders: [],
        groups: []
    }
    expect(data2).toEqual(expected2)

    //Read undefined process
    const data3 = await DB.readProcessInstance('dummy22', 'instance-2')
    var expected3 = undefined
    expect(data3).toEqual(expected3)
})

test('[closeOngoingProcessInstance][WRITE AND READ]', async () => {
    await DB.writeNewProcessInstance('dummy1', 'instance-1', ['stakeholder1', 'stakeholder2', 'stakeholder3'], ['group1', 'group2'], 1000)
    await DB.closeOngoingProcessInstance('dummy1', 'instance-1', 1550)

    const data1 = await DB.readProcessInstance('dummy1', 'instance-1')
    var expected1 = {
        processtype: 'dummy1',
        instanceid: 'instance-1',
        startingtime: 1000,
        endingtime: 1550,
        status: 'finished',
        stakeholders: ['stakeholder1', 'stakeholder2', 'stakeholder3'],
        groups: ['group1', 'group2']
    }
    expect(data1).toEqual(expected1)

    //With empty arrays
    await DB.writeNewProcessInstance('dummy2', 'instance-1', [], [], 1000)
    await DB.closeOngoingProcessInstance('dummy2', 'instance-1', 2560)
    const data2 = await DB.readProcessInstance('dummy2', 'instance-1')
    var expected2 = {
        processtype: 'dummy2',
        instanceid: 'instance-1',
        startingtime: 1000,
        endingtime: 2560,
        status: 'finished',
        stakeholders: [],
        groups: []
    }
    expect(data2).toEqual(expected2)

    //Try to close undefined process
    expect(() => { DB.closeOngoingProcessInstance('dummy22', 'instance-3', 2560) }).not.toThrow()
})

test('[writeNewStakeholder][readStakeholder][WRITE AND READ]', async () => {
    await DB.writeNewStakeholder('company1', 'mqtt::notification/company1')
    const data1 = await DB.readStakeholder('company1')
    var expected1 = {
        id: 'company1', 
        topic: 'mqtt::notification/company1'
    }
    expect(data1).toEqual(expected1)

    //Try to read undefined
    const data2 = await DB.readStakeholder('company21')
    var expected2 = undefined
    expect(data2).toEqual(expected2)
})

test('[writeNewProcessGroup][readProcessGroup][WRITE AND READ]', async () => {
    //Define process group with non-empty process list and read back
    await DB.writeNewProcessGroup('group-1', ['process-1', 'process-2'])
    const data1 = await DB.readProcessGroup('group-1')
    var expected1 = {
        name: 'group-1',
        processes: ['process-1', 'process-2']
    }
    expect(data1).toEqual(expected1)

    //Define process group with empty process list and read back
    await DB.writeNewProcessGroup('group-2', [])

    const data2 = await DB.readProcessGroup('group-2')
    var expected2 = {
        name: 'group-2',
        processes: []
    }
    expect(data2).toEqual(expected2)

    //Try to read non-defined process group
    const data3 = await DB.readProcessGroup('group-3')
    var expected3 = undefined
    expect(data3).toEqual(expected3)
})

test('[writeNewProcessGroup][addProcessToProcessGroup][readProcessGroup][WRITE AND READ]', async () => {
    //Define process group with non-empty process list and read back
    await DB.writeNewProcessGroup('group-1', ['process-1', 'process-2'])
    await DB.addProcessToProcessGroup('group-1','process-3')
    const data1 = await DB.readProcessGroup('group-1')
    var expected1 = {
        name: 'group-1',
        processes: ['process-1', 'process-2','process-3']
    }
    expect(data1).toEqual(expected1)

    //Define process group with empty process list and read back
    await DB.writeNewProcessGroup('group-2', [])
    await DB.addProcessToProcessGroup('group-2','process-1')
    const data2 = await DB.readProcessGroup('group-2')
    var expected2 = {
        name: 'group-2',
        processes: ['process-1']
    }
    expect(data2).toEqual(expected2)

    //Try to add process to non-defined process group
    await DB.addProcessToProcessGroup('group-3','process-1')
    const data3 = await DB.readProcessGroup('group-3')
    var expected3 =  {
        name: 'group-3',
        processes: ['process-1']
    }
    expect(data3).toEqual(expected3)
})
