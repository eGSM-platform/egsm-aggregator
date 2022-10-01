var UUID = require('uuid');

var DDB = require("../database/databaseconnector")
var LOG = require('../auxiliary/LogManager')
var OBSERVER = require('./engineobserver');
var MQTT = require('../communication/mqttconnector')

module.id = "MONITORING_MANAGER"

var MONITORING_ACTIVITIES = new Map();

function evaluateStageEvent(eventDetails) {
    var errors = []
    if (eventDetails.status == 'faulty') {
        errors.push(eventDetails.outcome)
    }
    if (eventDetails.compliance != 'onTime') {
        errors.push(eventDetails.compliance)
    }
    return errors
}

function notifyStakeholder(stakeholderid, notification) {
    DDB.readStakeholder(stakeholderid).then((data, err) => {
        if (err) {
            LOG.logSystem('ERROR', `Error while retrieving information about ${stakeholderid}`, module.id)
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

async function notifyEntities(monitoredProcesses, notificationRules, notification) {
    var notifiedEntities = new Set() //Set containeng the entities should be notified
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
        notifyStakeholder(entity, notification)
    });
}

function Monitoring(type, monitored, notificationRules) {
    //var monitoringID = id
    var monitoringType = type
    var monitoredProcesses = monitored
    var notificationRules = notificationRules


    var eventHandler = function (engineid, eventtype, messageObj) {
        LOG.logSystem('DEBUG',`New event from ${engineid}, type: ${eventtype}`,module.id)
        switch (monitoringType) {
            case 'process-execution-deviation-detection':
                if (eventtype == 'stage') {
                    var errors = evaluateStageEvent(messageObj)
                    if (errors.length != 0) {
                        var notificationObj = {
                            processid: messageObj.processid,
                            stage: messageObj.stagename,
                            error: errors,
                            timestamp: messageObj.timestamp,
                            engine: engineid,
                            process: {
                                status: messageObj.status,
                                outcome: messageObj.outcome,
                                compliance: messageObj.compliance
                            }
                        }
                        notifyEntities(monitoredProcesses, notificationRules, JSON.stringify(notificationObj))
                    }
                }
                break;
            case 'artifact-failure-rate-warning':

                break;
        }
    }


    //Subscribe to the necessary events based on the type of the monitoring
    monitoredProcesses.forEach(element => {
        switch (monitoringType) {
            case 'process-execution-deviation-detection':
                OBSERVER.eventEmitter.on(element + '/stage_log', eventHandler)
                break;
            case 'artifact-failure-rate-warning':
                OBSERVER.eventEmitter.on(element + '/stage_log', eventHandler)
                break;
        }
    });
    //Add the member engines (processes) to the EngineObserver module
    monitoredProcesses.forEach(element => {
        OBSERVER.addEngine(element)
    });

    return {

    }
}


function startMonitoringActivity(type, monitored, notificationRules, id) {
    if (id == undefined) {
        id = UUID.v4()
    }
    if (MONITORING_ACTIVITIES.has(id)) {
        LOG.logSystem('WARNING', `Activity already exists with id ${id}, cannot be add again`)
        return
    }
    MONITORING_ACTIVITIES.set(id, new Monitoring(type, monitored, notificationRules))
}





module.exports = {
    //Creates and starts a new monitoring activity based on the provided config file 
    startMonitoringActivity: startMonitoringActivity,
    //Stops a selected monitoring activity
    //stopMonitoringActivity: stopMonitoringActivity,
    //Returns a list of existing monitoring activity ID-s
    //getMonitoringActivities: getMonitoringActivities

}