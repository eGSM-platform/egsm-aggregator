/**
 * Class representing an eGSM Stage
 */
class EgsmStage {
    /**
     * @param {String} id Unique ID  
     * @param {String} name Optinal name (use '' if not used)
     * @param {String} parent ID of the parent stage in the Process Tree
     * @param {String} type Type of the Stage (SEQUENCE/PARALLEL etc) In case of undefined it will be determined based on the ID and parent
     * @param {String} processFlowGuard String expression of Process FLow Guards attached to the Stage (used to determine direct successor)
     */
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
        this.compliance = "ONTIME" //ONTIME-SKIPPED-OUTOFORDER
        this.children = []
        this.propagated_conditions = new Set() //SHOULD_BE_CLOSED/
    }

    /**
     * Updates the state of the Stage. Any argument can be undefined too, in this case the old value will be preserved
     * @param {String} status New Status
     * @param {String} state New State
     * @param {String} compliance New Compliance
     */
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

    /**
     * Add a new child Stage to the Stage
     * @param {String} child ID of the new child Stage 
     */
    addChild(child) {
        this.children.push(child)
    }

    /**
     * Adds a new Propagated Condition to the state, which will be easily accessible by children during tree traversal
     * @param {String} condition 
     */
    propagateCondition(condition) {
        this.propagated_conditions.add(condition)
    }

    /**
     * Removes all Propagated Conditions
     */
    cleanPropagations() {
        this.propagated_conditions = new Set()
    }

    /**
     * Resets the Stage to its original state
     */
    reset() {
        this.cleanPropagations()
        this.status = "REGULAR"
        this.state = "UNOPENED"
        this.compliance = "ONTIME"
    }

    /**
     * Determines the type of the Stage based on its ID
     * @returns Type of the Stage
     */
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

    /**
     * Determines the direct successor of the Stage based on its Process Flow Guard
     * @param {String} processFlowGuard Process flow guard expression
     * @returns 
     */
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