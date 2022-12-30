const BLOCK_COLOR_UNOPENED = '#C0C0C0' //Grey
const BLOCK_COLOR_OPENED = '#FFB25F' //Orangish
const BLOCK_COLOR_CLOSED = '#64E358' //Green
const BLOCK_COLOR_ILLEGAL = '#EF233C' //Redish

const CONNECTION_COLOR_REGULAR = '#000000' //Black
const CONNECTION_COLOR_FAULTY = '#EF233C' //Redish
const CONNECTION_COLOR_HIGHLIGHTED = '#F7B801' //Orangish

class BpmnBlock {
    constructor(id, name, inputs, outputs, positionX, positionY, width, height) {
        this.id = id
        this.name = name
        this.inputs = inputs || []
        this.outputs = outputs || []
        this.deviations = []
        this.position = new Point(positionX, positionY)
        this.width = width
        this.height = height
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
    constructor(id, name, inputs, outputs, position) {
        super(id, name, inputs, outputs, position.x, position.y, position.width, position.height)
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
                return { stroke: '#000000', fill: BLOCK_COLOR_UNOPENED }
            case 'OPEN':
                return { stroke: '#000000', fill: BLOCK_COLOR_OPENED }
            case 'CLOSED':
                return { stroke: '#000000', fill: BLOCK_COLOR_CLOSED }
        }
    }
}

class BpmnGateway extends BpmnBlock {
    constructor(id, name, type, subtype, inputs, outputs, position) {
        console.log(id)
        super(id, name, inputs, outputs, position.x, position.y, position.width, position.height)
        this.type = type
        this.subtype = subtype
        this.pair_gateway = 'NA'
    }
}

class BpmnEvent extends BpmnBlock {
    constructor(id, name, type, inputs, outputs, assigned, position) {
        super(id, name, inputs, outputs, position.x, position.y, position.width, position.height)
        this.type = type
        this.assigned = assigned
        this.state = 'UNOPENED'
        this.illegal = false
    }

    getBlockColor() {
        if (!this.illegal) {
            switch (this.state) {
                case 'UNOPENED':
                    return { stroke: '#000000', fill: BLOCK_COLOR_UNOPENED }
                case 'OPEN':
                    return { stroke: '#000000', fill: BLOCK_COLOR_OPENED }
                case 'CLOSED':
                    return { stroke: '#000000', fill: BLOCK_COLOR_CLOSED }
            }
        }
        else {
            return { stroke: '#000000', fill: BLOCK_COLOR_ILLEGAL }
        }
    }
}
class BpmnConnection {
    constructor(id, name, source, target, waypoints) {
        this.id = id
        this.name = name
        this.source = source
        this.target = target
        this.waypoints = waypoints
        this.status = 'REGULAR' //Status of Connections can be: REGULAR-FAULTY-HIGHLIGHTED
    }

    getBlockColor() {
        switch (this.status) {
            case 'REGULAR':
                return { stroke: CONNECTION_COLOR_REGULAR, fill: CONNECTION_COLOR_REGULAR }
            case 'FAULTY':
                return { stroke: CONNECTION_COLOR_FAULTY, fill: CONNECTION_COLOR_FAULTY }
            case 'HIGHLIGHTED':
                return { stroke: CONNECTION_COLOR_HIGHLIGHTED, fill: CONNECTION_COLOR_HIGHLIGHTED }

        }
    }
}

class Point {
    constructor(x, y) {
        this.x = x
        this.y = y
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
    Point,
}