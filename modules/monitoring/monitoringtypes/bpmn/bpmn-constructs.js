class BpmnBlock {
    constructor(id, name, inputs, outputs) {
        this.id = id
        this.name = name
        this.inputs = inputs || []
        this.outputs = outputs || []
        this.deviations = []
    }

    addDeviation(deviation) {
        this.deviations.push(deviation)
    }

    clearDeviations() {
        this.deviations.clear()
    }
}

class BpmnTask extends BpmnBlock {
    constructor(id, name, inputs, outputs) {
        super(id, name, inputs, outputs)
        this.status = 'REGULAR' //REGULAR-FAULTY
        this.state = 'UNOPENED' //UNOPENED-ENABLED-RUNNING-COMPLETED-SKIPPED
    }

    update(status, state) {
        if (status) {
            this.status = status
        }
        if (state) {
            this.state = state
        }
    }
}

class BpmnGateway extends BpmnBlock {
    constructor(id, name, type, subtype, inputs, outputs) {
        super(id, name, inputs, outputs)
        this.type = type
        this.subtype = subtype
    }
}

class BpmnEvent extends BpmnBlock {
    constructor(id, name, type, inputs, outputs, assigned) {
        super(id, name, inputs, outputs)
        this.type = type
        this.assigned = assigned
    }
}

class BpmnConnection {
    constructor(id, name, source, target) {
        this.id = id
        this.name = name
        this.source = source
        this.target = target
    }
}

module.exports = {
    BpmnTask,
    BpmnGateway,
    BpmnEvent,
    BpmnConnection
}