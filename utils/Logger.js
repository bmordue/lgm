const util = require('util');

function log(level, obj) {
    console.log(util.format("%s: %j", level, obj));
}

module.exports.debug = log.bind("DEBUG");
module.exports.info = log.bind("INFO");
module.exports.warn = log.bind("WARN");
module.exports.error = log.bind("ERROR");