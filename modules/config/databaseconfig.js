var DYNAMO = require('../database/dynamoconnector')

DYNAMO.initDynamo('fakeMyKeyId', 'fakeSecretAccessKey', 'local', 'http://localhost:8000')

var tables = [
    { name: 'ARTIFACT_DEFINITION', pk: 'ARTIFACT_TYPE', sk: 'ARTIFACT_ID' },
    { name: 'ARTIFACT_USAGE', pk: 'ARTIFACT_NAME', sk: 'CASE_ID' },
    { name: 'ARTIFACT_EVENT', pk: 'ARTIFACT_NAME', sk: 'EVENT_ID' },
    { name: 'PROCESS_TYPE', pk: 'PROCESS_TYPE_NAME', sk: undefined },
    { name: 'STAKEHOLDERS', pk: 'STAKEHOLDER_ID', sk: undefined },
    { name: 'PROCESS_INSTANCE', pk: 'PROCESS_TYPE_NAME', sk: 'INSTANCE_ID' },
    { name: 'PROCESS_GROUP_DEFINITION', pk: 'NAME', sk: undefined },

    { name: 'STAGE_EVENT', pk: 'PROCESS_NAME', sk: 'EVENT_ID' },
]

tables.forEach(element => {
    DYNAMO.initTable(element.name, element.pk, element.sk)
});