var LOG = require('./LogManager')

module.id = "AUX"

module.exports = {
    Activity:function(type, processes){
        return {
            type : type,
            processes: processes,
            eventsubscribers : []
        }
    },

    sleep: function (ms) {
        return new Promise((resolve) => {
            setTimeout(resolve, ms);
        });
    }
}
