var LOG = require('../egsm-common/auxiliary/logManager')

var MQTTCOMM = require('../communication/mqttcommunication')
var CONNCONFIG = require('../egsm-common/config/connectionconfig')
const { JobFactory } = require('./jobfactory');
const { NotificationManager } = require('../communication/notificationmanager');


const MAX_JOBS = 500

module.id = "MONITORMAN"

class MonitoringManager {
    constructor() {
        this.notification_manager = new NotificationManager()
        this.job_factory = new JobFactory(this.notification_manager)
        this.instance = undefined
        this.jobs = new Map()
    }

    startJob(jobconfig) {
        var newjob = this.job_factory.buildJob(jobconfig)
        if (newjob) {
            LOG.logSystem('DEBUG', `New job [${jobconfig.id}] started`, module.id)
            this.jobs.set(jobconfig.id, newjob)
            return
        }
        LOG.logSystem('WARNING', `Could not start Monitoring Activity...`, module.id)
    }

    stopJob(jobid) {
        if (this.jobs.has(jobid)) {
            LOG.logSystem('DEBUG', `Stopping Monitoring Activity ${jobid}`, module.id)
            this.jobs.get(jobid).terminate()
            this.jobs.delete(jobid)
            return
        }
        LOG.logSystem('WARNING', `Monitoring Activity ${jobid} is not defined, cannot be removed`, module.id)
    }

    getAllJobs() {

    }

    getJob(jobid) {
        if (this.jobs.has(jobid)) {
            return this.jobs.get(jobid)
        }
        return undefined
    }

    getJobInfo(jobid) {
        if (this.jobs.has(jobid)) {
            console.log('JOB FOUND')
            return {
                job_id: jobid,
                owner: this.jobs.get(jobid).owner,
                host: CONNCONFIG.getConfig().socket_host,
                port: CONNCONFIG.getConfig().socket_port,
            }
        }
        console.warn('Job id not found ' + jobid)
        return undefined
    }

    hasFreeSlot() {
        if (this.jobs.size < MAX_JOBS) {
            return true
        }
        return false
    }

    getCapacity() {
        return MAX_JOBS
    }

    getNumberOfJobs() {
        return this.jobs.size
    }

    static getInstance() {
        if (!MonitoringManager.instance) {
            MonitoringManager.instance = new MonitoringManager();
            MQTTCOMM.setMonitoringManager(MonitoringManager.instance)
        }
        return MonitoringManager.instance;
    }
}

module.exports = {
    MonitoringManager
}