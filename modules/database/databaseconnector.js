var DYNAMO = require('./dynamoconnector')

var LOG = require('../auxiliary/LogManager');
const { updateItem } = require('./dynamoconnector');

module.id = 'DB-CONNECTOR'


//ARTIFACT-related operations

//Stakeholders should be a list of Strings
async function writeNewArtifactDefinition(artifactType, artifactId, stakeholders) {
    var pk = { name: 'ARTIFACT_TYPE', value: artifactType }
    var sk = { name: 'ARTIFACT_ID', value: artifactId }
    var attributes = []
    attributes.push({ name: 'STAKEHOLDERS', type: 'SS', value: stakeholders })
    //attributes.push({ name: 'ATTACHED_TO', type: 'SS', value: ['ROOT'] })
    attributes.push({ name: 'FAULTY_RATES', type: 'M', value: {} }) // Empty map for faulty rates
    attributes.push({ name: 'TIMING_FAULTY_RATES', type: 'M', value: {} })
    const result = await DYNAMO.writeItem('ARTIFACT_DEFINITION', pk, sk, attributes)
    return result
}

async function getArtifactStakeholders(artifactType, artifactId) {
    var keyexpression = 'ARTIFACT_TYPE = :a and ARTIFACT_ID = :b'
    var expressionattributevalues = {
        ':a': { S: artifactType },
        ':b': { S: artifactId },
    }
    var projectionexpression = `STAKEHOLDERS`
    const result = await DYNAMO.query('ARTIFACT_DEFINITION', keyexpression, expressionattributevalues, undefined, projectionexpression)
    return result[0]['STAKEHOLDERS']['SS']
}

async function addNewFaultyRateWindow(artifactType, artifactId, window) {
    var pk = { name: 'ARTIFACT_TYPE', value: artifactType }
    var sk = { name: 'ARTIFACT_ID', value: artifactId }

    await DYNAMO.initNestedList('ARTIFACT_DEFINITION', pk, sk, `FAULTY_RATES.w${window.toString()}`)

    var attributes = []
    attributes.push({ name: `FAULTY_RATE_${window.toString()}`, type: 'N', value: '-1' })
    return await DYNAMO.updateItem('ARTIFACT_DEFINITION', pk, sk, attributes)
}

async function addArtifactFaultyRateToWindow(artifactType, artifactId, window, timestamp, faultyrate, lastcaseid) {
    var pk = { name: 'ARTIFACT_TYPE', value: artifactType }
    var sk = { name: 'ARTIFACT_ID', value: artifactId }
    var item = { type: 'L', value: [{ 'S': lastcaseid }, { 'N': timestamp.toString() }, { 'N': faultyrate.toString() }] }

    const result = await DYNAMO.appendNestedListItem('ARTIFACT_DEFINITION', pk, sk, `FAULTY_RATES.w${window.toString()}`, [item])
    var attributes = []
    attributes.push({ name: `FAULTY_RATE_${window.toString()}`, type: 'N', value: `${faultyrate}` })
    await DYNAMO.updateItem('ARTIFACT_DEFINITION', pk, sk, attributes)
    return result
}

async function getArtifactFaultyRateValues(artifactType, artifactId, window) {
    var keyexpression = 'ARTIFACT_TYPE = :a and ARTIFACT_ID = :b'
    var expressionattributevalues = {
        ':a': { S: artifactType },
        ':b': { S: artifactId },
    }
    var projectionexpression = `FAULTY_RATES.w${window.toString()}`
    const result = await DYNAMO.query('ARTIFACT_DEFINITION', keyexpression, expressionattributevalues, undefined, projectionexpression)
    var final = []
    var list = result[0]['FAULTY_RATES']['M'][`w${window.toString()}`]['L']
    for (var i in list) {
        final.push({
            case_id: list[i]['L'][0]['S'],
            timestamp: Number(list[i]['L'][1]['N']),
            faulty_rate: Number(list[i]['L'][2]['N']),
        })
    }
    return final
}

async function getArtifactFaultyRateLatest(artifactType, artifactId, window) {
    var pk = { name: 'ARTIFACT_TYPE', value: artifactType }
    var sk = { name: 'ARTIFACT_ID', value: artifactId }
    const result = await DYNAMO.readItem('ARTIFACT_DEFINITION', pk, sk, `FAULTY_RATE_${window}`)
    var final = Number(result['Item'][`FAULTY_RATE_${window.toString()}`]['N'])
    return final
}

//Time faulty rate-related functions
//TODO: check (probably the code from the artifact faulty rate functions can be used)
/*async function addNewTimeFaultyRateWindow(artifactType, artifactId, window) {
    var pk = { name: 'ARTIFACT_TYPE', value: artifactType }
    var sk = { name: 'ARTIFACT_ID', value: artifactId }
    return DYNAMO.initNestedList('ARTIFACT_DEFINITION', pk, sk, `TIME_FAULTY_RATES.${window}`)
}

async function addArtifactTimeFaultyRateToWindow(artifactType, artifactId, window, timestamp, faultyrate, lastcaseid) {
    var pk = { name: 'ARTIFACT_TYPE', value: artifactType }
    var sk = { name: 'ARTIFACT_ID', value: artifactId }
    var item = { type: 'L', value: [{ 'S': lastcaseid }, { 'N': timestamp.toString() }, { 'N': faultyrate.toString() }] }

    return DYNAMO.appendNestedListItem('ARTIFACT_DEFINITION', pk, sk, `TIME_FAULTY_RATES.${window}`, [item])
}*/

function writeArtifactEvent(eventDetailsJson) {
    var pk = { name: 'ARTIFACT_NAME', value: eventDetailsJson.artifact_name }
    var sk = { name: 'EVENT_ID', value: eventDetailsJson.event_id.toString() }
    var attributes = []
    attributes.push({ name: 'UTC_TIME', type: 'N', value: eventDetailsJson.timestamp.toString() })
    attributes.push({ name: 'ARTIFACT_STATE', type: 'S', value: eventDetailsJson.artifact_state })
    attributes.push({ name: 'PROCESS_TYPE', type: 'S', value: eventDetailsJson.process_type })
    attributes.push({ name: 'PROCESS_ID', type: 'S', value: eventDetailsJson.process_id })
    attributes.push({ name: 'ENTRY_PROCESSED', type: 'N', value: '0' })

    return DYNAMO.writeItem('ARTIFACT_EVENT', pk, sk, attributes)
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
    return DYNAMO.updateItem('ARTIFACT_EVENT', { name: 'ARTIFACT_NAME', value: artifactname },
        { name: 'EVENT_ID', value: eventid }, [{ name: 'ENTRY_PROCESSED', type: 'N', value: '1' }])
}

function deleteArtifactEvent(artifactname, eventid) {
    return DYNAMO.deleteItem('ARTIFACT_EVENT', { name: 'ARTIFACT_NAME', value: artifactname },
        { name: 'EVENT_ID', value: eventid })
}

function writeArtifactUsageEntry(artifactname, caseid, attachedtime, detachedtime, processtype, processid, outcome) {
    var pk = { name: 'ARTIFACT_NAME', value: artifactname }
    var sk = { name: 'CASE_ID', value: caseid }

    var attributes = []
    attributes.push({ name: 'ATTACHED_TIME', type: 'N', value: attachedtime.toString() })
    attributes.push({ name: 'DETACHED_TIME', type: 'N', value: detachedtime.toString() })
    attributes.push({ name: 'PROCESS_TYPE', type: 'S', value: processtype })
    attributes.push({ name: 'PROCESS_ID', type: 'S', value: processid })
    attributes.push({ name: 'OUTCOME', type: 'S', value: outcome })
    return DYNAMO.writeItem('ARTIFACT_USAGE', pk, sk, attributes)
}

async function readArtifactUsageEntries(artifactname, earliestdetachedtime, latestdetachedtime) {
    var keyexpression = 'ARTIFACT_NAME = :a'
    var expressionattributevalues = {
        ':a': { S: artifactname },
        ':b': { N: earliestdetachedtime.toString() },
        ':c': { N: latestdetachedtime.toString() },
    }
    var filterexpression = 'DETACHED_TIME >= :b AND DETACHED_TIME <= :c'
    const result = await DYNAMO.query('ARTIFACT_USAGE', keyexpression, expressionattributevalues, filterexpression)

    var final = []
    //var list = result[0]['FAULTY_RATES']['M']['w60']['L']
    for (var i in result) {
        var buff = {
            CASE_ID: result[i]['CASE_ID']['S'],
            OUTCOME: result[i]['OUTCOME']['S'],
            PROCESS_TYPE: result[i]['PROCESS_TYPE']['S'],
            ARTIFACT_NAME: result[i]['ARTIFACT_NAME']['S'],
            DETACHED_TIME: result[i]['DETACHED_TIME']['N'],
            ATTACHED_TIME: result[i]['ATTACHED_TIME']['N'],
            PROCESS_ID: result[i]['PROCESS_ID']['S'],
        }
        final.push(buff)
    }
    return final
}

function deleteArtifactUsageEntries(artifactname, caseid) {
    return DYNAMO.deleteItem('ARTIFACT_USAGE', { name: 'ARTIFACT_NAME', value: artifactname },
        { name: 'CASE_ID', value: caseid })
}

//PROCESS_TYPE related operations
function writeNewProcessType(proccesstype, egsm, bpmn) {
    var pk = { name: 'PROCESS_TYPE_NAME', value: proccesstype }
    var attributes = []
    attributes.push({ name: 'EGSM_MODEL', type: 'S', value: egsm })
    attributes.push({ name: 'BPMN_MODEL', type: 'S', value: bpmn })
    return DYNAMO.writeItem('PROCESS_TYPE', pk, undefined, attributes)
}

async function readProcessType(proccesstype) {
    var pk = { name: 'PROCESS_TYPE_NAME', value: proccesstype }
    const data = await DYNAMO.readItem('PROCESS_TYPE', pk, undefined)
    var final = undefined
    if (data['Item']) {
        final =
        {
            processtype: data['Item']['PROCESS_TYPE_NAME']['S'],
            egsmmodel: data['Item']['EGSM_MODEL']['S'],
            bpmnmodel: data['Item']['BPMN_MODEL']['S']
        }
    }
    return final
}

//PROCESS_INSTANCE-related operations

//Function to create a new process instance
//Process instance status is automatically set to 'ongoing'
//Status can be changed and end time can be added by closeOngoingProcessInstance function 
async function writeNewProcessInstance(processtype, instanceid, stakeholders, groups, startingtime) {
    var pk = { name: 'PROCESS_TYPE_NAME', value: processtype }
    var sk = { name: 'INSTANCE_ID', value: instanceid }
    var attributes = []
    if (stakeholders && stakeholders.length > 0) {
        attributes.push({ name: 'STAKEHOLDERS', type: 'SS', value: stakeholders })
    }
    if (groups && groups.length > 0) {
        attributes.push({ name: 'GROUPS', type: 'SS', value: groups })
    }
    attributes.push({ name: 'STARTING_TIME', type: 'N', value: startingtime.toString() })
    attributes.push({ name: 'ENDING_TIME', type: 'N', value: '-1' })
    attributes.push({ name: 'STATUS', type: 'S', value: 'ongoing' })
    return DYNAMO.writeItem('PROCESS_INSTANCE', pk, sk, attributes)
}

async function readProcessInstance(processtype, instanceid) {
    var pk = { name: 'PROCESS_TYPE_NAME', value: processtype }
    var sk = { name: 'INSTANCE_ID', value: instanceid }

    const data = await DYNAMO.readItem('PROCESS_INSTANCE', pk, sk)
    var final = undefined
    if (data['Item']) {
        final = {
            processtype: data['Item']['PROCESS_TYPE_NAME']['S'],
            instanceid: data['Item']['INSTANCE_ID']['S'],
            startingtime: Number(data['Item']['STARTING_TIME']['N']),
            endingtime: Number(data['Item']['ENDING_TIME']['N']),
            status: data['Item']['STATUS']['S'],
            stakeholders: data['Item']?.STAKEHOLDERS?.SS || [],
            groups: data['Item']?.GROUPS?.SS || []
        }
    }
    return final
}

async function closeOngoingProcessInstance(processtype, instanceid, endtime) {
    var pk = { name: 'PROCESS_TYPE_NAME', value: processtype }
    var sk = { name: 'INSTANCE_ID', value: instanceid }
    var attributes = []
    attributes.push({ name: 'ENDING_TIME', type: 'N', value: endtime.toString() })
    attributes.push({ name: 'STATUS', type: 'S', value: 'finished' })
    await DYNAMO.updateItem('PROCESS_INSTANCE', pk, sk, attributes)
}

//STAKEHOLDER operations
async function writeNewStakeholder(stakeholderid, notificationTopic) {
    var pk = { name: 'STAKEHOLDER_ID', value: stakeholderid }
    var attributes = []
    attributes.push({ name: 'NOTIFICATION_TOPIC', type: 'S', value: notificationTopic })
    await DYNAMO.writeItem('STAKEHOLDERS', pk, undefined, attributes)
}

async function readStakeholder(stakeholderid) {
    var pk = { name: 'STAKEHOLDER_ID', value: stakeholderid }
    const data = await DYNAMO.readItem('STAKEHOLDERS', pk, undefined)
    var final = undefined
    if (data['Item']) {
        final = {
            id: data['Item']['STAKEHOLDER_ID']['S'],
            topic: data['Item']['NOTIFICATION_TOPIC']['S'],
        }
    }
    return final
}

//PROCESS GROUP operations
async function writeNewProcessGroup(processgroupid, memberprocesses) {
    var pk = { name: 'NAME', value: processgroupid }
    var attributes = []
    if (memberprocesses) {
        var buffer = []
        for (var i = 0; i < memberprocesses.length; i++) {
            buffer.push({ S: memberprocesses[i] })
        }
        attributes.push({ name: 'PROCESSES', type: 'L', value: buffer })
    }
    return await DYNAMO.writeItem('PROCESS_GROUP_DEFINITION', pk, undefined, attributes)
}

async function readProcessGroup(processgroupid) {
    var pk = { name: 'NAME', value: processgroupid }
    const data = await DYNAMO.readItem('PROCESS_GROUP_DEFINITION', pk, undefined)
    var final = undefined
    if (data['Item']) {
        final = {
            name: data['Item']['NAME']['S'],
            processes: [],
        }
        var processesBuff = data['Item']?.PROCESSES?.L
        if(processesBuff){
            processesBuff.forEach(element => {
                final.processes.push(element['S'])
            });
        }
    }
    return final
}

async function addProcessToProcessGroup(processgroupid, newprocessid) {
    const reading = await readProcessGroup(processgroupid)
    if (reading == undefined) {
        return writeNewProcessGroup(processgroupid, [newprocessid])
    }

    //If the group is already defined
    var oldarray = reading.processes
    var pk = { name: 'NAME', value: processgroupid }
    var attributes = []
    attributes.push({ name: 'PROCESSES', type: 'L', value: oldarray.push(newprocessid) })
    const data = await DYNAMO.updateItem('PROCESS_GROUP_DEFINITION', pk, undefined, attributes)
    return data
}





























//STAGE EVENTS
/*function writeStageEvent(processName, stageName, eventid, stageDetails, utcTimeStamp) {

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
}*/

module.exports = {
    writeNewArtifactDefinition: writeNewArtifactDefinition,
    getArtifactStakeholders: getArtifactStakeholders,
    addNewFaultyRateWindow: addNewFaultyRateWindow,
    getArtifactFaultyRateLatest: getArtifactFaultyRateLatest,
    addArtifactFaultyRateToWindow: addArtifactFaultyRateToWindow,
    getArtifactFaultyRateValues: getArtifactFaultyRateValues,

    writeArtifactUsageEntry: writeArtifactUsageEntry,
    readArtifactUsageEntries: readArtifactUsageEntries,
    deleteArtifactUsageEntries: deleteArtifactUsageEntries,

    writeArtifactEvent: writeArtifactEvent,
    readUnprocessedArtifactEvents: readUnprocessedArtifactEvents,
    setArtifactEventToProcessed: setArtifactEventToProcessed,
    readOlderArtifactEvents: readOlderArtifactEvents,
    deleteArtifactEvent: deleteArtifactEvent,
    writeNewProcessType: writeNewProcessType,
    readProcessType: readProcessType,
    writeNewProcessInstance: writeNewProcessInstance,
    readProcessInstance: readProcessInstance,
    closeOngoingProcessInstance: closeOngoingProcessInstance,
    writeNewStakeholder: writeNewStakeholder,
    readStakeholder: readStakeholder,

    writeNewProcessGroup: writeNewProcessGroup,
    readProcessGroup: readProcessGroup,
    addProcessToProcessGroup: addProcessToProcessGroup,
}
