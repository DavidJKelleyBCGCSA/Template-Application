const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const swagger = require('swagger-express-middleware');
const Middleware = swagger.Middleware;
const logger = require('morgan');
const swaggerUi = require('swagger-ui-express');
const resolveRefsAt = require('json-refs').resolveRefsAt;
const http = require('http');
const https = require('https');
const fs = require('fs');
const passport = require('passport');
const SamlStrategy = require('passport-saml').Strategy;

const { Database } = require('./api/db/Database');

const controllers = require('./api/controllers');
const filters = require('./api/filters');
const primitiveWidgetComputeListener = require('./api/events/computes');
const LoginRouter = require('./api/routes/LoginRouter');

const config = require('./config');

global.appRoot = path.resolve(__dirname);

const NEWLINE_REGEX = /\\n/g;
const NEWLINE_CHAR = '\n';
const { PORT, SECURE_PORT } = config;
const maxFileSize = config.MAX_FILE_SIZE;

const app = express();
const middleware = new Middleware(app);
const swaggerFile = path.join(__dirname, 'api/swagger/swagger.json');

app.use(logger('dev'));
let bodyParser = require('body-parser');
app.use(bodyParser.json({limit: maxFileSize}));
app.use(bodyParser.urlencoded({limit: maxFileSize, extended: true}));
app.use(cookieParser());

passport.use(new SamlStrategy({
    entryPoint: config.BCG_IDP_SSO_URL,
    issuer: `${config.API_URL}/login/callback`,
    idpIssuer: config.BCG_IDP_ISSUER,
    callbackUrl: `${config.API_URL}/login/callback`,
    cert: `${config.BCG_IDP_X509_CERT}`.replace(NEWLINE_REGEX, NEWLINE_CHAR),
}, (profile, done) => done(null, profile)));

app.use(passport.initialize());

const startHttpsServer = () => {
    https.createServer({
        key: fs.readFileSync('certs/server.key', 'utf-8'),
        cert: fs.readFileSync('certs/server.cert', 'utf-8'),
    }, app).listen(SECURE_PORT, function () {
        console.log('consultant-ux-api running HTTPS server on port: ' + SECURE_PORT);
    });
};

middleware.init(swaggerFile, async () => {
    app.enable('case sensitive routing');
    app.enable('strict routing');

    if (config.ENVIRONMENT !== 'production') {
        const swaggerRefs = await resolveRefsAt("./api/swagger/swagger.json");
        const swaggerDocument = swaggerRefs.resolved;

        app.use('/swagger-ui', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

        app.use(middleware.files(
            {caseSensitive: false, strict: false},
            {apiPath: '/api-docs', rawFilesPath: false}
        ));
    }

    app.use(middleware.metadata());

    app.use(
        middleware.CORS(),
        middleware.validateRequest()
    );

    const database = new Database();
    await database.migrate();
    database.initializeModels();

    app.use(new LoginRouter().getRouter());

    const routes = await controllers.connect(app);

    // Verifies token for all controllers except 'identity' controller and attaches user information to request.
    app.use(['/api'], filters.VerifyToken, routes);
    http.createServer(app).listen(PORT, () => {
        console.log('consultant-ux-api running HTTP server on port: ' + PORT);
        // this listener subscribes all Primitive widgets to the execution pipeline.
        primitiveWidgetComputeListener.listen();
    });

    if (SECURE_PORT) { // This should only be set for local environment
        startHttpsServer();
    }
});

module.exports = app;
