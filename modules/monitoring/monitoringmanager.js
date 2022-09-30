var DDB = require("../database/databaseconnector")
var LOG = require('../auxiliary/LogManager')

module.id = "MONITORING_MANAGER"

var MONITORING_ACTIVITIES = Map();

function Monitoring(id, type, monitored, notified) {
    var monitoringID = id
    var monitoringType = type
    var monitoredGroup = monitored
    var notifiedEntities = notified


}






module.exports = {
    //Creates and starts a new monitoring activity based on the provided config file 
    startMonitoringActivity: startMonitoringActivity,
    //Stops a selected monitoring activity
    stopMonitoringActivity: stopMonitoringActivity,
    //Returns a list of existing monitoring activity ID-s
    getMonitoringActivities: getMonitoringActivities

}