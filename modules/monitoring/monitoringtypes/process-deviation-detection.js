var LOG = require('../../auxiliary/LogManager')

module.id = "PRO_DEV_DET"

function evaluateStageEvent(eventDetails) {
    var errors = []
    if (eventDetails.status == 'faulty') {
        errors.push(eventDetails.outcome)
    }
    if (eventDetails.compliance != 'onTime') {
        errors.push(eventDetails.compliance)
    }
    return errors
}

module.exports = {
    evaluateStageEvent:evaluateStageEvent
}