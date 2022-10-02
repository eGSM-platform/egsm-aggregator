var LOG = require('../auxiliary/LogManager')

module.id = "VALIDATOR"

function validateProcessType(processtypename) {
    if (processtypename.length < 1 || processtypename.includes('/')) {
        LOG('ERROR', `Process type name ${processtypename} is invalid`, module.id)
        return false
    }
    return true
}

function validateProcessInstance(processtypename, processinstnacename){
    var typeresult = validateProcessType(processtypename)
    if(!typeresult || processinstnacename.length < 1 || processinstnacename.includes('/')){
        LOG('ERROR', `Process instance name ${processtypename}/${processinstnacename} is invalid`, module.id)
        return false
    }
    return true
}

function validateArtifact(artifacttype, artifactinstancename){
    if(artifacttype.length < 1 || artifacttype.includes('/') || artifactinstancename.length < 1 || artifactinstancename.includes('/')){
        LOG('ERROR', `Artifact name ${artifacttype}/${artifactinstancename} is invalid`, module.id)
        return false
    }
    return true
}

module.exports = {
    validateProcessType:validateProcessType,
    validateProcessInstance:validateProcessInstance,
    validateArtifact:validateArtifact,
}