var LOG = require('./LogManager')

module.id = "AUX"

module.exports = {
    sleep: function (ms) {
        return new Promise((resolve) => {
            setTimeout(resolve, ms);
        });
    }
}
