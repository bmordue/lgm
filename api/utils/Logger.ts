import util = require('util');

function consoleLog(level, obj) {
    console.log(util.format("%s: %j", level, obj));
}

function log(level, obj) {
    consoleLog(level, obj);
}

export function debug(obj) { if (process.env["LGM_DEBUG"]) log("DEBUG", obj); }
export function info(obj) { log("INFO", obj); }
export function warn(obj) { log("WARN", obj); }
export function error(obj) { log("ERROR", obj); }
