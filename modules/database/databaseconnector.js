var DYNAMO = require('./dynamoconnector')

var LOG = require('../auxiliary/LogManager');

module.id = 'DB-CONNECTOR'


//ARTIFACT-related operations

//Stakeholders should be a list of Strings
async function writeNewArtifactDefinition(artifactType, artifactId, stakeholders) {
    var pk = { name: 'ARTIFACT_TYPE', value: artifactType }
    var sk = { name: 'ARTIFACT_ID', value: artifactId }
    var attributes = []
    attributes.push({ name: 'STAKEHOLDERS', type: 'SS', value: stakeholders })
    attributes.push({ name: 'ATTACHED_TO', type: 'SS', value: ['ROOT'] })
    attributes.push({ name: 'FAULTY_RATES', type: 'M', value: {} }) // Empty map for faulty rates
    attributes.push({ name: 'TIMING_FAULTY_RATES', type: 'M', value: {} })
    const result = await DYNAMO.writeItem('ARTIFACT_DEFINITION', pk, sk, attributes)
    return result
}

async function getArtifactFaultyRateValues(artifactType, artifactId, window) {
    var keyexpression = 'ARTIFACT_TYPE = :a and ARTIFACT_ID = :b'
    var expressionattributevalues = {
        ':a': { S: artifactType },
        ':b': { S: artifactId },
        ':c': { S: window }
    }
    var filterexpression = 'FAULTY_RATES :c'
    const result = await DYNAMO.query('ARTIFACT_DEFINITION', keyexpression, expressionattributevalues, filterexpression)
    return result
}

function getFaultyRateHistory(artifactType, artifactId, window, maxelements) {
}

async function addNewFaultyRateWindow(artifactType, artifactId, window) {
    var pk = { name: 'ARTIFACT_TYPE', value: artifactType }
    var sk = { name: 'ARTIFACT_ID', value: artifactId }
    
    return DYNAMO.initNestedList('ARTIFACT_DEFINITION', pk, sk, `FAULTY_RATES.${window}`)
}

async function addArtifactFaultyRateToWindow(artifactType, artifactId, window, timestamp, faultyrate, lastcaseid) {
    var pk = { name: 'ARTIFACT_TYPE', value: artifactType }
    var sk = { name: 'ARTIFACT_ID', value: artifactId }
    var item = {type:'L', value:[{'S':lastcaseid}, {'N':timestamp.toString()},{'N':faultyrate.toString()}]}

    return DYNAMO.appendNestedListItem('ARTIFACT_DEFINITION', pk, sk, `FAULTY_RATES.${window}`, [item])
}

//Time faulty rate-related functions
async function addNewTimeFaultyRateWindow(artifactType, artifactId, window) {
    var pk = { name: 'ARTIFACT_TYPE', value: artifactType }
    var sk = { name: 'ARTIFACT_ID', value: artifactId }
    return  DYNAMO.initNestedList('ARTIFACT_DEFINITION', pk, sk, `TIME_FAULTY_RATES.${window}`)
}

async function addArtifactTimeFaultyRateToWindow(artifactType, artifactId, window, timestamp, faultyrate, lastcaseid) {
    var pk = { name: 'ARTIFACT_TYPE', value: artifactType }
    var sk = { name: 'ARTIFACT_ID', value: artifactId }
    var item = {type:'L', value:[{'S':lastcaseid}, {'N':timestamp.toString()},{'N':faultyrate.toString()}]}

    return DYNAMO.appendNestedListItem('ARTIFACT_DEFINITION', pk, sk, `TIME_FAULTY_RATES.${window}`, [item])
}

function writeArtifactEvent(eventDetailsJson) {
    var pk = { name: 'ARTIFACT_NAME', value: eventDetailsJson.artifact_name }
    var sk = { name: 'EVENT_ID', value: eventDetailsJson.event_id.toString() }
    var attributes = []
    attributes.push({ name: 'UTC_TIME', type: 'N', value: eventDetailsJson.timestamp.toString() })
    attributes.push({ name: 'ARTIFACT_STATE', type: 'S', value: eventDetailsJson.artifact_state })
    attributes.push({ name: 'PROCESS_TYPE', type: 'S', value: eventDetailsJson.process_type })
    attributes.push({ name: 'PROCESS_ID', type: 'S', value: eventDetailsJson.process_id })
    attributes.push({ name: 'ENTRY_PROCESSED', type: 'N', value: '0' })

    DYNAMO.writeItem('ARTIFACT_EVENT', pk, sk, attributes)
}

async function readUnprocessedArtifactEvents(artifactName) {
    var keyexpression = 'ARTIFACT_NAME = :a'
    var expressionattributevalues = {
        ':a': { S: artifactName },
        ':b': { N: '0' }
    }
    var filterexpression = 'ENTRY_PROCESSED = :b'
    const result = await DYNAMO.query('ARTIFACT_EVENT', keyexpression, expressionattributevalues, filterexpression)
    return result
}

async function readOlderArtifactEvents(artifactName, upperutctime) {
    var keyexpression = 'ARTIFACT_NAME = :a'
    var expressionattributevalues = {
        ':a': { S: artifactName },
        ':b': { N: upperutctime.toString() }
    }
    var filterexpression = 'UTC_TIME <= :b'
    const result = await DYNAMO.query('ARTIFACT_EVENT', keyexpression, expressionattributevalues, filterexpression)
    return result
}

function setArtifactEventToProcessed(artifactname, eventid) {
    DYNAMO.updateItem('ARTIFACT_EVENT', { name: 'ARTIFACT_NAME', value: artifactname },
        { name: 'EVENT_ID', value: eventid }, [{ name: 'ENTRY_PROCESSED', type: 'N', value: '1' }])
}

function deleteArtifactEvent(artifactname, eventid) {
    DYNAMO.deleteItem('ARTIFACT_EVENT', { name: 'ARTIFACT_NAME', value: artifactname },
        { name: 'EVENT_ID', value: eventid })
}

//PROCESS_TYPE related operations
function writeNewProcessType(proccesstype, egsm, bpmn,) {
    var pk = { name: 'PROCESS_TYPE_NAME', value: proccesstype }
    var attributes = []
    attributes.push({ name: 'EGSM_MODEL', type: 'S', value: egsm })
    attributes.push({ name: 'BPMN_MODEL', type: 'S', value: bpmn })
    DYNAMO.writeItem('PROCESS_TYPE', pk, undefined, attributes)
}

//PROCESS_INSTANCE-related operations

//Function to create a new process instance
//Process instance status is automatically set to 'ongoing'
//Status can be changed and end time can be added by closeOngoingProcessInstance function 
function writeNewProcessInstance(processtype, instanceid, stakeholders, groups, startingtime) {
    var pk = { name: 'PROCESS_TYPE_NAME', value: processtype }
    var sk = { name: 'INSTANCE_ID', value: instanceid }
    //Add placeholder to lists if they are empty or undefined
    if (groups.length == 0) {
        groups.push('ROOT')
    }
    if (stakeholders.length == 0) {
        stakeholders.push('ROOT')
    }
    var attributes = []
    attributes.push({ name: 'STAKEHOLDERS', type: 'SS', value: stakeholders })
    attributes.push({ name: 'GROUPS', type: 'SS', value: groups })
    attributes.push({ name: 'STARTING_TIME', type: 'N', value: startingtime.toString() })
    attributes.push({ name: 'ENDING_TIME', type: 'N', value: '-1' })
    attributes.push({ name: 'STATUS', type: 'S', value: 'ongoing' })
    DYNAMO.writeItem('PROCESS_INSTANCE', pk, sk, attributes)
}

function closeOngoingProcessInstance(processtype, instanceid, endtime) {
    var pk = { name: 'PROCESS_TYPE_NAME', value: processtype }
    var sk = { name: 'INSTANCE_ID', value: instanceid }
    var attributes = []
    attributes.push({ name: 'ENDING_TIME', type: 'N', value: endtime.toString() })
    attributes.push({ name: 'STATUS', type: 'S', value: 'finished' })
    DYNAMO.updateItem('PROCESS_INSTANCE', pk, sk, attributes)
}

//STAKEHOLDER operations
function writeNewStakeholder(stakeholderid, notificationTopic) {
    var pk = { name: 'STAKEHOLDER_ID', value: stakeholderid }
    var attributes = []
    attributes.push({ name: 'NOTIFICATION_TOPIC', type: 'S', value: notificationTopic })
    DYNAMO.writeItem('STAKEHOLDERS', pk, undefined, attributes)
}





























//STAGE EVENTS
function writeStageEvent(processName, stageName, eventid, stageDetails, utcTimeStamp) {

    var pk = { name: 'PROCESS_NAME', value: processName }
    var sk = { name: 'EVENT_ID', value: eventid.toString() }
    var attributes = []
    attributes.push({ name: 'TIME', type: 'N', value: utcTimeStamp.toString() })
    attributes.push({ name: 'STAGE_DETAILS', value: stageDetails })
    DYNAMO.writeItem('STAGE_EVENT', pk, sk, attributes)
}

//ARTIFACT DEFINITION OPERATIONS
//Should be called when an artifact is attached/detached from a process
function addArtifactAttachment(artifactType, artifactId, processName) {
    DYNAMO.readItem('ARTIFACT_DEFINITION', { name: 'TYPE', value: artifactType, }, { name: 'ID', value: artifactId }, 'ATTACHED_TO')
        .then(function (data) {
            var processes = []
            if (data.Item.ATTACHED_TO) {
                console.log(data.Item.ATTACHED_TO.SS)
                if (data.Item.ATTACHED_TO.SS.includes(processName)) {
                    return
                }
                processes = [...data.Item.ATTACHED_TO.SS];
            }
            processes.push(processName)
            DYNAMO.updateItem('ARTIFACT_DEFINITION',
                { name: 'TYPE', value: artifactType },
                { name: 'ID', value: artifactId },
                [{ name: 'ATTACHED_TO', type: 'SS', value: processes }])
        }).catch(err => { console.log('error:' + err) })
}

function removeArtifactAttachment(artifactType, artifactId, processName) {
    DYNAMO.readItem('ARTIFACT_DEFINITION', { name: 'TYPE', value: artifactType, }, { name: 'ID', value: artifactId }, 'ATTACHED_TO')
        .then(function (data) {
            var processes = []
            if (!data.Item.ATTACHED_TO) {
                return
            }
            else {
                console.log(data.Item.ATTACHED_TO.SS)
                if (!data.Item.ATTACHED_TO.SS.includes(processName)) {
                    return
                }
                for (var i = 0; i < data.Item.ATTACHED_TO.SS.length; i++) {
                    if (data.Item.ATTACHED_TO.SS[i] === processName) {
                        data.Item.ATTACHED_TO.SS.splice(i, 1);
                    }
                }
                processes = [...data.Item.ATTACHED_TO.SS];
                DYNAMO.updateItem('ARTIFACT_DEFINITION',
                    { name: 'TYPE', value: artifactType },
                    { name: 'ID', value: artifactId },
                    [{ name: 'ATTACHED_TO', type: 'SS', value: processes }])
            }
        }).catch(err => { console.log('error:' + err) })
}

function deleteArtifact(artifactType, artifactId) {
    throw new Error('Non-implemented function')
}

//PROCESS DEFINITION OPERATIONS
function writeNewProcessDefinition(processType, processID, stakeholders, groups, status) {
    var pk = { name: 'TYPE', value: processType }
    var sk = { name: 'ID', value: processID }
    if (groups.length == 0) {
        groups.push('ROOT')
    }
    var attributes = []
    attributes.push({ name: 'STAKEHOLDERS', type: 'SS', value: stakeholders })
    attributes.push({ name: 'GROUPS', type: 'SS', value: groups })
    attributes.push({ name: 'STATUS', type: 'S', value: status })
    DYNAMO.writeItem('PROCESS_DEFINITION', pk, sk, attributes)
}

function updateProcessState(processType, processId, newState) {
    DYNAMO.updateItem('PROCESS_DEFINITION',
        { name: 'TYPE', value: processType },
        { name: 'ID', value: processId },
        [{ name: 'STATUS', type: 'S', value: newState }])
}









//PROCESS_GROUP_DEFINITION Table operations
function writeNewProcessGroup(groupname) {
    var pk = { name: 'NAME', value: groupname }
    var attributes = []
    attributes.push({ name: 'PROCESSES', type: 'SS', value: ['ROOT'] })
    DYNAMO.writeItem('PROCESS_GROUP_DEFINITION', pk, undefined, attributes)
}

function addProcessToProcessGroup(groupname, processName) {
    DYNAMO.readItem('PROCESS_GROUP_DEFINITION', { name: 'NAME', value: groupname })
        .then(function (data) {
            var processes = []
            if (data.Item.PROCESSES) {
                console.log(data.Item.PROCESSES.SS)
                if (data.Item.PROCESSES.SS.includes(processName)) {
                    return
                }
                processes = [...data.Item.PROCESSES.SS];
            }
            processes.push(processName)
            DYNAMO.updateItem('PROCESS_GROUP_DEFINITION',
                { name: 'NAME', value: groupname },
                undefined,
                [{ name: 'PROCESSES', type: 'SS', value: processes }])
        }).catch(err => { console.log('error:' + err) })
}

function removeProcessFromProcessGroup(groupname, processName) {
    DYNAMO.readItem('PROCESS_GROUP_DEFINITION', { name: 'NAME', value: groupname })
        .then(function (data) {
            var processes = []
            if (!data.Item.PROCESSES) {
                return
            }
            else {
                console.log(data.Item.PROCESSES.SS)
                if (!data.Item.PROCESSES.SS.includes(processName)) {
                    return
                }
                for (var i = 0; i < data.Item.PROCESSES.SS.length; i++) {
                    if (data.Item.PROCESSES.SS[i] === processName) {
                        data.Item.PROCESSES.SS.splice(i, 1);
                    }
                }
                processes = [...data.Item.PROCESSES.SS];
                DYNAMO.updateItem('PROCESS_GROUP_DEFINITION',
                    { name: 'NAME', value: groupname },
                    undefined,
                    [{ name: 'PROCESSES', type: 'SS', value: processes }])
            }
        }).catch(err => { console.log('error:' + err) })
}

module.exports = {
    writeNewArtifactDefinition: writeNewArtifactDefinition,
    addNewFaultyRateWindow: addNewFaultyRateWindow,
    addArtifactFaultyRateToWindow:addArtifactFaultyRateToWindow,
    getArtifactFaultyRateValues:getArtifactFaultyRateValues,

    writeArtifactEvent: writeArtifactEvent,
    readUnprocessedArtifactEvents: readUnprocessedArtifactEvents,
    setArtifactEventToProcessed: setArtifactEventToProcessed,
    readOlderArtifactEvents: readOlderArtifactEvents,
    deleteArtifactEvent: deleteArtifactEvent,
    writeNewProcessType: writeNewProcessType,
    writeNewProcessInstance: writeNewProcessInstance,
    closeOngoingProcessInstance: closeOngoingProcessInstance,
    writeNewStakeholder: writeNewStakeholder,
}
