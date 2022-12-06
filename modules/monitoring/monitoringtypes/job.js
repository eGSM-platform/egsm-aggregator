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
     * @param {string[]} monitoredartifacts
     * @param {string[]} notificationrules 
     */
    constructor(id, brokers, owner, monitoredprocesses, monitoredprocessgroups, monitoredartifacts, notificationrules) {
        this.id = id
        this.owner = owner
        this.started = Date.now() / 1000
        this.monitoredprocesses = new Set()
        this.monitoredprocessgroups = monitoredprocessgroups
        this.monitoredartifacts = monitoredartifacts
        this.notificationrules = notificationrules

        this.brokers = brokers
        this.brokers.forEach(element => {
            OBSERVER.addMonitoredBroker(element)
        });
        this.periodiccalls = []

        //Add processes which are static defined for monitoring
        monitoredprocesses.forEach(element => {
            addMonitoredProcess(element)
        });

        //Extend the 'monitoredprocesses' set with processes from the provided process groups
        //and subscribe to changes in these process groups
        this.monitoredprocessgroups.forEach(element => {
            GROUPMAN.subscribeGroupChanges(element, this.onGroupChange).forEach(processid => {
                this.addMonitoredProcess(processid)
            })
        });
    }

    addMonitoredProcess(processid) {
        if (this.monitoredprocesses.has(processid)) {
            console.warn('Cannot add same process instance twice')
            return
        }
        this.monitoredprocesses.add(processid)
        OBSERVER.addEngine(processid, onProcessEvent)
    }

    removeMonitoredProcess(processid) {
        if (!this.monitoredprocesses.has(processid)) {
            console.warn('Cannot remove non-added process instance')
            return
        }
        this.monitoredprocesses.delete(processid)
        OBSERVER.removeEngine(element, onProcessEvent)
    }

    terminate() {
        //Stop all periodic calls
        this.periodiccalls.forEach(element => {
            element.cancel()
        });
        this.periodiccalls = []

        //Unsubscribe from group changes
        this.monitoredprocessgroups.forEach(element => {
            GROUPMAN.unsubscribeGroupChanges(element, this.onGroupChange)
        });

        //Unsubscribe from engine updates
        this.monitoredprocesses.forEach(element => {
            removeMonitoredProcess(element)
            //OBSERVER.removeEngine(element, onProcessEvent)
        });
    }

    setPeriodicCall(functionref, period) {
        this.periodicCalls.push(schedule.scheduleJob(` */${period} * * * * *`, functionref))
    }

    onProcessEvent(message) {
        //TODO: this has to be overwritten
    }

    notifyStakeholders(messageObj) {

    }

    onGroupChange(processid, event) {
        if (event.type == 'created') {
            this.addMonitoredProcess(processid)
        }
        else if (event.type == 'destructed') {
            this.removeMonitoredProcess(processid)
        }
    }
}
