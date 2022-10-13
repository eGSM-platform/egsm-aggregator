
//var express = require('express');
//var bodyParser = require('body-parser')
//var jsonParser = bodyParser.json()
//var app = express();
const axios = require('axios').default;
//const path = require('path');




var fs = require('fs');

var DYNAMO = require('./modules/database/dynamoconnector')
var LOG = require('./modules/auxiliary/logManager')
var AUX = require('./modules/auxiliary/auxiliary')
var CONFIG = require('./modules/config/autoconfig')
var SUPCONNMAN = require('./modules/communication/supervisorconnector')

module.id = "MAIN"

DYNAMO.initDynamo('fakeMyKeyId', 'fakeSecretAccessKey', 'local', 'http://localhost:8000')

LOG.logSystem('DEBUG', 'Aggregator started...', module.id)

const cmdArgs = process.argv.slice(2);
//Check if there is any command line parameter to evaluate
LOG.logSystem('DEBUG', 'Evaluating input parameters...', module.id)
if (cmdArgs.length > 0) {
    var configCommands = []
    for (var i = 0; i < cmdArgs.length; i++) {
        var elements = cmdArgs[i].split(' ')
        if (elements[0] == '--content_config' || elements[0] == '--process_type_config' || elements[0] == '--process_instance_config' || elements[0] == '--process_group_config' || elements[0] == '--monitoring_config') {
            var filecontent = fs.readFileSync(elements[1], 'utf8')
            configCommands.push({ type: elements[0], content: filecontent })
        }
    }
    configCommands.forEach(element => {
        CONFIG.executeConfig(element.type, element.content)
    })
}

LOG.logSystem('DEBUG', 'Input command executed', module.id)


//Waiting for connection with the supervisor

//supervisor.initConnection()






