const express = require('express');
const app = express();
const swaggerUi = require('swagger-ui-express');

const resolve = require('json-refs').resolveRefs;
const swaggerRoot = require('./api/swagger/swagger.json');

// HACK: json-refs doesn't seem to honor its "location" option so can't find relative paths in root json
const process = require('process');
process.chdir('./api/swagger');

resolve(swaggerRoot)
    .then(results => {
        const swaggerDocument = results.resolved;
        app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
        app.listen(8001, function() {
            console.log("Swagger api-docs available on port 8001");
        });
    });