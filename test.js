var fs = require('fs');

var DYNAMO = require('./modules/egsm-common/database/dynamoconnector')
var LOG = require('./modules/egsm-common/auxiliary/logManager')
var AUX = require('./modules/egsm-common/auxiliary/auxiliary')
var CONFIG = require('./modules/config/autoconfig')
var MQTTCOMM = require('./modules/communication/mqttcommunication')
var PRIM = require('./modules/egsm-common/auxiliary/primitives')
var DBCONFIG = require('./modules/egsm-common/database/databaseconfig')
var GROUPMAN = require('./modules/monitoring/groupmanager')
var OBS = require('./modules/monitoring/engineobserver')
const { Job } = require('./modules/monitoring/monitoringtypes/job')
const { ProcessDeviationDetection } = require('./modules/monitoring/monitoringtypes/process-deviation-detection')

module.id = "TEST"

var AGGREGATOR_ID = ''

function update1(message) {
    console.log('FIRST ' + message)
}

function update2(message) {
    console.log('SECOND ' + message)
}

LOG.logSystem('DEBUG', 'Aggregator started...', module.id)

DBCONFIG.initDatabaseConnection()

var broker = new PRIM.Broker('localhost', 1883, '', '')

MQTTCOMM.initPrimaryBrokerConnection(broker)
OBS.addMonitoredBroker(broker)
GROUPMAN.subscribeGroupChanges('test-rule-1', update1)
GROUPMAN.subscribeGroupChanges('test-rule-2', update2)

var job1 = new Job('obs-1', [broker], 'stakeholder-1', ['Inland_Transportation_Process_Simple/gbdfhjuyhftdgrsf'], ['test-rule-1', 'test-rule-2'], [], 'NOTIFY_ALL')
var job2 = new Job('obs-2', [broker], 'stakeholder-1', ['Inland_Transportation_Process_Simple/gbdfhjuyhftdgrsf'], ['test-rule-1'], [], 'NOTIFY_ALL')

var job3 = new ProcessDeviationDetection('obs-3', [broker], 'stakeholder-1', ['Inland_Transportation_Process_Simple/gbdfhjuyhftdgrsf'], ['test-rule-1', 'test-rule-2'], [], 'NOTIFY_ALL')
job3.onProcessEvent('asd')



