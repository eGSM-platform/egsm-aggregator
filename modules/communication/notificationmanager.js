var LOG = require('../egsm-common/auxiliary/logManager')
var DDB = require('../egsm-common/database/databaseconnector')
var MQTT = require('../egsm-common/communication/mqttconnector')
var CONNCONFIG = require('../egsm-common/config/connectionconfig')

module.id = 'NOTIFMAN'

class NotificationManager {
    constructor() { }

    async notifyEntities(notification, notificationrules) {
        notification.notified = new Set()
        var promises = []
        switch (notification.type) {
            case 'artifact':
                notificationrules.forEach(rule => {
                    switch (rule) {
                        case 'ARTIFACT_OWNERS':
                            //Get the owner(s) of the artifact from the database
                            promises.push(new Promise((resolve) => {
                                DDB.readArtifactDefinition(notification.artifact_type, notification.artifact_id).then((artifact) => {
                                    artifact.stakeholders.forEach(stakeholder => {
                                        notification.notified.add(stakeholder)
                                        resolve()
                                    });
                                })
                            }))
                            break;
                        case 'PROCESS_OWNERS':
                            //Notifiy the Stakeholders of the processes using the artifact
                            //TODO: Implement an MQTT discovery function listing all processes using a defined artifact and retieve the stakeholders of those processes from the DB
                            break;
                    }
                });
                break;
            case 'process':
                notificationrules.forEach(rule => {
                    switch (rule) {
                        case 'ARTIFACT_OWNERS':
                            //TODO: Implement an MQTT discovery function listing all artifacts attached to a defined proces instance and retrieve the stakeholders of those artifacts from DB
                            break;
                        case 'PROCESS_OWNERS':
                            promises.push(new Promise((resolve) => {
                                DDB.readProcessInstance(notification.process_type, notification.process_id).then((process) => {
                                    notification.notified.add(process.stakeholders)
                                    resolve()
                                })
                            }))
                            break;
                        case 'PROCESS_GROUP_MEMBERS':
                            //Notify all process owners who has process in the process group where the issued process is also a member
                            notification.processgroupmembers.forEach(memberprocess => {
                                promises.push(new Promise((resolve) => {
                                    DDB.readProcessInstance(memberprocess.process_type, memberprocess.process_id).then((process) => {
                                        notification.notified.add(process.stakeholders)
                                        resolve()
                                    })
                                }))
                            });

                            break;
                        case 'PEER_ARTIFACT_USERS':
                            //Notify the stakeholders of processes who are using the same artifact(s) as the faulty process
                            //TODO: Write necessary MQTT discovery functions
                            break;
                    }
                });
                break;
        }
        await Promise.all(promises)
        notification.notified = [...notification.notified]
        notification.notified.forEach(entry => {
            notifyStakeholder(entry, notification)
        });
    }
    /**
     * Sends a notification to a Stakeholder
     * @param {string} stakeholdername - The ID of a Stakeholder, which in advance needs to be registered into the database, with the desired notification method and notification credentials  
     * @param {string} notification - The notification payload itself
     */
    notifyStakeholder(stakeholdername, notification) {
        DDB.readStakeholder(stakeholdername).then((data, err) => {
            if (err) {
                LOG.logSystem('ERROR', `Error while retrieving information about ${stakeholdername}`, module.id)
                resolve()
            }
            if (data == undefined) {
                LOG.logSystem('ERROR', `Could not find Stakeholder ${stakeholdername} in database`, module.id)
                resolve()
            }
            else {
                //NOTE: For now only notification through MQTT is supported
                //Notification is published to: [Stakeholder Name]/notification topic
                var notificationJson = JSON.stringify(notification)
                var broker = CONNCONFIG.getConfig().primary_broker
                MQTT.publishTopic(broker.host, broker.port, 'notification/' + stakeholdername, notificationJson)
            }
        })
    }
}

module.exports = {
    NotificationManager
}