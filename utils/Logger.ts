import util = require('util');

function log(level, obj) {
    console.log(util.format("%s: %j", level, obj));
}

export function debug(obj) { log("DEBUG", obj); }
export function info(obj) { log("INFO", obj); }
export function warn(obj) { log("WARN", obj); }
export function error(obj) { log("ERROR", obj); }
