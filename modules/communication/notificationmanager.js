var LOG = require('../egsm-common/auxiliary/logManager')
var DDB = require('../egsm-common/database/databaseconnector')
var STAKEHOLDER = require('../communication/stakeholderconnector')
var MQTT = require('../egsm-common/communication/mqttconnector')

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

/**
 * Sends a notification to a Stakeholder
 * @param {string} stakeholderid - The ID of a Stakeholder, which in advance needs to be registered into the database, with the desired notification method and notification credentials  
 * @param {string} notification - The notification payload itself. Technically can be any string, however JSON string is highly desired
 */
function notifyStakeholder(stakeholderid, notification) {
    DDB.readStakeholder(stakeholderid).then((data, err) => {
        if (err) {
            LOG.logSystem('ERROR', `Error while retrieving information about ${stakeholderid}`, module.id)
        }
        if (data == undefined) {
            LOG.logSystem('ERROR', `Could not find Stakeholder ${stakeholderid} in database`, module.id)
            resolve()
        }
        else {
            var notificationDetailsObj = JSON.parse(data.notificationdetails)
            if (notificationDetailsObj.type == 'mqtt') {
                MQTT.publishTopic(notificationDetailsObj.host, notificationDetailsObj.port, notificationDetailsObj.topic, notification)
            }
            //TODO: Update if other notification methods are available
        }
    })
}

module.exports = {
    notifyEntities: notifyEntities
}