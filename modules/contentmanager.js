var LOG = require('./auxiliary/LogManager')
var DDB = require('./database/databaseconnector')

module.id = "CONTENT_MANAGER"

async function defineProcessType(processtype, egsm, bpmn) {
    var existingProcess = DDB.readProcessType(processtype)
    if (existingProcess) {
        LOG.logSystem('WARNING', `A process type is already defined with  ${processtype} name. Has not been modified!`, module.id)
        return
    }
    await DDB.writeNewProcessType(processtype, egsm, bpmn).then((data, err) => {
        if (err) {
            LOG.logSystem('WARNING', `Process type ${processtype} added`, module.id)
        }
        else {
            LOG.logSystem('DEBUG', `Error while adding process type ${processtype}`, module.id)
        }
    })
}

async function defineAndStartProcessInstance(processtype, instanceid, stakeholders, groups) {
    var read = await DDB.readProcessInstance(processtype,instanceid)
    if(read != undefined){
        LOG.logSystem('WARNING', `Process instance ${processtype}/${instanceid} is already exist`, module.id)
        return
    }
    var startingTime = Math.floor(new Date().getTime() / 1000)
    await DDB.writeNewProcessInstance(processtype, instanceid, stakeholders, groups, startingTime).then((data, err) => {
        if (err) {
            LOG.logSystem('WARNING', `Process ${processtype}/${instanceid} added`, module.id)
        }
        else {
            LOG.logSystem('DEBUG', `Error while adding process ${processtype}/${instanceid}`, module.id)
        }
    })
}

async function closeProcessInstance(processtype, instanceid) {
    var read = await DDB.readProcessInstance(processtype,instanceid)
    if(read == undefined){
        LOG.logSystem('WARNING', `Process instance ${processtype}/${instanceid} is not existing, cannot be closed`, module.id)
        return
    }
    var closingTime = Math.floor(new Date().getTime() / 1000)
    await DDB.closeOngoingProcessInstance(processtype, instanceid, closingTime).then((data, err) => {
        if (err) {
            LOG.logSystem('WARNING', `Error while closing process type ${processtype}/${instanceid}`, module.id)
        }
        else {
            LOG.logSystem('DEBUG', `Process ${processtype}/${instanceid} closed`, module.id)
        }
    })
}

async function defineProcessGroup(groupid) {
    var reading = await DDB.readProcessGroup(groupid)
    if (reading) {
        LOG.logSystem('WARNING', `Process Group with name ${groupid} is already defined, has not been modified!`, module.id)
        return
    }

    DDB.writeNewProcessGroup(groupid).then((data, err) => {
        if (err) {
            LOG.logSystem('WARNING', `Adding new Process Group with name ${groupid} was not successfull`, module.id)
        }
        else {
            LOG.logSystem('DEBUG', `New Process Group with name ${groupid} created`, module.id)
        }
    })
}

async function addProcessToProcessGroup(groupid, processid) {
    DDB.addProcessToProcessGroup(groupid, processid).then((data, err) => {
        if (err) {
            LOG.logSystem('WARNING', `Error while adding new Process with name ${processid} to group ${groupid}`, module.id)
        } else {
            LOG.logSystem('DEBUG', `${processid} added to Process Group ${groupid} created`, module.id)
        }
    })
}

function defineArtifact(artifactType, artifactId, stakeholders) {
    if (DDB.isArtifactDefined(artifactType, artifactId)) {
        LOG.logSystem('WARNING', `An Artifact is already defined with name ${artifactType}/${artifactId}`, module.id)
        return
    }
    if (stakeholders == undefined) {
        stakeholders = []
    }
    DDB.defineArtifact(artifactType, artifactId, stakeholders).then((date, err) => {
        if (err) {
            LOG.logSystem('WARNING', `Error while defining new Artifact: ${artifactType}/${artifactId}`, module.id)
        }
        else {
            LOG.logSystem('DEBUG', `New Artifact ${artifactType}/${artifactId} added successfully`, module.id)
        }
    })
}

function defineStakeholder(stakeholdername, notificationtopic) {
    const read = DDB.readStakeholder(stakeholdername)
    if (read) {
        LOG.logSystem('WARNING', `Stakeholder with name ${stakeholdername} is alredy exist`, module.id)
        return
    }
    DDB.writeNewStakeholder(stakeholdername, notificationtopic).then((data,err)=>{
        if (err) {
            LOG.logSystem('WARNING', `Error while defining new Stakeholder: ${stakeholdername}`, module.id)
        }
        else {
            LOG.logSystem('DEBUG', `New Stakeholder ${stakeholdername} added successfully`, module.id)
        }
    })
}



module.exports = {
    defineProcessType: defineProcessType,
    defineAndStartProcessInstance: defineAndStartProcessInstance,
    closeProcessInstance: closeProcessInstance,
    //Defines a new process group (id and containing process instance id-s)
    defineProcessGroup: defineProcessGroup,
    addProcessToProcessGroup: addProcessToProcessGroup,
    defineArtifact: defineArtifact,
    defineStakeholder: defineStakeholder,
}