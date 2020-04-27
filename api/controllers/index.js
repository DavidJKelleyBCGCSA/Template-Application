const router = require('express').Router();
const fs = require('fs');
const path = require('path');

const IGNORED_FILES = [
    'index.js',
    'LoginController.js'
];

// TODO: Remove this file and replace with express routers

/**
 * Iterates through files in /api/controllers directory and finds all functions in each.  Wires functions to
 * API routes with convention /api/[filename]/[functionName].  Swagger file specifies method, parameters, etc.
 * @returns {Promise<any>}
 */
function connect() {
    return new Promise((fulfill) => {
        fs.readdir(__dirname, (err, files) => {
            files.map(file => {
                if (!IGNORED_FILES.includes(file)) {
                    let controller = require(path.resolve(__dirname, file));
                    let functions = Object.keys(controller);
                    functions.map(functionName => {
                        const module = path.parse(file).name;
                        const func = controller[functionName];
                        router.use(`/${module}/${functionName}`, func);
                    });
                }
            });

            fulfill(router);
        });
    });
}

module.exports = { connect };