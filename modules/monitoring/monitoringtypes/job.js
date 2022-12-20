const schedule = require('node-schedule');
const OBSERVER = require('../engineobserver')
const GROUPMAN = require('../groupmanager')

class Job {
    /**
     * 
     * @param {string} id 
     * @param {Broker[]} brokers 
     * @param {string} owner 
     * @param {string[]} monitoredprocesses 
     * @param {string[]} monitoredprocessgroups 
     * @param {Artifact[]} monitoredartifacts
     * @param {string[]} notificationrules 
     */
    constructor(id,jobtype, brokers, owner, monitored, monitoredprocessgroups, monitoredartifacts, notificationrules, notificationmanager) {
        this.id = id
        this.job_type = jobtype
        this.owner = owner
        this.started = Date.now() / 1000
        this.monitoredprocesses = new Set()
        this.monitoredprocessgroups = monitoredprocessgroups
        this.monitoredartifacts = monitoredartifacts
        this.notificationrules = notificationrules
        this.notificationmanager = notificationmanager

        this.brokers = brokers
        this.brokers.forEach(element => {
            OBSERVER.addMonitoredBroker(element)
        });
        this.periodiccalls = []

        //Add processes which are static defined for monitoring
        for (var process of monitored) {
            this.addMonitoredProcess(process)
        }

        //Extend the 'monitoredprocesses' set with processes from the provided process groups
        //and subscribe to changes in these process groups
        this.monitoredprocessgroups.forEach(element => {
            GROUPMAN.subscribeGroupChanges(element, this.onGroupChange.bind(this)).then((memberProcesses) => {
                for (var process of memberProcesses) {
                    this.addMonitoredProcess(process)
                }
            })
        });
    }

    addMonitoredProcess(processid) {
        console.log(`addMonitoredProcess of [${this.id}]called`)
        if (this.monitoredprocesses.has(processid)) {
            console.warn('Cannot add same process instance twice')
            return
        }
        this.monitoredprocesses.add(processid)
        OBSERVER.addEngine(processid, this.onProcessEvent.bind(this))
    }

    removeMonitoredProcess(processid) {
        if (!this.monitoredprocesses.has(processid)) {
            console.warn('Cannot remove non-added process instance')
            return
        }
        this.monitoredprocesses.delete(processid)
        OBSERVER.removeEngine(processid, this.onProcessEvent.bind(this))
    }

    terminate() {
        //Stop all periodic calls
        this.periodiccalls.forEach(element => {
            element.cancel()
        });
        this.periodiccalls = []

        //Unsubscribe from group changes
        this.monitoredprocessgroups.forEach(element => {
            GROUPMAN.unsubscribeGroupChanges(element, this.onGroupChange.bind(this))
        });

        //Unsubscribe from engine updates
        this.monitoredprocesses.forEach(element => {
            this.removeMonitoredProcess(element)
            //OBSERVER.removeEngine(element, onProcessEvent.bind(this))
        });
    }

    setPeriodicCall(functionref, period) {
        this.periodiccalls.push(schedule.scheduleJob(` */${period} * * * * *`, functionref))
    }

    onProcessEvent(message) {
        console.warn('This function should be overwritten')
    }

    notifyStakeholders(processtype, instanceid, processperspective, errors) {
        this.notificationmanager.notify(this.id, this.notificationrules, [...this.monitoredprocesses], this.monitoredartifacts, processtype, instanceid, processperspective, errors)
    }

    onGroupChange(processid, event) {
        console.log(`onGroupChange of [${this.id}] called for ${processid}`)
        if (event.type == 'created') {
            this.addMonitoredProcess(processid)
        }
        else if (event.type == 'destructed') {
            this.removeMonitoredProcess(processid)
        }
    }
}

module.exports = { Job }
