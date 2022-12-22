var EventEmitter = require('events')
var xml2js = require('xml2js');

class EgsmModel {
    constructor(modelXml) {
        this.model_xml = modelXml
        this.stages = new Map()
        this.root = undefined
        this.event_queue = []
        this.changed_stages = []
        this.rule_violations = []
        this._buildModel(modelXml)
        this.event_emitter = new EventEmitter()
    }

    updateStage(stageId, status, state, compliance) {

    }

    applySnapshot(snapshot) {
        //reset all stages

        //parse snapshot
        //apply the states from the snapshot

    }

    _buildModel(modelXml) {
        xml2js.parseString(modelXml, function (err, result) {
            var processModel = result;
            //parse XML, section 'ca:Stage'
            var stages = processModel['ca:CompositeApplicationType']['ca:Component'][0]['ca:GuardedStageModel'][0]['ca:Stage'];
            for (var key in stages) {
                PARSER.stageParsingRecursive(engineid, stages[key], 0, '');
            }
        });
    }

    _analzyse() {

    }

}

module.exports = {
    EgsmModel
}