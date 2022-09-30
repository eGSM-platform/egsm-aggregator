var xml2js = require('xml2js');
var fs = require('fs');

var LOG = require('../auxiliary/LogManager')
var CONTENTMANAGER = require('../contentmanager')

module.id = "AUTOCONFIG"

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
        LOG.logSystem('FATAL', `${type} is not recognized as a notification method`)
    }
    return result
}

//Creates the defined entities in the provided config file in the connected Database
function applyContentConfig(configStr) {
    var config = parseConfigFile(configStr)

    //Adding Stakeholders
    var stakeholders = config['content']?.['stakeholder'] || []
    stakeholders.forEach(element => {
        var name = element['name'][0]
        var notificationMethodsRaw = element['notification-method']
        var notificationMethods = []
        for (var i = 0; i < notificationMethodsRaw.length; i++) {
            notificationMethods.push(parseNotificationMethod(notificationMethodsRaw[i]))
        }
        if (!CONTENTMANAGER.defineStakeholder(name,JSON.stringify(notificationMethods))) {
            throw Error(`Could not define stakeholder ${element['name'][0]}`)
        }
    });

    //Adding Artifacts
    var artifacts = config['content']?.['artifact'] || []
    artifacts.forEach(element => {
        var stakeholderConnections = []
        element['stakeholder'].forEach(element2 => {
            stakeholderConnections.push(element2)
        });

        if (!CONTENTMANAGER.defineArtifact(element['type'][0], element['instance-id'][0], stakeholderConnections)) {
            throw Error(`Could not define artifact ${element['type'][0]}/${element['instance-id'][0]}`)
        }
    });
}

function applyProcessTypeConfig(configStr) {
    var config = parseConfigFile(configStr)
    var processes = config['content']?.processtype || []

    processes.forEach(element => {
        var name = element['type-name'][0]
        var egsm_info = fs.readFileSync(element['egsm-info'][0], 'utf8')
        var egsm_model = fs.readFileSync(element['egsm-model'][0], 'utf8')
        var bpmn_model = fs.readFileSync(element['bpmn-model'][0], 'utf8')
        if (!CONTENTMANAGER.defineProcessType(name, egsm_info, egsm_model, bpmn_model)) {
            throw Error(`Could not define process type ${name}`)
        }
    })
}

function applyProcessInstnaceConfig(configStr) {

    var config = parseConfigFile(configStr)
    var processes = config['content']?.processinstnace || []
    processes.forEach(element => {
        var type = element['type-name'][0]
        var instance = element['instance-id'][0]
        var stakeholdersRaw = element?.['stakeholders'] || []
        var stakeholders = []

        stakeholdersRaw.forEach(element => {
            stakeholders.push(element)
        })
        var groupsRaw = element?.['group'] || []
        var groups = []
        groupsRaw.forEach(element => {
            groups.push(element)
        })
        if (!CONTENTMANAGER.defineAndStartProcessInstance(type, instance, stakeholders, groups)) {
            throw Error(`Could not define process instance  ${type}/${instance}`)
        }
    })
}

function executeConfig(type, config) {
    if (type == '--content_config') {
        applyContentConfig(config)
    }
    else if (type == '--process_type_config') {
        applyProcessTypeConfig(config)
    }
    else if (type == '--process_instance_config') {
        applyProcessInstnaceConfig(config)
    }
    else if (type == '--monitoring_config') {

    }
}


module.exports = {
    applyContentConfig: applyContentConfig,
    applyProcessTypeConfig: applyProcessTypeConfig,
    applyProcessInstnaceConfig: applyProcessInstnaceConfig,
    executeConfig: executeConfig
}