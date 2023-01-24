const { Job } = require('./job')

//One job should do the aggregation for one type of process
class RealTimeProcessAggregation extends Job {
    constructor(id, brokers, owner, processtype, notificationrules, notificationmanager) {
        super(id, 'real-time-process-aggregation', brokers, owner, [], ['native_' + processtype], [], notificationrules, notificationmanager)
        this.engines = new Map() //engine_id -> perspectives -> list of stages {name, state, status, compliance}
        this.data = new Map() //perspective -> stage -> {regular, faulty, unopened, opened, closed, outoforder, skipped, ontime} 
    }

    onProcessEvent(messageObj) {
        if (!this.engines.has(messageObj.process_id)) {
            this.engines.set(messageObj.process_id, new Map())
        }
        this.engines.get(messageObj.process_id).set(messageObj.process_perspective, messageObj.whole)
        this.analyze()
    }

    analyze() {
        this.data.clear()
        for (const [key, instance] of this.engines) {

            for (const [key2, perspective] of instance) {
                if (!this.data.has(key2)) {
                    this.data.set(key2, new Map())
                }

                var context = this
                Object.keys(perspective).forEach((key) => {
                    var stage = perspective[key];
                    if (!context.data.get(key2).has(stage.name)) {
                        context.data.get(key2).set(stage.name, { regular: 0, faulty: 0, unopened: 0, opened: 0, closed: 0, outOfOrder: 0, skipped: 0, onTime: 0 })
                    }
                    context.data.get(key2).get(stage.name)[stage.status] += 1
                    context.data.get(key2).get(stage.name)[stage.state] += 1
                    context.data.get(key2).get(stage.name)[stage.compliance] += 1
                });
            }
        }
        //console.log(this.data)
    }

    /**
     * Called by the GroupManager, when a change has been detected regarding any group used by the Job
     * The function will add or remove 'processid' from the monitored_processes
     * @param {String} processid ID of the process 
     * @param {Object} event Process Event (created/destructed)
     */
    //OVERRIDE
    onGroupChange(processid, event) {
        if (event.type == 'created') {
            this.addMonitoredProcess(processid)
        }
        else if (event.type == 'destructed') {
            this.removeMonitoredProcess(processid)
            if (this.engines.has(processid)) {
                this.engines.delete(processid)
            }
        }
        this.analyze()
    }
}

module.exports = {
    RealTimeProcessAggregation
}