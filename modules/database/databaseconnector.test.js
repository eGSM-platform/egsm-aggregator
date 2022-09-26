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

async function initArtifactTables() {
    var promises = []
    //ARTIFACT_EVENT
    var params = {
        AttributeDefinitions: [
            {
                AttributeName: 'ARTIFACT_NAME',
                AttributeType: 'S'
            },
            {
                AttributeName: 'EVENT_ID',
                AttributeType: 'S'
            }
        ],
        KeySchema: [
            {
                AttributeName: 'ARTIFACT_NAME',
                KeyType: 'HASH'
            },
            {
                AttributeName: 'EVENT_ID',
                KeyType: 'RANGE'
            }
        ],
        ProvisionedThroughput: {
            ReadCapacityUnits: 5,
            WriteCapacityUnits: 5
        },
        TableName: 'ARTIFACT_EVENT',
        StreamSpecification: {
            StreamEnabled: false
        }
    };

    // Call DynamoDB to create the table
    promises.push(new Promise((resolve, reject) => {
        DDB.createTable(params, function (err, data) {
            if (err) {
                reject(err)
            } else {
                resolve(data)
            }
        });
    }))

    //ARTIFACT_USAGE
    var params1 = {
        AttributeDefinitions: [
            {
                AttributeName: 'ARTIFACT_NAME',
                AttributeType: 'S'
            },
            {
                AttributeName: 'CASE_ID',
                AttributeType: 'S'
            }
        ],
        KeySchema: [
            {
                AttributeName: 'ARTIFACT_NAME',
                KeyType: 'HASH'
            },
            {
                AttributeName: 'CASE_ID',
                KeyType: 'RANGE'
            }
        ],
        ProvisionedThroughput: {
            ReadCapacityUnits: 5,
            WriteCapacityUnits: 5
        },
        TableName: 'ARTIFACT_USAGE',
        StreamSpecification: {
            StreamEnabled: false
        }
    };

    // Call DynamoDB to create the table
    promises.push(new Promise((resolve, reject) => {
        DDB.createTable(params1, function (err, data) {
            if (err) {
                reject(err)
            } else {
                resolve(data)
            }
        });
    }))

    //ARTIFACT_DEFINITION
    var params2 = {
        AttributeDefinitions: [
            {
                AttributeName: 'ARTIFACT_TYPE',
                AttributeType: 'S'
            },
            {
                AttributeName: 'ARTIFACT_ID',
                AttributeType: 'S'
            }
        ],
        KeySchema: [
            {
                AttributeName: 'ARTIFACT_TYPE',
                KeyType: 'HASH'
            },
            {
                AttributeName: 'ARTIFACT_ID',
                KeyType: 'RANGE'
            }
        ],
        ProvisionedThroughput: {
            ReadCapacityUnits: 5,
            WriteCapacityUnits: 5
        },
        TableName: 'ARTIFACT_DEFINITION',
        StreamSpecification: {
            StreamEnabled: false
        }
    };

    // Call DynamoDB to create the table
    promises.push(new Promise((resolve, reject) => {
        DDB.createTable(params2, function (err, data) {
            if (err) {
                reject(err)
            } else {
                resolve(data)
            }
        });
    }))
    await Promise.all(promises)
}

async function deleteArtifactTables() {
    var promises = []

    var params = {
        TableName: 'ARTIFACT_EVENT'
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

    params = {
        TableName: 'ARTIFACT_USAGE'
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

    params = {
        TableName: 'ARTIFACT_DEFINITION'
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

    await Promise.all(promises)
}


beforeEach(async () => {
    LOG.setLogLevel(5)
    await initArtifactTables();
});

afterEach(async () => {
    await deleteArtifactTables()
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
            ATTACHED_TO: { SS: ['ROOT'] },
            FAULTY_RATES: { M: {} },
            TIMING_FAULTY_RATES: { M: {} },
            STAKEHOLDERS: { SS: ['Best Truck Company', 'Maintainer Company'] },
        }
    }
    expect(data).toEqual(expected)
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

    await DB.writeNewProcessType('dummy','egsm','bpmn')
    var pk = { name: 'PROCESS_TYPE_NAME', value: 'dummy' }
    var data1 = await DYNAMO.readItem('PROCESS_TYPE', pk)
    var expected1 = {
        Item:{
            PROCESS_TYPE_NAME: {S:'dummy'},
            EGSM_MODEL:{S:'egsm'},
            BPMN_MODEL:{S:'bpmn'}
        }
    }
    expect(data1).toEqual(expected1)
})

//TODO

/*test('[writeNewProcessInstance][WRITE AND READ]', async () => {

})

test('[closeOngoingProcessInstance][WRITE AND READ]', async () => {

})

test('[writeNewStakeholder][WRITE AND READ]', async () => {

})*/
