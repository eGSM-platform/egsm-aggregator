/**
 * Module intended to maintain the set of member processes of each used Process Group
 */
var LOG = require('../egsm-common/auxiliary/logManager')
var DB = require('../egsm-common/database/databaseconnector')
var MQTTCONN = require('../communication/mqttcommunication');
const { Validator } = require('../egsm-common/auxiliary/validator');

module.id = "GROUPMAN"

var LOADED_GROUPS = new Map() //groupid -> {member_processes:set(), onchange:set(), membership_rules:string} 

/**
 * Called in case of a Process lifecycle event
 * The function will check if the new process instance meets with the membership rules of any active Process Group and if yes adds it
 * In case of a Process Instance destruction event, it will remove the Process Instance from all Process Groups 
 * @param {Object} messageObj Lifecycle message received 
 */
function onProcessLifecycleEvent(messageObj) {
    //Iterating through the loaded groups and adding the new process if is satisfies the rules
    var processid = messageObj.process.process_type + '/' + messageObj.process.instance_id
    for (var [groupName, group] of LOADED_GROUPS.entries()) {
        if (messageObj.type == 'created') {
            if (Validator.isRulesSatisfied(messageObj.process, group.membership_rules)) {
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
 * Jobs can subscribe changes of Process Groups
 * When this function called it will load the membership rules of the Process Group from the Database and initiate a Process Discovery, which
 * will find all active Process Instances satisfying the rules. This function will return the list of these Process Instances, furthermore if later
 * a new Process Instance satisfies the rules, or if a member instance will be terminated the Job will be notified about this change by calling 'onchange'
 * @param {String} groupid Name of the Process Group
 * @param {Object} onchange The function to call in case of subsequent changes in member Process Instances
 * @returns 
 */
async function subscribeGroupChanges(groupid, onchange) {
    var promise = new Promise(function (resolve, reject) {
        if (LOADED_GROUPS.has(groupid)) {
            LOADED_GROUPS.get(groupid).onchange.add(onchange)
            return resolve(LOADED_GROUPS.get(groupid).member_processes)
        }
        else {
            DB.readProcessGroup(groupid).then(async (groupData) => {
                if (groupData == undefined) {
                    LOG.logSystem('WARNING', `Requested Process Group [${groupid}] is not defined in the Database`)
                    return resolve(new Set())
                }
                //Group found in DB, discovering online processes
                LOG.logSystem('DEBUG', `Requested Process Group [${groupid}] is found in the Database`)
                MQTTCONN.discoverProcessGroupMembers(JSON.parse(groupData.membership_rules)).then((processes) => {
                    LOADED_GROUPS.set(groupid, { membership_rules: JSON.parse(groupData.membership_rules), member_processes: new Set(...processes), onchange: new Set([onchange]) })
                    return resolve(processes)
                })
            })
        }
    });
    return promise
}

/**
 * Job can unsubscribe from changes of a certain Process Group
 * @param {String} groupid Process Group ID
 * @param {Object} onchange The notification function of the Job (provided earlier in the 'subscribeGroupChanges' function)
 * @returns 
 */
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