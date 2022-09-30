var LOG = require('../auxiliary/LogManager')
var MQTT = require('./mqttconnector')
var DB = require('../database/databaseconnector')

module.id = 'STAKEHOLDER_CONN'

function notifyStakeholder(stakeholderid)
{
    DB.readStakeholder(stakeholderid).then((data,err)=>{
        if(err){

        }
        else{
            if(data.type == 'mqtt'){
                MQTT.publishTopic()
            }
        }
    })
}

function initStakeholderConnection(stakeholderid){
    DB.readStakeholder(stakeholderid).then((data,err)=>{
        if(err){

        }
        else{
            if(data.type == 'mqtt'){
                MQTT.
            }
        }
    })
}