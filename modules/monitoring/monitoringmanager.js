var LOG = require('../egsm-common/auxiliary/logManager')

var MQTTCOMM = require('../communication/mqttcommunication')
const { JobFactory } = require('./jobfactory');
const { NotificationManager } = require('../communication/notificationmanager');


const MAX_JOBS = 500

module.id = "MONITORMAN"

class MonitoringManager {
    constructor() {
        this.notification_manager = new NotificationManager()
        this.job_factory = new JobFactory(this.notification_manager)

        this.jobs = new Map()
    }

    startJob(jobconfig) {
        var newjob = this.job_factory.buildJob(jobconfig)
        if (newjob) {
            LOG.logSystem('DEBUG', `New job [${jobconfig.id}] started`, module.id)
            this.jobs.set(newjob.id, newjob)
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

    getJobInfo(jobid){
        if (this.jobs.has(jobid)) {
            return {
                job_id: this.jobs.get(jobid).id,
                owner: this.jobs.get(jobid).owner,
                //...
                //Add properties what needed
            }
        }
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