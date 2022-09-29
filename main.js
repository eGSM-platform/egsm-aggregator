
var fs = require('fs');

var LOG = require('./modules/auxiliary/LogManager')
var CONFIG = require('./modules/config/autoconfig')

module.id = "MAIN"

const cmdArgs = process.argv.slice(2);
//Check if there is any command line parameter to evaluate
if (cmdArgs.length > 0) {
    var configCommands = []
    for (var i = 0; i < cmdArgs.length; i++) {
        var elements = cmdArgs[i].split(' ')
        if (elements[0] == '--content_config' || elements[0] == '--process_type_config' || elements[0] == '--process_instance_config' || elements[0] == '--monitoring_config') {
            var filecontent = fs.readFileSync(elements[1], 'utf8')
            configCommands.push({ type: elements[0], content: filecontent })
        }
    }
    configCommands.forEach(element => {
        CONFIG.executeConfig(element.type, element.content)
    })
}


//Waiting for connection with the supervisor

//supervisor.initConnection()






