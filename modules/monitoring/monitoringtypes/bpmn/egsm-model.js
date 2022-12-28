var EventEmitter = require('events')
var xml2js = require('xml2js');
const { EgsmStage } = require('./egsm-stage');

class EgsmModel {
    constructor(modelXml) {
        this.model_xml = modelXml
        this.model_roots = []
        this.stages = new Map()
        this.event_queue = []
        this.changed_stages = []
        this.rule_violations = []
        this._buildModel(modelXml)
        this.event_emitter = new EventEmitter()
    }

    updateStage(stageId, status, state, compliance) {
        this.stages.get(stageId).update(status, state, compliance)
    }

    applySnapshot(snapshot) {
        //TODO
        //- reset all stages
        //- parse snapshot
        //- apply the states from the snapshot
    }

    _parseStageRecursive(stage, parent) {
        var children = stage['ca:SubStage'] || []
        this.stages.set(stage['$'].id, new EgsmStage(stage['$'].id, stage['$'].name, parent, undefined,
            (parent != 'NONE' && this.stages.get(parent).type == 'SEQUENCE' && this.stages.get(parent).type == 'LIFECYCLE') ?
                stage?.['ca:ProcessFlowGuard']?.[0]?.['$'].expression : undefined))
        for (var key in children) {
            this.stages.get(stage['$'].id).addChild(children[key]['$'].id)
            this._parseStageRecursive(children[key], stage['$'].id)
        }
    }

    _buildModel() {
        var context = this
        xml2js.parseString(this.model_xml, function (err, result) {
            if (err) {
                throw new Error('Error while parsing XML: ' + err)
            }
            var roots = result['ca:CompositeApplicationType']['ca:Component'][0]['ca:GuardedStageModel'][0]['ca:Stage'];
            for (var root in roots) {
                context.model_roots.push(roots[root]['$'].id)
                context._parseStageRecursive(roots[root], 'NONE')
            }
        });
    }
}

module.exports = {
    EgsmModel
}