var LOG = require('../egsm-common/auxiliary/logManager')
var MQTT = require('../egsm-common/communication/mqttconnector')
var DDB = require('../egsm-common/database/databaseconnector')

module.id = 'STAKEHOLDER_CONN'

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
    notifyStakeholder:notifyStakeholder
}