const { EgsmModel } = require("./egsm-model")

class ProcessPerspective {
    constructor(perspectiveName, egsmXml, bpmnXml) {
        this.perspective_name = perspectiveName
        this.egsm_model = new EgsmModel(egsmXml)
    }
}

module.exports = {
    ProcessPerspective
}