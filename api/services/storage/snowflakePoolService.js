const Snowflake = require('snowflake-sdk');
const genericPool = require('generic-pool');
const { Workspace, WarehouseAccount } = require('../../model');
const log = require('../../util/log');
const config = require('../../../config');


/**
 * Singleton class that contains all snowflake pools (one pool with N connections per Warehouse)
 */
class SnowflakePoolService {

    constructor() {
        // in order to win speed we mantain a list of workspaces info like (warehouseId, warehouseName, etc)
        this.workspaces = [];

        // list of connection pools by warehouse id
        this.pools = [];
    }

    /**
     * Returns an existing connection pool for the warehouse of the workspace.
     * If no connection pool already exists for the warehouse, a new connection pool will be returned.
     * @param {} workspaceId
     */
    getConnectionPool(workspaceId) {
        return new Promise((resolve, reject) => {
            // do we already have this warehouse mapped ?
            const workpacesData = this.workspaces[workspaceId];
            if (workpacesData && workpacesData.warehouseId) {
                const pool = this.pools[workpacesData.warehouseId];
                if (pool) {
                    resolve({
                        pool,
                        warehouseName: workpacesData.warehouseName,
                        databaseName: workpacesData.databaseName
                    });
                    return;
                }
            }

            Workspace.findOne({where: {id: workspaceId}, include: [WarehouseAccount]})
                .then(workspace => {
                    const { warehouseAccountId } = workspace;
                    const { warehouseName } = workspace;
                    const databaseName = warehouseName;

                    // add this warehouse in our workspacesWarehouse list.
                    this.workspaces[workspaceId] = {
                        warehouseId: warehouseAccountId,
                        warehouseName,
                        databaseName
                    };

                    let pool = this.pools[warehouseAccountId];
                    // if do not have a pool for the warehouse of this workspace
                    if (!pool) {
                        const {account, username, password} = workspace.warehouseAccount;
                        const connectionParams = {account, username, password};
                        pool = this.createPoolConnection(connectionParams);

                        // add new connection to the pool
                        this.pools[warehouseAccountId] = pool;
                    }

                    resolve({
                        pool,
                        warehouseName,
                        databaseName
                    });
                })
                .catch(e => reject(e));

        });
    }

    createPoolConnection(connectionParams) {

        const factory = {
            create: () => new Promise((resolve, reject) => {
                const conn = Snowflake.createConnection(connectionParams);
                conn.connect((err, conn) => {
                    if (err) {
                        log.error('Unable to connect: ' + err.message);
                        reject(err);
                    }
                    log.debug('Successfully connected to Snowflake. Connection id => ', conn.getId());
                    resolve(conn);
                });
            }),
            destroy: client => {
                client.destroy((err, removedClient) => {
                    if (err) {
                        log.warn('Unable to disconnect: ' + err.message);
                        return Promise.reject(err);
                    }

                    log.debug('Connection with Snowflake successfully destroyed. Connection id => ', removedClient.getId());
                    return Promise.resolve();
                });
            }
        };

        const opts = {
            max: config.MAX_POOL_SIZE,
            min: config.MIN_POOL_SIZE,
            idleTimeoutMillis: config.CONNECTION_IDLE_TIMEOUT,
            evictionRunIntervalMillis: config.RECONNECT_IDLE_CONNECTIONS_EACH,
            numTestsPerEvictionRun: config.MAX_RECONECTIONS_ON_EACH_ROUND
        };

        return genericPool.createPool(factory, opts);
    }


    execute(workspaceId, sqlText, binds = [], streamResult = false) {
        return this.getConnectionPool(workspaceId)
            .then(({ pool }) => Promise.all([pool, pool.acquire()]))
            .then(([pool, client]) => new Promise((fulfill, reject) => {
                return client.execute({
                    sqlText,
                    binds,
                    streamResult,
                    complete: (err, stmt, rows) => {
                        log.debug('Snowflake stmt executed with connection id = ', client.getId());
                        pool.release(client);
                        if (err)
                            reject(new Error(err.message));
                        else {
                            console.log(rows);
                            if (streamResult)
                                fulfill(stmt);
                            else
                                fulfill(rows);
                        }
                    }
                });
            }))
            .catch(err => {
                console.error(err);
                return Promise.reject(new Error(err.message));
            });
    }
}

const snowflakePoolService = new SnowflakePoolService();

module.exports = snowflakePoolService;