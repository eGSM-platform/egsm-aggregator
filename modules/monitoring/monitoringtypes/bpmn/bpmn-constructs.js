const COLOR_UNOPENED = '#C0C0C0' //Grey
const COLOR_OPENED = '#FFB25F' //Orangish
const COLOR_CLOSED = '#64E358' //Green

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

    getBlockColor() {
        console.warn('This function is not applicable for ' + this.id + ' The function should be overwritten')
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

    getBlockColor() {
        switch (this.state) {
            case 'UNOPENED':
                return COLOR_UNOPENED
            case 'OPEN':
                return COLOR_OPENED
            case 'CLOSED':
                return COLOR_CLOSED
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
        this.state = 'UNOPENED'
    }

    getBlockColor() {
        switch (this.state) {
            case 'UNOPENED':
                return COLOR_UNOPENED
            case 'OPEN':
                return COLOR_OPENED
            case 'CLOSED':
                return COLOR_CLOSED
        }
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

class BpmnBlockOverlayReport {
    constructor(perspective, blockId, color, flags) {
        this.perspective = perspective
        this.block_id = blockId
        this.color = color
        this.flags = flags
    }
}

module.exports = {
    BpmnTask,
    BpmnGateway,
    BpmnEvent,
    BpmnConnection,
    BpmnBlockOverlayReport,
}