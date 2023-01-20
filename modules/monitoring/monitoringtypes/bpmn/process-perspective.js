const { BpmnModel } = require("./bpmn-model")
const { EgsmModel } = require("./egsm-model")

/**
 * Deviation superclass to represent one instance of Deviation detected in the eGSM model
 */
class Deviation {
    constructor(type, blockA, blockB) {
        this.type = type
        this.block_a = blockA
        this.block_b = blockB
    }
}

/**
 * SkipDeviation is a type of deviation when in a sequence of stages one or more stage has been skipped, causing the upcoming stage to be OutOfOrder
 */
class SkipDeviation extends Deviation {
    /**
     * @param {String[]} skipped The skipped stage(s) 
     * @param {String} outOfOrder The upcoming stage after the skipped sequence (OutOfOrder Stage)
     */
    constructor(skipped, outOfOrder) {
        super('SKIPPED', skipped, outOfOrder)
    }
}

/**
 * IncorrectExecutionSequenceDeviation is a type of Deviation when a group of tasks has not been executed on the desired sequence
 */
class IncorrectExecutionSequenceDeviation extends Deviation {
    /**
     * @param {String[]} blocks ID-s of the affected Blocks
     */
    constructor(blocks) {
        super('INCORRECT_EXECUTION', blocks)
    }
}

/**
 * IncompleteDeviation is a type of Deviation when a Stage has been opened, but not closed, suggesting that the its execution is not complete
 */
class IncompleteDeviation extends Deviation {
    /**
     * @param {String} block ID of the problematic Stage
     */
    constructor(block) {
        super('INCOMPLETE', block)
    }
}

/**
 * MultiExecutionDeviation is a type of Deviation when one stage has been executed multiple times (while it was intended once only)
 */
class MultiExecutionDeviation extends Deviation {
    /**
     * @param {String} block ID of the problematic Stage 
     */
    constructor(block) {
        super('MULTI_EXECUTION', block)
    }
}

/**
 * IncorrectBranchDeviation is a type of Deviation happens when in an Exclusive or Inclusive block the wrong Branch has been selected
 */
class IncorrectBranchDeviation extends Deviation {
    /**
     * @param {String} executed ID of the actually executed Sequence
     */
    constructor(executed) {
        super('INCORRECT_BRANCH', executed)
    }
}

/**
 * Class representing one perspective of a Process encapsulating the corresponding eGSM and BPMN models
 */
class ProcessPerspective {
    /**
     * @param {String} perspectiveName Name of the perspective
     * @param {String} egsmXml XML description of the eGSM model
     * @param {String} bpmnXml XML description of the BPMN Model
     */
    constructor(perspectiveName, egsmXml, bpmnXml) {
        this.perspective_name = perspectiveName
        this.egsm_model = new EgsmModel(egsmXml)
        this.bpmn_model = new BpmnModel(perspectiveName, bpmnXml)
    }

    /**
     * Performs a full analysis on the eGSM model and detect deviations
     * The function will also reset the BPMN model (to remove old deviations), synchronize its states with the current eGSM ones
     * and apply the discovered deviations on it, so we can be sure that after the termination of this function the BPMN will be synchronized with the eGSM model 
     * @returns Returns by the discovered deviations as a list of Deviation instances
     */
    analyze() {
        //Process tree traversal to find deviations
        var deviations = []
        for (var key in this.egsm_model.model_roots) {
            deviations.concat(this._analyzeStage(this.egsm_model.model_roots[key], deviations))
            deviations = this._analyzeRecursive(this.egsm_model.model_roots[key], deviations)
        }
        //Update Status and State of BPMN Activities
        this.bpmn_model.applyEgsmStageArray(this.egsm_model.getStageInfoArray())
        //Apply deviations on the BPMN model
        deviations.forEach(element => {
            this.bpmn_model.applyDeviation(element)
        });
        return deviations
    }

    /**
     * Recursive function to discover deviations
     * Should be called only internally
     * @param {String} stage ID of the current stage
     * @param {Deviation[]} discoveredDeviations Array containing the already discovered Deviations
     * @returns An array of Deviation instances, containing the content of 'discoveredDeviations' argument and the freshly discovered Deviations
     */
    _analyzeRecursive(stage, discoveredDeviations) {
        var children = this.egsm_model.stages.get(stage).children
        var deviations = discoveredDeviations
        for (var child in children) {
            deviations = this._analyzeStage(children[child], deviations)
            this._analyzeRecursive(children[child], deviations)
        }
        return deviations
    }

    /**
     * Analyses a Single Stage regarding Deviations
     * Should be called internally only
     * @param {String} stage ID of the current Stage 
     * @param {Deviation[]} discoveredDeviations Array containing the already discovered Deviations
     * @returns An array of Deviation instances, containing the content of 'discoveredDeviations' argument and the freshly discovered Deviations
     */
    _analyzeStage(stage, discoveredDeviations) {
        var deviations = discoveredDeviations
        var open = new Set()
        var unopened = new Set()
        var skipped = new Set()
        var outOfOrder = new Set()
        var children = this.egsm_model.stages.get(stage).children
        for (var key in children) {
            if (this.egsm_model.stages.get(children[key]).state == 'OPEN') {
                open.add(children[key])
            }
            else if (this.egsm_model.stages.get(children[key]).state == 'UNOPENED') {
                unopened.add(children[key])
            }
            if (this.egsm_model.stages.get(children[key]).compliance == 'SKIPPED') {
                skipped.add(children[key])
            }
            else if (this.egsm_model.stages.get(children[key]).compliance == 'OUTOFORDER') {
                outOfOrder.add(children[key])
            }
        }

        //If the Stage is unopened and has been added to a SkipDeviation as 'skipped activity' then it means
        //that no substage has been opened neither, so the evaluation of children is not necessary
        for (var key in deviations) {
            if (deviations[key].constructor.name == 'SkipDeviation') {
                if (deviations[key].block_a.includes(stage)) {
                    return deviations
                }
            }
        }
        //If the Stage is UNOPENED, but not included in any SkipDeviation instance means that the stage
        //has not been executed, but it is intended (e.g.: Another branch has been executed and this was done correctly)
        //In this case there is no need to evaluate the children, since all of them will be in default state too
        if (this.egsm_model.stages.get(stage).state == 'UNOPENED') {
            return deviations
        }
        //The children has to be evaluated
        //Evaluation procedure depends on the type of the parent Stage
        switch (this.egsm_model.stages.get(stage).type) {
            case 'SEQUENCE':
                //If there is any SKIPPED stage among children it suggests, that at least one children activity has been skipped
                //furthermore, at least one OoO children stage must exist
                var skippings = new Map() //OoO stage -> skipped sequence (skipped stages later extended by Unopened Stages before the Skipped one)
                if (skipped.size > 0) {
                    skipped.forEach(skippedElement => {
                        outOfOrder.forEach(outOfOrderElement => {
                            if (this.egsm_model.stages.get(outOfOrderElement).direct_successor == skippedElement) {
                                skippings.set(outOfOrderElement, [skippedElement])
                                //skipped.delete(skippedElement)
                                unopened.delete(skippedElement)
                                this.egsm_model.stages.get(skippedElement).propagateCondition('SHOULD_BE_CLOSED')
                            }
                        });

                    });
                }

                //Extending skipped sequences by trying to include UNOPENED stages
                var finalized = false
                while (!finalized) {
                    finalized = true
                    unopened.forEach(unopenedElement => {
                        for (var [key, entry] of skippings.entries()) {
                            if (this.egsm_model.stages.get(entry[0]).direct_successor == unopenedElement) {
                                entry.unshift(unopenedElement)
                                finalized = false
                                unopened.delete(unopenedElement)
                            }
                        }
                    });
                }
                //Creating SkipDeviation instances
                for (var [key, entry] of skippings) {
                    deviations.push(new SkipDeviation(entry, key))
                }

                //If the number of OoO stages is more than the number of skipped stages, then multi-execution of activity,
                //incomplete activity execution, overlapped execution, or wrong sequence of execution occurred. 
                //If there was no skip, then we can know that only one OoO means duplication and 
                //more than one means incorrect sequence, but skippings makes it impossible to distinguish

                if (outOfOrder.size > skipped.size) {
                    var members = []
                    outOfOrder.forEach(outOfOrderElement => {
                        if (!skippings.has(outOfOrderElement)) {
                            members.push(outOfOrderElement)
                        }
                    });
                    deviations.push(new IncorrectExecutionSequenceDeviation(members))
                }
                //Finally if any stage is open we can create an 'Incomplete Execution' deviation for each
                //if the parent stage should be already closed and in addition we propagate the condition to the
                //open children as well
                if (open.size > 0 && this.egsm_model.stages.get(stage).propagated_conditions.has('SHOULD_BE_CLOSED')) {
                    open.forEach(openElement => {
                        deviations.push(new IncompleteDeviation(openElement))
                        this.egsm_model.stages.get(openElement).propagateCondition('SHOULD_BE_CLOSED')
                    });
                }
                break;
            case 'PARALLEL':
                //If the parent stage is should be closed then it means that at least one of the children processes
                // has not been executed completely or at all, so we can create IncompleteExecution and SkipDeviation instances 
                if (this.egsm_model.stages.get(stage).propagated_conditions.has('SHOULD_BE_CLOSED')) {
                    unopened.forEach(unopenedElement => {
                        deviations.push(new SkipDeviation([unopenedElement], 'NA'))
                        this.egsm_model.stages.get(unopenedElement).propagateCondition('SHOULD_BE_CLOSED')
                    });
                    open.forEach(openElement => {
                        deviations.push(new IncompleteDeviation(openElement))
                        this.egsm_model.stages.get(openElement).propagateCondition('SHOULD_BE_CLOSED')
                    });
                }
                //Finally we need to check if there is ano OoO stage, which means multi-execution
                //We need to check it even if the parent does not have SHOULD_BE_CLOSED propagated condition yet
                outOfOrder.forEach(outOfOrderElement => {
                    deviations.push(new MultiExecutionDeviation(outOfOrderElement))
                });
                break;
            case 'EXCLUSIVE':
                //If the parent should be already closed, then the opened children suggesting IncompleteDeviations 
                //even if they are not on the correct branch
                if (this.egsm_model.stages.get(stage).propagated_conditions.has('SHOULD_BE_CLOSED')) {
                    open.forEach(openElement => {
                        deviations.push(new IncompleteDeviation(openElement))
                        this.egsm_model.stages.get(openElement).propagateCondition('SHOULD_BE_CLOSED')
                    });
                }
                //Except a very special condition (see thesis), the children's compliance can be OoO only if they
                //are non-intended branches and they have been (at least partially) executed, thus we can create
                // an IncorrectBranchExecution for each of them (including the special condition as well)
                outOfOrder.forEach(outOfOrderElement => {
                    deviations.push(new IncorrectBranchDeviation(outOfOrderElement))
                });

                //Finally for each skipped branches a SkipDeviation instance is created
                skipped.forEach(skippedElement => {
                    deviations.push(new SkipDeviation([skippedElement], 'NA'))
                    this.egsm_model.stages.get(skippedElement).propagateCondition('SHOULD_BE_CLOSED')
                });
                break;
            case 'INCLUSIVE':
                //IF the parent stage is supposed to be closed than we can create an IncompleteExecution deviation instance
                //for each opened activity
                if (this.egsm_model.stages.get(stage).propagated_conditions.has('SHOULD_BE_CLOSED')) {
                    open.forEach(openElement => {
                        deviations.push(new IncompleteDeviation(openElement))
                        this.egsm_model.stages.get(openElement).propagateCondition('SHOULD_BE_CLOSED')
                    });
                }
                //For each OutOfOrder stage we can create an IncorrectBranchDeviation instnace, since they suggest that 
                //one or more non-intended branch has been executed, correct branch has been executed more than once
                outOfOrder.forEach(outOfOrderElement => {
                    deviations.push(new IncorrectBranchDeviation(outOfOrderElement))
                });
                break;
            case 'ITERATION':

                break;
        }
        return deviations
    }
}

module.exports = {
    ProcessPerspective,
    SkipDeviation,
    IncorrectExecutionSequenceDeviation,
    IncompleteDeviation,
    MultiExecutionDeviation,
    IncorrectBranchDeviation,
}