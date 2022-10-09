/*var PP = require('./postprocessor')
var DYNAMO = require('../database/dynamoconnector')
var DB = require('../database/databaseconnector')

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
    DYNAMO.initDynamo('fakeMyKeyId', 'fakeSecretAccessKey', 'local', 'http://localhost:9000')
});

beforeEach(async () => {
    LOG.setLogLevel(5)
    await initTables()
});

afterEach(async () => {
    await deleteTables()
})

test ('test', async () => {
    PP.processArtifactEvents()
})*/