var LOG = require('../egsm-common/auxiliary/logManager')

const { JobFactory } = require('./jobfactory');
const { NotificationManager } = require('../communication/notificationmanager');

module.id = "MONITORMAN"


class PrivateMonitoringManager {
    constructor() {
        this.notification_manager = new NotificationManager()
        this.job_factory = new JobFactory(this.notification_manager)

        this.jobs = new Map()
    }

    startJob(jobconfig) {
        var newjob = this.job_factory.buildJob(jobconfig)
        if (newjob) {
            LOG.logSystem('DEBUG', `New job [${jobid}] started`)
            this.jobs.set(newjob.id, newjob)
            return
        }
        LOG.logSystem('WARNING', `Could not start Monitoring Activity [${jobid}]...`)
    }

    stopJob(jobid) {
        if (this.jobs.has(jobid)) {
            LOG.logSystem('DEBUG', `Stopping Monitoring Activity ${jobid}`)
            this.jobs.get(jobid).terminate()
            this.jobs.delete(jobid)
            return
        }
        LOG.logSystem('WARNING', `Monitoring Activity ${jobid} is not defined, cannot be removed`)
    }

    getAllJobs() {

    }

    getJob(jobid) {
        if (this.jobs.has(jobid)) {
            return this.jobs.get(jobid)
        }
        return undefined
    }
}

class MonitoringManager {
    constructor() {
        throw new Error('Use MonitoringManager.getInstance()');
    }
    static getInstance() {
        if (!MonitoringManager.instance) {
            MonitoringManager.instance = new PrivateMonitoringManager();
        }
        return MonitoringManager.instance;
    }
}

module.exports = {
    MonitoringManager
}