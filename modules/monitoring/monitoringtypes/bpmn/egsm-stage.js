class EgsmStage {
    constructor(id, name, parent, type, processFlowGuard) {
        this.id = id
        this.name = name
        this.parent = parent
        if (!type) {
            this.type = this.determineStageType()
        }
        else {
            this.type = type
        }
        this.direct_successor = this.getSequentialSuccessor(processFlowGuard) //If the parent activity has SEQUENCE type it will contain the id of sucessor activity in case of correct execution (NONE if no successor). If the parent is not SEQUENCE then it will contain NA. Also NA for exception blocks
        this.status = "REGULAR" //REGULAR-FAULTY 
        this.state = "UNOPENED" //UNOPENED-OPEN-CLOSED
        this.compliance = "onTime" //ONTIME-SKIPPED-OUTOFORDER
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
        else if (this.id.includes('SequenceFlow') || this.id.includes('_flow')  || this.parent == 'NONE') {
            return 'SEQUENCE'
        }
        else if (this.id.includes('Parallel')) {
            return 'PARALLEL'
        }
        else if(this.id.includes('_LC')){
            return 'LIFECYCLE'
        }
        else if (this.id.includes('ExclusiveGateway')) {
            return 'EXCLUSIVE'
        }
        else if(this.id.includes('InclusiveGateway')){
            return 'INCLUSIVE'
        }
        else if(this.id.includes('_exception')){
            return 'EXCEPTION'
        }
        else {
            return 'ACTIVITY'
        }
    }

    getSequentialSuccessor(processFlowGuard){
        if(processFlowGuard && this.type != 'EXCEPTION'){
            var elements = processFlowGuard.split(' and ')
            for(var key in elements){
                if(!elements[key].includes('not')){
                    return elements[key].replace('GSM.isMilestoneAchieved(','').replace(' ','').replace('_m1)','').replace('(','').replace(')',"")
                }
            }
            return 'NONE'
        }
        return 'NA'
    }
}

module.exports = {
    EgsmStage
}