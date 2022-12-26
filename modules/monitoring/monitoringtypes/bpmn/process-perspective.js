const { EgsmModel } = require("./egsm-model")

class ProcessPerspective {
    constructor(perspectiveName, egsmXml, bpmnXml) {
        this.perspective_name = perspectiveName
        this.egsm_model = new EgsmModel(egsmXml)
        this.bpmn_model = new this.bpmn_model(bpmnXml)
    }
}

module.exports = {
    ProcessPerspective
}