
const axios = require('axios')//.default;

var LOG = require('../auxiliary/logManager')
var AUX = require('../auxiliary/auxiliary')
var ROUTES = require('./routes')

module.id = "SUPCONNMAN"

const SUPERVISOR_CONNECTION_REQUIRED = false
var SUPERVISOR = "localhost"
var SUPERVISOR_PORT = 8085
var SUPERVISOR_CONNECTION = false

var AGENT_ID = undefined

function getCredentials() {
    const config = {
        method: 'post',
        url: "http://" + SUPERVISOR + ":" + SUPERVISOR_PORT + "/agent/register",
        headers: { "Content-Type": "application/json" },
        data: {
            rest_api_port: ROUTES.REST_API_PORT,
        },
    }
    return new Promise((resolve, reject) => {
        axios(config).then(function (response) {
            AGENT_ID = response.data.agent_id
            if (typeof AGENT_ID == 'undefined') {
                LOG.logWorker('WARNING', 'Supervisor did not provided WORKER_ID', module.id)
                resolve(false);
            }
            if (response.status != 200) {
                LOG.logWorker('WARNING', 'Server response code: ' + response.status, module.id)
                resolve(false);
            }
            SUPERVISOR_CONNECTION = true
            resolve(true);
        })
            .catch(function (error) {
                LOG.logWorker('WARNING', 'Could not retrieve credentials from Supervisor', module.id)
                resolve(false);
            })
    });
}

function deregisterFromSupervisor() {
    const config = {
        method: 'post',
        url: `http://${SUPERVISOR}:${SUPERVISOR_PORT}/agent/deregister`,
        headers: { "Content-Type": "application/json" },
        data: {
            agent_id: AGENT_ID
        },
    }
    return new Promise((resolve, reject) => {
        axios(config).then(function (response) {
            if (response.status != 200) {
                LOG.logSystem('WARNING', 'Deregistering may not be successfull. Server response code: ' + response.status, module.id)
                resolve(false);
            }
            else {
                LOG.logSystem('DEBUG', 'Agent deregistered from Supervisor', module.id)
            }
            resolve(true);
        })
            .catch(function (error) {
                LOG.logSystem('WARNING', 'Deregistering may not be successfull', module.id)
                resolve(false);
            })
    });
}

function isConnectionEstablished() {
    return SUPERVISOR_CONNECTION
}

if (SUPERVISOR_CONNECTION_REQUIRED) {
    (async () => {
        while (!isConnectionEstablished()) {
            LOG.logSystem('DEBUG', 'Reaching out Supervisor...', module.id)
            let res = await getCredentials()
            if (res) {
                LOG.logSystem('DEBUG', 'Supervisor connection established', module.id)
            }
            else {
                LOG.logSystem('WARNING', 'Could not reach out Supervisor. Retry in 5 sec...', module.id)
                await AUX.sleep(5000);
            }
        }
    })();
}

process.on('SIGINT', () => {
    if (AGENT_ID != undefined) {
        LOG.logSystem('DEBUG', `Deregistering Agent [${AGENT_ID}] from Supervisor`, module.id)
        deregisterFromSupervisor()
    }
});

LOG.logSystem('DEBUG', 'Supervisor connection is established...', module.id)
module.exports = {
    getCredentials: getCredentials,
    isConnectionEstablished: isConnectionEstablished
}