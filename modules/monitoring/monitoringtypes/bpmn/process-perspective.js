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
 * IncorrectBranchDeviation is a type of Deviation happens when in an Exclusive or Inclusive block the wrong Branch has been selected
 */
class IncorrectBranchDeviation extends Deviation {
    /**
     * @param {String} intended ID of the intended Sequence 
     * @param {String} executed ID of the actually executed Sequence
     */
    constructor(intended, executed) {
        super('INCORRECT_BRANCH', intended, executed)
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
    analyse() {
        //Process tree traversal to find deviations
        var deviations = []
        for (var key in this.egsm_model.model_roots) {
            deviations.concat(this._analyseStage(this.egsm_model.model_roots[key], deviations))
            deviations = this._analyseRecursive(this.egsm_model.model_roots[key], deviations)
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
    _analyseRecursive(stage, discoveredDeviations) {
        var children = this.egsm_model.stages.get(stage).children
        var deviations = discoveredDeviations
        for (var child in children) {
            deviations = this._analyseStage(children[child], deviations)
            this._analyseRecursive(children[child], deviations)
        }
        return deviations
    }

    /**
     * Analises a Single Stage regarding Deviations
     * Should be called internally only
     * @param {String} stage ID of the current Stage 
     * @param {Deviation[]} discoveredDeviations Array containing the already discovered Deviations
     * @returns An array of Deviation instances, containing the content of 'discoveredDeviations' argument and the freshly discovered Deviations
     */
    _analyseStage(stage, discoveredDeviations) {
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
        //has not been executed, but it is intended (e.g.: Another branch has been executed and this was correct)
        //In this case there is no need to evaluate the children, since all of them will be unopened too
        if (this.egsm_model.stages.get(stage).state == 'UNOPENED') {
            return deviations
        }

        switch (this.egsm_model.stages.get(stage).type) {
            case 'SEQUENCE':
                //If there is any SKIPPED stage among children it suggests, that at least one children activity has been skipped
                //furthermore, at least one OoO children stage must exist
                var skippings = new Map() //OoO stage -> skipped sequence (array of skipped stage id-s)
                if (skipped.size > 0) {
                    skipped.forEach(skippedElement => {
                        outOfOrder.forEach(outOfOrderElement => {
                            if (this.egsm_model.stages.get(outOfOrderElement).direct_successor == skippedElement) {
                                skippings.set(outOfOrderElement, [skippedElement])
                                //skipped.delete(skippedElement)
                                unopened.delete(skippedElement)
                            }
                        });

                    });
                }

                //Extending skipped sequences by trying to include UNOPENED stages
                var finalised = false
                while (!finalised) {
                    finalised = true
                    unopened.forEach(unopenedElement => {
                        for (var [key, entry] of skippings.entries()) {
                            if (this.egsm_model.stages.get(entry[0]).direct_successor == unopenedElement) {
                                entry.unshift(unopenedElement)
                                finalised = false
                                unopened.delete(unopenedElement)
                            }
                        }
                    });
                }
                //Creating SkipDeviation instances
                for (var [key, entry] of skippings) {
                    deviations.push(new SkipDeviation(entry, key))
                }

                //If the number of OoO stages is more than the number of skipped stages, then multi-execution of activity, or
                //wrong sequence of execution occurred. I there was no skip, then we can know that only one OoO means duplication and 
                //more than one means incorrect sequence, but skippings makes it impossible to distinguish
                if (outOfOrder.size > skipped.size) {
                    //We can distinguish between multi-execution and wrong sequene
                    if (skipped.size == 0 && outOfOrder.size == 1) {
                        deviations.push(new MultiExecutionDeviation(outOfOrder[0]))
                    }
                    else if (skipped.size == 0 && outOfOrder.size > 1) {
                        deviations.push(new IncorrectExecutionSequenceDeviation(outOfOrder))
                    }
                    //We cannot distinguish between multi-execution and wrong sequene, so we are creating a 
                    //wrong sequence deviation instance, which can be considered as including duplication as well
                    else if (skipped.size > 0) {
                        deviations.push(new IncorrectExecutionSequenceDeviation(outOfOrder))
                    }
                }
                if (open.size > 0) {
                    open.forEach(openElement => {
                        deviations.push(new IncompleteDeviation(openElement))
                    });
                }
                break;
            case 'PARALLEL':
                //If the parent stage is OPEN means that at least one of the children processes has not been executed correctly
                if (this.egsm_model.stages.get(this.egsm_model.stages.get(stage).parent).state == 'OPEN') {
                    unopened.forEach(unopenedElement => {
                        deviations.push(new SkipDeviation(unopenedElement, 'NA'))
                    });
                    open.forEach(openElement => {
                        deviations.push(new IncompleteDeviation(openElement))
                    });
                    outOfOrder.forEach(outOfOrderElement => {
                        deviations.push(new MultiExecutionDeviation(outOfOrderElement))
                    });
                }
                //If the parent stage is CLOSED, it means that all stages has been executed and closed, but still there may be
                //OoO stages, which suggests multi-execution
                else if (this.egsm_model.stages.get(this.egsm_model.stages.get(stage).parent).state == 'CLOSED') {
                    outOfOrder.forEach(outOfOrderElement => {
                        deviations.push(new MultiExecutionDeviation(outOfOrderElement))
                    });
                }
                break;
            case 'EXCLUSIVE':
                //Closed parent means that the correct (and only the correct) branch has been executed successfully
                //although its OUTOFORDER compliance may occur in case of multi-execution deviation
                if (this.egsm_model.stages.get(this.egsm_model.stages.get(stage).parent).state == 'CLOSED') {
                    outOfOrder.forEach(outOfOrderElement => {
                        deviations.push(new MultiExecutionDeviation(outOfOrderElement))
                    });
                }
                //OPEN parent can be the sign of various problems. 
                else if (this.egsm_model.stages.get(this.egsm_model.stages.get(stage).parent).state == 'OPEN') {
                    //If we can pair together a SKIPPED and an OUTOFORDER activity, we can assume that
                    //one of the incorrect branches has been executed, so we can create an IncorrectBranchDeviation instance
                    //Having more than one SKIPPED is not possible, since there is only one correct branch,
                    //Although considering stucked activities, more than one OUTOFORDER stage is possible (skipping
                    //the correct branch and starting to execute at least 2 of other branches)
                    if (skipped.size == 1 && outOfOrder.size > 0) {
                        deviations.push(new IncorrectBranchDeviation(skipped[0], outOfOrder))
                    }

                    //Any activity being OPEN means a stucked execution, so an IncompleteDeviation instance can be created
                    open.forEach(openElement => {
                        deviations.push(new IncompleteDeviation(openElement))
                    });

                }
                break;
            case 'INCLUSIVE':

                break;
        }
        return deviations
    }
}

module.exports = {
    ProcessPerspective,
    SkipDeviation,
    IncompleteDeviation,
    MultiExecutionDeviation,
}