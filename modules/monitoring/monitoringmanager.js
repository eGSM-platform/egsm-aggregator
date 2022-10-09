var UUID = require('uuid');

var LOG = require('../auxiliary/LogManager')
var OBSERVER = require('./engineobserver');
var NOTIFMAN = require('../communication/notificationmanager')
var GROUPMAN = require('./groupmanager')

//Importing monitoring types
var PDD = require('./monitoringtypes/process-deviation-detection')

module.id = "MONITORMAN"

/**
 * Map containing all Monitoring activities. Keys are the monitoring ID-s, values are the Monitoring objects
 */
var MONITORING_ACTIVITIES = new Map();

/**
 * Contructs a new Monitoring Activity
 * @param {string} id Monitoring ID
 * @param {string} type Monitoring type (see imported monitoring type at the top of the file)
 * @param {string array} groups Array of monitored process instance groups 
 * @param {string array} notificationRules Array containig the notification rules 
 * @returns 
 */
function Monitoring(id, type, groups, notificationRules) {
    var monitoringid = id
    var monitoringType = type
    var monitoredGroups = groups //Dynamic and static groups
    var notificationRules = notificationRules

    //Subscribe to the necessary GROUPMAN events
    groups.forEach(element => {
        GROUPMAN.eventEmitter(element, groupmanEventHandler)
    });
    var monitoredProcesses = new Set()

    //Registering all engines to the monitoring which are currently included in the process groups
    //Due to dynamic groups the list of process instances can change in runtime
    monitoredGroups.forEach(element => {
        //Get process group from the database
        GROUPMAN.getGroupMemberProcesses(element).then((data, err) => {
            if (data.length > 0) {
                data.forEach(process => {
                    addEngine(process)
                });
            }
        })
    });

    /**
     * Adding a new engine to the Monitoring activity
     * @param {string} engineid ID of the engine should be addecd to the activity
     */
    var addEngine = function (engineid) {
        monitoredProcesses.set(engineid)
        switch (monitoringType) {
            case 'process-execution-deviation-detection':
                OBSERVER.eventEmitter.on(engineid + '/stage_log', processEventHandler)
                break;
            case 'artifact-failure-rate-warning':
                OBSERVER.eventEmitter.on(engineid + '/artifact_log', processEventHandler)
                break;
        }
        OBSERVER.addEngine(engineid)
    }

    /**
     * Removing an engine from the Monitoring activity 
     * @param {string} engineid ID of the engine should be removed from the activity
     */
    var removeEngine = function (engineid) {
        monitoredProcesses.delete(engineid)
        switch (monitoringType) {
            case 'process-execution-deviation-detection':
                OBSERVER.eventEmitter.removeListener(engineid + '/stage_log', processEventHandler)
                break;
            case 'artifact-failure-rate-warning':
                OBSERVER.eventEmitter.removeListener(engineid + '/artifact_log', processEventHandler)
                break;
        }
        OBSERVER.removeEngine(engineid)
    }

    /**
     * Responsible EventHandler function of the Monitroing Activity
     * @param {string} engineid Id of the engine the event coming from
     * @param {string} eventtype Type of event (stage/artifact/custom)
     * @param {parsed JSON} messageObj Parsed JSon containig all data fields reveived from the process instance
     */
    var processEventHandler = function (engineid, eventtype, messageObj) {
        LOG.logSystem('DEBUG', `New event from ${engineid}, type: ${eventtype}`, module.id)
        var errors = []
        switch (monitoringType) {
            case 'process-execution-deviation-detection':
                if (eventtype == 'stage') {
                    errors = PDD.evaluateStageEvent(messageObj)
                }
                break;
            case 'artifact-failure-rate-warning':

                break;
        }
        if (errors.length != 0) {
            var notificationObj = {
                monitoringid: monitoringid,
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
            NOTIFMAN.notifyEntities(monitoredProcesses, notificationRules, JSON.stringify(notificationObj))
        }
    }

    /**
     * Responsible EventHandler for GROUPMAN events
     * @param {string} eventtype Type of event (added/removed)
     * @param {string} engineid ID of the affected engine (process instance)
     */
    var groupmanEventHandler = function (eventtype, engineid) {
        switch (eventtype) {
            case 'added':
                addEngine(engineid)
                break;
            case 'removed':
                removeEngine(engineid)
                break;
        }
    }

    var destruct = function () {
        //Unsubscribe from GROUPMAN EventEmitter topics
        groups.forEach(element => {
            GROUPMAN.eventEmitter.removeListener(element, groupmanEventHandler)
        });
        
        //Call remove Engine for each engines
        var engineBuff = monitoredProcesses
        engineBuff.forEach((value,key) => {
            removeEngine(key)
        });
    }

    return {
        //processEventHandler: processEventHandler,
        addEngine: addEngine,
        removeEngine: removeEngine,
        destruct: destruct
    }
}

/**
 * Function to add a new Monitroing activity to the module
 * @param {string} type Type of the monitoring
 * @param {string array} groups Array of monitored process instance groups
 * @param {string array} notificationRules Array of notification rules has to applied to the monitoring
 * @param {(optional) string} id ID of the Monitoring activity. If not provided a random value will be generated
 * @returns True if the Monitoring activity has been created, false otherwise
 */
function startMonitoringActivity(type, groups, notificationRules, id) {
    if (id == undefined) {
        id = UUID.v4()
    }
    if (MONITORING_ACTIVITIES.has(id)) {
        LOG.logSystem('WARNING', `Activity already exists with id ${id}, cannot be add again`)
        return false
    }
    MONITORING_ACTIVITIES.set(id, new Monitoring(id, type, groups, notificationRules))
    return true
}

/**
 * Destructs a Monitoring Activity specified by its ID
 * @param {string} monitoringid ID of Monitoring Activity to destruct 
 * @returns True if the destruction was successfull, false otherwise
 */
function destructMonitoring(monitoringid) {
    if (MONITORING_ACTIVITIES.has(id)) {
        MONITORING_ACTIVITIES.get(id).destruct()
        MONITORING_ACTIVITIES.delete(id)
        return true
    }
    LOG.logSystem('WARNING', `Monitoring Activity ${id} is not defined, cannot be removed`)
    return false
}

module.exports = {
    //Creates and starts a new monitoring activity based on the provided config file 
    startMonitoringActivity: startMonitoringActivity,
    destructMonitoring: destructMonitoring,
    //Stops a selected monitoring activity
    //stopMonitoringActivity: stopMonitoringActivity,
    //Returns a list of existing monitoring activity ID-s
    //getMonitoringActivities: getMonitoringActivities

}