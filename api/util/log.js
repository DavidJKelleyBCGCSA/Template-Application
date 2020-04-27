// TODO: Move to production quality logging (e.g. with cloud logging service)

function log(severity, message, object) {
    console.log(`${severity}: ${message} ${object ? JSON.stringify(object) : ''}`);
}

function error(message, object) {
    log('ERROR', message, object);
}

function warn(message, object) {
    log('WARNING', message, object);
}

function info(message, object) {
    log('INFO', message, object);
}

function debug(message, object) {
    log('DEBUG', message, object);
}


module.exports = { error, warn, info, debug };