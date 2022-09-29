
global.WebSocket = require('ws');
const Sockette = require('sockette');

var LOG = require('../auxiliary/LogManager')
var aux = require('../auxiliary/auxiliary')

module.id = "SUP_CONN"

var SUPERVISOR = "localhost"
var SUPERVISOR_SOCKET_PORT = 8080
var CONNECTED = false


const ws = new Sockette(`ws://${SUPERVISOR}:${SUPERVISOR_SOCKET_PORT}`, {
    timeout: 5e3,
    maxAttempts: 10,
    protocols: ['test-protocol'],
    onopen: e => {
        CONNECTED = true
        console.log('Connected!')
    },
    onmessage: e => {
        console.log('Received:')
    },
    onreconnect: e => {
        CONNECTED = false
        console.log('Reconnecting...')
    },
    onmaximum: e => {
        console.log('Stop Attempting!')
    },
    onclose: e => {
        CONNECTED = false
        console.log('Closed!')
    },
    onerror: e => {
        CONNECTED = false
        console.log('Error:')
    }
});


(async () => {
    await aux.sleep(1000);
})().then(function () {
    console.log('ok')

    ws.send('Hello, world!')
    ws.json({ type: 'ping' });
    ws.close();
})
//setTimeout(ws.reconnect, 10e3);

module.exports = {
    initConnection: function () {
        LOG.logSystem(`DEBUG`, `initConnection called`, module.id)
        (async () => {
            while(true){
                if(this.CONNECTED){
                    return
                }
                LOG.logSystem(`DEBUG`, `Waiting for Supervisor connection on: [${SUPERVISOR}]:[${SUPERVISOR_SOCKET_PORT}]`, module.id)
                await aux.sleep(1000);
            }
        })().then(function () {
            console.log('ok')
        
            ws.send('Hello, world!')
            ws.json({ type: 'ping' });
            ws.close();
        })
    }
}