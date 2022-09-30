var UUID = require('uuid');

var DDB = require("../database/databaseconnector")
var LOG = require('../auxiliary/LogManager')
var OBSERVER = require('./engineobserver')

module.id = "MONITORING_MANAGER"

var MONITORING_ACTIVITIES = new Map();

function evaluateStageEvent(eventDetailJson){

}

function Monitoring(type, monitored, notified) {
    //var monitoringID = id
    var monitoringType = type
    var monitoredProcesses = monitored
    var notifiedEntities = notified

    var eventHandler = function (engineid, eventtype, msgJson) {
        switch (monitoringType) {
            case 'process-execution-deviation-detection':

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


function startMonitoringActivity(type, monitored, notified, id) {
    if (id == undefined) {
        id = UUID.v4()
    }
    if (MONITORING_ACTIVITIES.has(id)) {
        LOG.logSystem('WARNING', `Activity already exists with id ${id}, cannot be add again`)
        return
    }
    MONITORING_ACTIVITIES.set(id, new Monitoring(type, monitored, notified))
}





module.exports = {
    //Creates and starts a new monitoring activity based on the provided config file 
    startMonitoringActivity: startMonitoringActivity,
    //Stops a selected monitoring activity
    stopMonitoringActivity: stopMonitoringActivity,
    //Returns a list of existing monitoring activity ID-s
    getMonitoringActivities: getMonitoringActivities

}