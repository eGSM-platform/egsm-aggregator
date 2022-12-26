class EgsmStage {
    constructor(id, name, parent, type) {
        this.id = id
        this.name = name
        if (!type) {
            this.type = this.determineStageType()
        }
        else {
            this.type = type
        }
        this.status = "regular"
        this.state = "unopened"
        this.compliance = "onTime"
        this.parent = parent
        this.children = []
        this.propagated_conditions = new Set()
    }

    update(status, state, compliance) {
        if (status) {
            this.status = status
        }
        if (state) {
            this.state = state
        }
        if (compliance) {
            this.compliance = compliance
        }
    }

    addChild(child) {
        this.children.push(child)
    }

    propagateCondition(condition) {
        this.propagated_conditions.add(condition)
    }

    cleanPropagations() {
        this.propagated_conditions = new Set()
    }

    reset() {
        this.cleanPropagations()
        this.status = "regular"
        this.state = "unopened"
        this.compliance = "onTime"
    }

    determineStageType() {
        if (this.id.includes('iteration')) {
            return 'ITERATION'
        }
        else if (this.id.includes('SequenceFlow')) {
            return 'SEQUENCE'
        }
        else if (this.id.includes('Parallel')) {
            return 'PARALLEL'
        }
        else if (this.id.includes('ExclusiveGateway')) {
            return 'EXCLUSIVE'
        }
        else {
            return 'ACTIVITY'
        }

    }
}

module.exports = {
    EgsmStage
}