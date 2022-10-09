var xml2js = require('xml2js');
var fs = require('fs');

var LOG = require('../auxiliary/LogManager')
var CONTENTMANAGER = require('../contentmanager')
var DDB = require('../database/databaseconnector')
var MONITORING = require('../monitoring/monitoringmanager');
var VALIDATOR = require('../validator')
var GROUPMAN = require('../monitoring/groupmanager')


module.id = "AUTOC"

/**
 * Parses an XML string
 * @param {string} config Config input 
 * @returns The parsed XML file
 */
function parseConfigFile(config) {
    var final
    try {
        xml2js.parseString(config, function (err, result) {
            if (err) {
                LOG.logSystem('FATAL', `Error while parsing initialization file: ${err}`, module.id)
            }
            final = result
        })
    } catch (err) {
        LOG.logSystem('FATAL', `Error while parsing initialization file: ${err}`, module.id)
        return
    }
    return final
}

/**
 * Helper function to parse a notification method(s) of a stakeholder
 * @param {NotificationMethod} method Input object
 * @returns 
 */
function parseNotificationMethod(method) {
    var result = {}
    var type = method['type'][0]
    if (type == 'mqtt') {
        result['type'] = type
        result['host'] = method['host'][0]
        result['port'] = method['port'][0]
        result['topic'] = method['notification-topic'][0]
    }
    else {
        LOG.logSystem('FATAL', `${type} is not recognized as a notification method`, module.id)
    }
    return result
}


/**
 * Creates entities in the database defined in the config
 * @param {Parsed Config File} config Parsed XML object containing the necessary information 
 */
function applyContentConfig(config) {
    //Adding Stakeholders
    var stakeholders = config['content']?.['stakeholder'] || []
    stakeholders.forEach(element => {
        var name = element['name'][0]
        var notificationMethodsRaw = element['notification-method']
        var notificationMethods = []
        for (var i = 0; i < notificationMethodsRaw.length; i++) {
            notificationMethods.push(parseNotificationMethod(notificationMethodsRaw[i]))
        }
        if (!CONTENTMANAGER.defineStakeholder(name, JSON.stringify(notificationMethods))) {
            throw Error(`Could not define stakeholder ${element['name'][0]}`)
        }
    });

    //Adding Artifacts
    var artifacts = config['content']?.['artifact'] || []
    artifacts.forEach(element => {
        if (!VALIDATOR.validateArtifact(element['type'][0], element['instance-id'][0])) {
            LOG.logSystem('ERROR', `Artifact ${element['type'][0]}/${element['instance-id'][0]} could not added due to naming error`, module.id)
        }
        else {
            var stakeholderConnections = []
            element['stakeholder'].forEach(element2 => {
                stakeholderConnections.push(element2)
            });

            if (!CONTENTMANAGER.defineArtifact(element['type'][0], element['instance-id'][0], stakeholderConnections, element['host'][0], element['port'][0])) {
                throw Error(`Could not define artifact ${element['type'][0]}/${element['instance-id'][0]}`)
            }
        }
    });
}

/**
 * Creates the process types in the database defined in the config
 * @param {*} config Parsed XML config file
 */
function applyProcessTypeConfig(config) {
    var processes = config['content']?.processtype || []

    processes.forEach(element => {
        if (!VALIDATOR.validateProcessType(element['type-name'][0])) {
            LOG.logSystem('ERROR', `Process type name is invalid (${element['type-name'][0]}). Did not added to database`)
        }
        else {
            var name = element['type-name'][0]
            var egsm_info = fs.readFileSync(element['egsm-info'][0], 'utf8')
            var egsm_model = fs.readFileSync(element['egsm-model'][0], 'utf8')
            var bpmn_model = fs.readFileSync(element['bpmn-model'][0], 'utf8')
            if (!CONTENTMANAGER.defineProcessType(name, egsm_info, egsm_model, bpmn_model)) {
                throw Error(`Could not define process type ${name}`)
            }
        }
    })
}

/**
 * Creates the process groups in the database defined in the config
 * @param {*} config Parsed XML config file
 */
function applyProcessGroupConfig(config) {
    var groups = config['content']?.['process-group'] || []
    groups.forEach(element => {
        var type = element?.['type'] || 'static'
        if (type != 'static') {
            var stakeholderrule = element?.['membership-rules']?.['stakeholder'] || undefined
            var processtyperule = element?.['membership-rules']?.['process-type'] || undefined
        }
        var processes = element?.['process-instance'] || []

        if (!CONTENTMANAGER.defineProcessGroup(element['name'][0], processes, type, stakeholderrule, processtyperule)) {
            throw Error(`Could not define process group ${element['name'][0]}`)
        }
    });
}

/**
 * Creates the process instances in the database defined in the config file
 * @param {*} config Parsed XML config file
 */
function applyProcessInstnaceConfig(config) {
    //Adding process instances
    var processes = config['content']?.['process-instance'] || []
    processes.forEach(element => {
        if (!VALIDATOR.validateProcessInstance(element['type-name'][0], element['instance-id'][0])) {
            LOG.logSystem('ERROR', `Process instance name is invalid (${element['type-name'][0]}/${element['instance-id'][0]}). Did not added to database`)
        }
        else {
            var type = element['type-name'][0]
            var instance = element['instance-id'][0]
            var host = element['host'][0]
            var port = element['port'][0]
            var stakeholders = element?.['stakeholders'] || []
            var stakeholders = []

            if (!CONTENTMANAGER.defineAndStartProcessInstance(type, instance, stakeholders, host, port)) {
                throw Error(`Could not define process instance  ${type}/${instance}`)
            }
            //notify GroupMan about the new process
            GROUPMAN.addProcessInstanceDynamic(type, instance, stakeholders)
        }
    })
}

function applyMonitoringConfig(config) {
    //Retrieving process monitoring definitions and iterating through them
    var process_monitoring = config['aggregation-profile']?.['process-monitoring'] || []
    process_monitoring.forEach(element => {
        //Retrieving information about monitoring
        var groupNames = element?.['process-group'] || []
        var type = element['type'][0]
        var notificationRules = element['notified']
        var monitroingId = element['id'] || undefined
        MONITORING.startMonitoringActivity(type, groupNames, notificationRules, monitroingId)
    });

    //Retrieving artifact monitoring definitions and iterating through them
    var artifact_monitoring = config['aggregation-profile']?.['artifact-monitoring'] || []

}

function executeConfig(type, config) {
    var configParsed = parseConfigFile(config)
    if (type == '--content_config') {
        applyContentConfig(configParsed)
    }
    else if (type == '--process_type_config') {
        applyProcessTypeConfig(configParsed)
    }
    else if (type == '--process_instance_config') {
        applyProcessInstnaceConfig(configParsed)
    }
    else if (type == '--process_group_config') {
        applyProcessGroupConfig(configParsed)
    }
    else if (type == '--monitoring_config') {
        applyMonitoringConfig(configParsed)
    }
}

module.exports = {
    applyContentConfig: applyContentConfig,
    applyProcessTypeConfig: applyProcessTypeConfig,
    applyProcessInstnaceConfig: applyProcessInstnaceConfig,
    executeConfig: executeConfig
}