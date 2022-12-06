const { Broker } = require('../egsm-common/auxiliary/primitives');
const OBSERVER = require('./engineobserver')
const MQTT = require('../egsm-common/communication/mqttconnector')
const AUX = require('../egsm-common/auxiliary/auxiliary')
const LOG = require('../egsm-common/auxiliary/logManager')
const GROUPMAN = require('../monitoring/groupmanager');
var UUID = require('uuid');

LOG.setLogLevel(5)
beforeAll(() => {
    LOG.setLogLevel(5)
});

beforeEach(async () => {
    LOG.setLogLevel(5)
    //MQTT.createConnection('localhost', 1883, '', '', 'test-' + UUID.v4())
});

afterEach(async () => {
    //MQTT.closeConnection('localhost', 1883)
})

async function wait(delay) {
    await AUX.sleep(delay)
}

jest.mock('../monitoring/groupmanager', () => {
    return {
      __esModule: true,
      onProcessLifecycleEvent: jest.fn((messageObj) => {console.log('I am mock')}),
      foo: jest.fn(() => 43),
    };
  });

//TEST CASES BEGIN

test('addMonitoredBroker() - no jobs test', async () => {
    GROUPMAN.onProcessLifecycleEvent('asd')
    MQTT.createConnection('localhost', 1883, '', '', 'test-' + UUID.v4())
    var broker = Broker('localhost', 1883, '', '')
    OBSERVER.addMonitoredBroker(broker)
    await wait(1000)
    MQTT.publishTopic('localhost', 1883, 'process_lifecycle', JSON.stringify({ type: 'created', process_type: "process_type_1", process_instance: "instance_1" }))
    await wait(1000)
    MQTT.closeConnection('localhost', 1883)
})