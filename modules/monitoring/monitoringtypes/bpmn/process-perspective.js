const { BpmnModel } = require("./bpmn-model")
const { EgsmModel } = require("./egsm-model")

class Deviation {
    constructor(type, blockA, blockB) {
        this.type = type
        this.block_a = blockA
        this.block_b = blockB
    }
}
class SkipDeviation extends Deviation {
    constructor(skipped, outOfOrder) {
        super('SKIPPED', skipped, outOfOrder)
    }
}

class IncompleteDeviation extends Deviation {
    constructor(block) {
        super('INCOMPLETE', block)
    }
}

class MultiExecutionDeviation extends Deviation {
    constructor(block) {
        super('MULTI', block)
    }
}

class IncorrectExecutionSequenceDeviation extends Deviation {
    constructor(block) {
        super('INCORRECT', block)
    }
}

class ProcessPerspective {
    constructor(perspectiveName, egsmXml, bpmnXml) {
        this.perspective_name = perspectiveName
        this.egsm_model = new EgsmModel(egsmXml)
        this.bpmn_model = new BpmnModel(bpmnXml)
    }

    _analyse() {
        //Process tree traversal and trying to find deviations
        var deviations = []
        for (var key in this.egsm_model.model_roots) {
            deviations = this._analyseRecursive(this.egsm_model.model_roots[key], deviations)
        }
        return deviations
    }

    _analyseRecursive(stage, discoveredDeviations) {
        var children = this.egsm_model.stages.get(stage).children
        var deviations = discoveredDeviations
        for (var child in children) {
            deviations = this._analyseStage(children[child], deviations)
            this._analyseRecursive(children[child], deviations)
        }
        return deviations
    }

    _analyseStage(stage, discoveredDeviations) {
        console.log('analyse: ' + stage)
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

        switch (this.egsm_model.stages.get(stage).type) {
            case 'SEQUENCE':
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

                //If there is any SKIPPED stage among children it suggests, that at least one children activity has been skipped
                //furthermore, at least one OoO children stage must exist
                var skippings = new Map() //OoO stage -> skipped sequence (array of skipped stage id-s)
                if (skipped.length > 0) {
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
                if (outOfOrder.length > skipped.length) {
                    //We can distinguish between multi-execution and wrong sequene
                    if (skipped.length == 0 && outOfOrder.length == 1) {
                        deviations.push(new MultiExecutionDeviation(outOfOrder[0]))
                    }
                    else if (skipped.length == 0 && outOfOrder.length > 1) {
                        deviations.push(new IncorrectExecutionSequenceDeviation(outOfOrder))
                    }
                    //We cannot distinguish between multi-execution and wrong sequene, so we are creating a 
                    //wrong sequence deviation instance, which can be considered as including duplication as well
                    else if (skipped.length > 0) {
                        deviations.push(new IncorrectExecutionSequenceDeviation(outOfOrder))
                    }
                }
                break;
        }
        return deviations
    }
}

module.exports = {
    ProcessPerspective
}