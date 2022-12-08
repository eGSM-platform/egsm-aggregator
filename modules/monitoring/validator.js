class Validator {
    constructor() { }

    static validateProcessStage(stage) {
        var errors = []
        if (stage.status == 'faulty') {
            errors.push({
                type: 'status',
                value: stage.status,
                stage: stage.name
            })
        }
        if (stage.compliance != 'onTime') {
            errors.push({
                type: 'compliance',
                value: stage.compliance,
                stage: stage.name
            })
        }
        return errors
    }
}

module.exports = {
    Validator
}