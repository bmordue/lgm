import util = require('util');

function log(level, obj) {
    console.log(util.format("%s: %j", level, obj));
}

module.exports.debug = log.bind(null, "DEBUG");
module.exports.info = log.bind(null, "INFO");
module.exports.warn = log.bind(null, "WARN");
module.exports.error = log.bind(null, "ERROR");
