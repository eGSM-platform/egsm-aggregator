//const multer = require('multer'); //For receiving files through HTTP POST
var express = require('express');
var app = express();
//var bodyParser = require('body-parser')
//var jsonParser = bodyParser.json()

var LOG = require('../auxiliary/logManager')
var AUX = require('../auxiliary/auxiliary')

var REST_API_PORT = 8200

module.id = "ROUTES"

app.get("/test", function (req, res) {
    return res.status(200).send('ok')
})

var server = app.listen(REST_API_PORT, function () {
    LOG.logSystem(`DEBUG`, `Agent listening on port ${REST_API_PORT}`, module.id)
})

process.on('SIGINT', () => {
    server.close(() => {
        LOG.logSystem(`DEBUG`, `Terminating REST API`, module.id)
        process.exit()
    });
});

module.exports = {
    REST_API_PORT:REST_API_PORT
}