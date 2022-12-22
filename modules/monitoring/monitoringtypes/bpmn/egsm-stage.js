class EgsmStage {
    constructor(id, name, type, parent) {
        this.id = id
        this.name = name
        this.type = type
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
}

module.exports = {
    EgsmStage
}