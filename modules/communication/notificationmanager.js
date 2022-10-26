var LOG = require('../egsm-common/auxiliary/logManager')
var DDB = require('../database/databaseconnector')
var STAKEHOLDER = require('../communication/stakeholderconnector')

module.id = 'NOTIFMAN'

/**
 * Notify the necessary Entities (Stakeholders/Artifact owners) based on the provided arguments
 * @param {string array} monitoredProcesses The processes which are monitored and the rules should be applied
 * @param {string array} notificationRules Notification rules
 * @param {JSON string} notification Notification payload
 */
async function notifyEntities(monitoredProcesses, notificationRules, notification) {
    var notifiedEntities = new Set() //Set contains the entities should be notified
    var promises = []
    notificationRules.forEach(rule => {
        switch (rule) {
            case 'PROCESS_OWNERS':
                monitoredProcesses.forEach(process => {
                    var nameElements = process.split('/')
                    var type = nameElements[0]
                    var instnaceId = nameElements[1]
                    promises.push(new Promise((resolve, reject) => {
                        DDB.readProcessInstance(type, instnaceId).then((data, err) => {
                            if (err) {
                                LOG.logSystem('ERROR', 'Error while retrieving information about process instance', module.id)
                                reject()
                            }
                            if (data == undefined) {
                                LOG.logSystem('ERROR', `Could not find process instance ${type}/${instnaceId} in database`, module.id)
                                resolve()
                            }
                            else {
                                data.stakeholders.forEach(stakeholder => {
                                    if (!notifiedEntities.has(stakeholder)) {
                                        notifiedEntities.add(stakeholder)
                                    }
                                });
                                resolve()
                            }
                        })
                    }))
                });
                break;
            case 'ARTIFACT_OWNERS':
                //TODO
                break;
            case 'ATTACHED_ARTIFACT_USERS':
                //TODO
                break;
        }
    });
    await Promise.all(promises)
    promises = []
    notifiedEntities.forEach(entity => {
        STAKEHOLDER.notifyStakeholder(entity, notification)
    });
}

module.exports = {
    notifyEntities: notifyEntities
}