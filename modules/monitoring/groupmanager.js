var events = require('events');

var LOG = require('../egsm-common/auxiliary/logManager')
var DB = require('../egsm-common/database/databaseconnector')
var MQTTCONN = require('../communication/mqttcommunication')

module.id = "GROUPMAN"

var LOADED_GROUPS = new Map() //groupid -> {member_processes:set(), onchange:set(), membership_rules:string} 

function onProcessLifecycleEvent(messageObj) {
    //Iterating through the loaded groups and adding the new process if is staisfies the rules
    var processid = messageObj.process.process_type + '/' + messageObj.process.instance_id
    for (var [groupName, group] of LOADED_GROUPS.entries()) {
        if (messageObj.type == 'created') {
            if (isRulesSatisfied(messageObj.process, group.membership_rules)) {
                group.member_processes.add(processid)
                for (var notifFunction of group.onchange) {
                    notifFunction(processid, { type: messageObj.type })
                }
            }
        }
        else if (messageObj.type == 'destructed') {
            if (group.member_processes.has(processid)) {
                for (var notifFunction of group.onchange) {
                    notifFunction(processid, { type: messageObj.type })
                }
                group.member_processes.delete(processid)
            }
        }
    }
}

/**
 * Checks if the process should be added to the group defined by the provided rule
 * Supported Rules:
 * -PROCESS_TYPE: The process need to have a specified type (optional)
 * -STAKEHOLDER: The defined stakeholder needs to be included in the process's stakeholders, otherwise it will result False (optional)
 * @param {Process object} process {process_type, instance_id, stakeholders}
 * @param {Object[]} rules {type:string, value}
 */
function isRulesSatisfied(process, rules) {
    var result = false
    var stakeholderRuleSatisfied = true
    if (rules?.PROCESS_TYPE != undefined) {
        if (rules.PROCESS_TYPE != process.process_type) {
            return false
        }
    }
    if (rules?.STAKEHOLDER != undefined) {
        stakeholderRuleSatisfied = false
        process.stakeholders.forEach(stakeholder => {
            if (stakeholder == rules.STAKEHOLDER) {
                stakeholderRuleSatisfied = true
            }
        });
    }
    result = result || stakeholderRuleSatisfied
    console.log('Rules result:' + result)
    return result
}

async function subscribeGroupChanges(groupid, onchange) {
    var promise = new Promise(function (resolve, reject) {
        if (LOADED_GROUPS.has(groupid)) {
            LOADED_GROUPS.get(groupid).onchange.add(onchange)
            return resolve(LOADED_GROUPS.get(groupid).member_processes)
        }
        else {
            DB.readProcessGroup(groupid).then(async (groupData) => {
                console.log('DB:' + JSON.stringify(groupData))
                if (groupData == undefined) {
                    console.log('undefined')
                    LOG.logSystem('WARNING', `Requested Process Group [${groupid}] is not defined in the Database`)
                    return resolve(new Set())
                }
                //Group found in DB, discovering online processes
                LOG.logSystem('DEBUG', `Requested Process Group [${groupid}] is found in the Database`)
                MQTTCONN.discoverProcessGroupMembers(groupid).then((processes) => {
                    var membersSet = new Set(['asdas'])
                    LOADED_GROUPS.set(groupid, { membership_rules: JSON.parse(groupData.membership_rules), member_processes: new Set(...processes), onchange: new Set([onchange]) })
                    console.log('LOADED:' + JSON.stringify(LOADED_GROUPS))
                    return resolve(processes)
                })
            })
        }
    });
    return promise
}

function unsubscribeGroupChanges(groupid, onchange) {
    if (!LOADED_GROUPS.has(groupid)) {
        console.error("Group not loaded")
        return
    }
    if (!LOADED_GROUPS.get(groupid).onchange.has(onchange)) {
        console.error("function not added")
    }
    if (LOADED_GROUPS.get(groupid).onchange.get(onchange).size == 1) {
        LOADED_GROUPS.delete(groupid)
    }
    else {
        LOADED_GROUPS.get(groupid).onchange.delete(onchange)
    }
}

module.exports = {
    onProcessLifecycleEvent: onProcessLifecycleEvent,
    subscribeGroupChanges: subscribeGroupChanges,
    unsubscribeGroupChanges: unsubscribeGroupChanges,
}