const { ArtifactUsageStatisticProcessing } = require("./monitoringtypes/artifact-usage-statistic-processing")
const { ArtifactUnreliabilityAlert } = require("./monitoringtypes/artifact-unreliability-alert")
const { ProcessDeviationDetection } = require("./monitoringtypes/process-deviation-detection")
var CONNCONF = require('../egsm-common/config/connectionconfig')
const { BpmnJob } = require("./monitoringtypes/bpmn/bpmn-job")

class JobFactory {
    constructor(notificationmanager) {
        this.notification_manager = notificationmanager
    }

    buildJob(config) {
        //Considering config contains the config of 1 job only
        try {
            var id = config['id']
            var owner = config['owner']
            switch (config['type']) {
                case 'artifact-usage-statistic-processing': {
                    var monitoredartifacts = config['monitoredartifacts']
                    var frequency = config['frequency']
                    return new ArtifactUsageStatisticProcessing(id, owner, monitoredartifacts, frequency)
                }
                case 'artifact-unreliability-alert': {
                    var monitoredartifacts = config['monitoredartifacts']
                    var faultinessthreshold = config['faultinessthreshold']
                    var windowsize = config['windowsize']
                    var frequency = config['frequency']
                    var notificationrules = config['notificationrules']
                    return new ArtifactUnreliabilityAlert(id, owner, monitoredartifacts, faultinessthreshold, windowsize, frequency, notificationrules, this.notification_manager)
                }
                case 'process-deviation-detection': {
                    //var brokers = config['brokers']
                    var brokers = [CONNCONF.getConfig().primary_broker]
                    var monitored = config['monitored']
                    var monitoredprocessgroups = config['monitoredprocessgroups']
                    var notificationrules = config['notificationrules']
                    return new ProcessDeviationDetection(id, brokers, owner, monitored, monitoredprocessgroups, notificationrules, this.notification_manager)
                }
                case 'bpmn-job': {
                    var monitored = config['monitored']
                    var notificationrules = config['notificationrules']
                    return new BpmnJob(config['id'], [], 'asd', monitored, [], notificationrules, this.notification_manager)
                }
                //Add further types when implemented!
                default:
                    return undefined
            }
        } catch (error) {
            console.warn(error)
            return undefined
        }
    }
}

module.exports = {
    JobFactory
}