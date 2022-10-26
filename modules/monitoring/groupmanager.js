var events = require('events');

var LOG = require('../egsm-common/auxiliary/logManager')
var DB = require('../database/databaseconnector')

module.id = "GROUPMAN"

var eventEmitter = new events.EventEmitter();

/**
 * Adds a new process instance to all process groups whose rules are met with the process instance 
 * The rules can specify a stakeholder OR a stakeholder + process type pair
 * This function looks for both type of rule met
 * @param {string} processtype Type of the new process
 * @param {string} processinstance Instance ID of the new process
 * @param {string array} stakeholders List of the stakeholders of the new process instance
 */
async function addProcessInstanceDynamic(processtype, processinstance, stakeholders) {
    LOG.logSystem('DEBUG', `addProcessInstanceDynamic called`, module.id)
    var groups = new Set()
    var promises = []

    stakeholders.forEach(element => {
        LOG.logSystem('DEBUG', `retrieving groups requesting ${element}`, module.id)
        //Getting all process groups which are requesting one of the stakeholders of the process
        promises.push(DB.readProcessGroupByRules(element, undefined).then((data, err) => {
            LOG.logSystem('DEBUG', `${data.length} groups found`, module.id)
            if (data.length > 0) {
                data.forEach(group => {
                    groups.add(group.name)
                });
            }
        }))
        //Getting all process groups which are requesting one of the stakeholders of the process
        //and specifying its type as well
        promises.push(DB.readProcessGroupByRules(element, processtype).then((data, err) => {
            if (data.length > 0) {
                data.forEach(group => {
                    groups.add(group.name)
                });
            }
        }))
    });
    await Promise.all(promises)

    groups.forEach(element => {
        //Adding the process to all groups which rules met earlier
        DB.addProcessToProcessGroup(element, processtype + '/' + processinstance)
        //Emitting event with the new process instance as payload, so the Monitoring instances will be notified and
        //they can start to monitor the new process instance
        eventEmitter.emit(element, 'added', processtype + '/' + processinstance)
    });
}

async function removeProcessInstanceDynamic(processtype, processinstance, stakeholders) {
    var groups = new Set()
    var promises = []
    stakeholders.forEach(element => {
        promises.push(DB.readProcessGroupByRules(element, undefined).then((data, err) => {
            if (data.length > 0) {
                data.forEach(group => {
                    groups.add(group.name)
                });
            }
        }))
        promises.push(DB.readProcessGroupByRules(element, processtype).then((data, err) => {
            if (data.length > 0) {
                data.forEach(group => {
                    groups.add(group.name)
                });
            }
        }))
    });
    await Promise.all(promises)

    groups.forEach(element => {
        DB.removeProcessFromProcessGroup(element, processtype + '/' + processinstance)
        eventEmitter.emit(element, 'removed', processtype + '/' + processinstance)
    });
}

async function getGroupMemberProcesses(groupid) {
    var data = await DB.readProcessGroup(groupid)
    if(data == undefined){
        return []
    }
    return data.processes
}

module.exports = {
    eventEmitter: eventEmitter,
    addProcessInstanceDynamic: addProcessInstanceDynamic,
    removeProcessInstanceDynamic: removeProcessInstanceDynamic,
    getGroupMemberProcesses: getGroupMemberProcesses
}