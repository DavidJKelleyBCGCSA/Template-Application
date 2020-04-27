const dotenv = require('dotenv');
dotenv.config();

const ENV_VAR_KEYS = [
    'API_URL',
    'APP_URL',
    'BCG_IDP_ISSUER',
    'BCG_IDP_SSO_URL',
    'BCG_IDP_X509_CERT',
    'ENVIRONMENT',
    'JUPYTER_SERVER',
    'JUPYTER_TOKEN',
    'JWT_EXPIRATION',
    'JWT_REFRESH_EXPIRATION',
    'JWT_REFRESH_SECRET',
    'JWT_SECRET',
    'POSTGRES_CONNECTION_URI',
    'REDIS_CONNECTION_URI',
    'SNOWFLAKE_ACCOUNT',
    'SNOWFLAKE_PASSWORD',
    'SNOWFLAKE_USERNAME',
    'TABLEAU_PASSWORD',
    'TABLEAU_PROJECT_ROOT',
    'TABLEAU_SERVER',
    'TABLEAU_SITE_NAME',
    'TABLEAU_USERNAME',
    'TABLEAU_SERVER_TICKET_MIDDLEWARE',
    'TABLEAU_SERVER_TICKET_SECRET'
];

const envVars = ENV_VAR_KEYS.reduce((acc, key) => {
    if (process.env[key]) {
        acc[key] = process.env[key];
    }
    return acc;
}, {});

const common = {
    DEFAULT_WAREHOUSE_ACCOUNT_ID: 1,
    // max allowed by snowflake is around 15.000
    INSERT_BATCH_SIZE: 15000,
    MAX_FILE_SIZE: '150mb',
};

const snowflakePool = {
    // maximum size of the pool
    MAX_POOL_SIZE: 15,
    // minimum size of the pool
    MIN_POOL_SIZE: 5,

    // (**) From Snowflake docs:
    //          By default, client connections typically time out approximately 3-4 hours
    //          after the most recent query was executed

    // The minimum amount of time that an object may sit idle in the pool before
    // it is eligible for eviction due to idle time... (**)
    CONNECTION_IDLE_TIMEOUT: 3600000, // An hour
    // How often to run eviction checks...
    RECONNECT_IDLE_CONNECTIONS_EACH: 1800000, // each half an hour
    // Number of resources to check on each eviction run.
    MAX_RECONECTIONS_ON_EACH_ROUND: 3
};

// TODO: Remove these credentials
const jupyterConfig = {
    JUPYTER_SERVER: 'http://localhost:8888',
    JUPYTER_TOKEN: 'Th4n0sCust0mT0ken_202001021556',
};

const config = {
    local: {
        API_URL: 'https://localhost:3001',
        APP_URL: 'http://localhost:8080',
        POSTGRES_CONNECTION_URI:
            `postgresql://postgresadmin:admin123@${process.env.CONNECTION_HOST || 'localhost'}:${process.env.CONNECTION_PORT || 5432}/postgresdb`,
        PORT: 3000,
        SECURE_PORT: 3001,
        REDIS_CONNECTION_URI: `${process.env.CONNECTION_HOST || 'localhost'}:6379`,
        ...jupyterConfig,
    },
    dev: {
        PORT: 3000,
        ...jupyterConfig,
    },
    test: {
        POSTGRES_CONNECTION_URI: "postgresql://postgresadmin:admin123@postgres:5432/postgresdb",
        PORT: 3000,
        REDIS_CONNECTION_URI: 'redis:6379',
        ...jupyterConfig,
    },
    staging: {
        API_URL: 'https://api.thanos-staging.com',
        APP_URL: 'https://thanosstaging.z5.web.core.windows.net',
        PORT: 3000,
        ...jupyterConfig,
    },
    production: {
        API_URL: 'https://api.cux.omnia-stratus.com',
        APP_URL: 'https://prod.cux.omnia-stratus.com',
        PORT: 3000,
        ...jupyterConfig,
    },
};


const ENVIRONMENT = ['local', 'dev', 'test', 'staging', 'production'].includes(process.env.ENVIRONMENT)
    ? process.env.ENVIRONMENT
    : 'local';

console.log(`Environment: ${process.env.ENVIRONMENT} -> ${ENVIRONMENT}`);

const configuration = {
    ...common,
    ...config[ENVIRONMENT],
    ...snowflakePool,
    ...envVars,
    ENVIRONMENT,
};

class Config {
    constructor(values) {
        this.values = values;

        this.get = this.get.bind(this);
        this.has = this.has.bind(this);
        this.hasAll = this.hasAll.bind(this);
    }

    get(key) {
        return this.values[key];
    }

    has(key) {
        return this.values[key] !== undefined;
    }

    hasAll(keys) {
        for (const key of keys) {
            if (!this.has(key)) {
                return false;
            }
        }
        return true;
    }
}

module.exports = {
    config: new Config(configuration),
    // TODO: This is here for backwards compatibility, goal is to remove them and access values with config.get()
    ...configuration,
};