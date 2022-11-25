var fs = require('fs');

var DYNAMO = require('./modules/egsm-common/database/dynamoconnector')
var LOG = require('./modules/egsm-common/auxiliary/logManager')
var AUX = require('./modules/egsm-common/auxiliary/auxiliary')
var CONFIG = require('./modules/config/autoconfig')
var MQTTCOMM = require('./modules/communication/mqttcommunication')

module.id = "MAIN"

var AGGREGATOR_ID = ''

DYNAMO.initDynamo('fakeMyKeyId', 'fakeSecretAccessKey', 'local', 'http://localhost:8000')

LOG.logSystem('DEBUG', 'Aggregator started...', module.id)

const cmdArgs = process.argv.slice(2);
//Check if there is any command line parameter to evaluate
LOG.logSystem('DEBUG', 'Evaluating input parameters...', module.id)
if (cmdArgs.length > 0) {
    var configCommands = []
    for (var i = 0; i < cmdArgs.length; i++) {
        var elements = cmdArgs[i].split(' ')
        if (elements[0] == '--content_config' || elements[0] == '--process_type_config' || elements[0] == '--monitored_broker_config' || elements[0] == '--process_instance_config' || elements[0] == '--process_group_config' || elements[0] == '--monitoring_config') {
            var filecontent = fs.readFileSync(elements[1], 'utf8')
            configCommands.push({ type: elements[0], content: filecontent })
        }
    }
    configCommands.forEach(element => {
        CONFIG.executeConfig(element.type, element.content)
    })
}

LOG.logSystem('DEBUG', 'Input command(s) executed', module.id)

LOG.logSystem('DEBUG', 'Finding a unique ID by active cooperation with peers...', module.id)
var broker = new PRIM.Broker('localhost', 1883, '', '')
/*WORKER_ID = MQTTCOMM.initPrimaryBrokerConnection(broker).then((result) => {
    AGGREGATOR_ID = result
    LOG.logSystem('DEBUG', `Unique ID found: [${AGGREGATOR_ID}]`, module.id)
})*/
