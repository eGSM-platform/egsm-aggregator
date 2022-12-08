const { ProcessDeviationDetection } = require('../monitoring/monitoringtypes/process-deviation-detection');
const AUX = require('../egsm-common/auxiliary/auxiliary')
const LOG = require('../egsm-common/auxiliary/logManager')
var UUID = require('uuid');
var MQTTCOMM = require('../communication/mqttcommunication')
var DBCONFIG = require('../egsm-common/database/databaseconfig')
var PRIM = require('../egsm-common/auxiliary/primitives');
const { ChainableTemporaryCredentials } = require('aws-sdk');

var broker = new PRIM.Broker('localhost', 1883, '', '')

LOG.setLogLevel(5)
beforeAll(() => {
    LOG.setLogLevel(5)
});

beforeEach(async () => {
    DBCONFIG.initDatabaseConnection()
    MQTTCOMM.initPrimaryBrokerConnection(broker)
    //OBS.addMonitoredBroker(broker)
});

afterEach(async () => {

})

async function wait(delay) {
    await AUX.sleep(delay)
}

class MockNotificationManager {
    constructor() {
        this.notification = undefined
    }
    notify(id, notificationrules, monitoredprocesses, monitoredartifacts, processtype, instanceid, processperspective, errors) {
        this.notification = {
            id: id,
            notificationrules: notificationrules,
            monitoredprocesses: monitoredprocesses,
            monitoredartifacts: monitoredartifacts,
            processtype: processtype,
            instanceid: instanceid,
            processperspective: processperspective,
            errors: errors
        }
    }
    reset() {
        this.notification = undefined
    }
    getLastNotification() {
        return this.notification
    }
}

//TEST CASES BEGIN

test('onProcessEvent() - detect process deviation', async () => {
    var notifman = new MockNotificationManager()
    var instance = new ProcessDeviationDetection('obs-1', [broker], 'owner', ['Process-type-1/instnace-1'], [], ['NOTIFY_ALL'], notifman)
    var messageObj = {
        processtype: 'Process-type-1',
        instanceid: 'instnace-1',
        perspective: 'truck',
        stage: {
            name: 'Stage_A',
            status: 'ok',
            state: 'Opened',
            compliance: 'OutOfOrder',
        }
    }
    instance.onProcessEvent(messageObj)
    var expected = {
        id: 'obs-1',
        notificationrules: ['NOTIFY_ALL'],
        monitoredprocesses: ['Process-type-1/instnace-1'],
        monitoredartifacts: [],
        processtype: 'Process-type-1',
        instanceid: 'instnace-1',
        processperspective: 'truck',
        errors: [{
            type: 'compliance',
            stage: 'Stage_A',
            value: 'OutOfOrder',

        }]
    }
    expect(notifman.getLastNotification()).toEqual(expected)
})

STATUS:WORKER LOG SENDING 
FORMAT may not be correct 
also check databae dbase writeStageEvent and read