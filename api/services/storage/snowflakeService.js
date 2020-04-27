const snowflakePoolService = require('./snowflakePoolService');
const log = require('../../util/log');
const { systemColumn } = require('../../helpers/dataHelper');

class SnowflakeService {
    constructor(workspaceId) {
        this.workspaceId = workspaceId;
    }

    connect() {
        if (this.warehouseName && this.databaseName) {
            return Promise.resolve();
        }

        return snowflakePoolService.getConnectionPool(this.workspaceId)
            .then(poolConn => {
                this.warehouseName = poolConn.warehouseName;
                this.databaseName = poolConn.databaseName;
                return Promise.resolve();
            });
    }

    createWarehouseAndDatabase() {
        return this.createWarehouse()
            .then(() => this.createDatabase());
    }

    createWarehouse() {
        const name = this.warehouseName;
        const sqlText = `CREATE WAREHOUSE IF NOT EXISTS "${name}" WITH WAREHOUSE_SIZE=XSMALL MAX_CLUSTER_COUNT=1 ` +
            `MIN_CLUSTER_COUNT=1 SCALING_POLICY=STANDARD AUTO_SUSPEND=60 AUTO_RESUME=TRUE;`;

        return snowflakePoolService.execute(this.workspaceId, sqlText)
            .then(() => {
                log.info('Warehouse created', {name});
                return Promise.resolve();
            });
    }

    createDatabase() {
        const name = this.databaseName;
        const sqlText = `CREATE DATABASE IF NOT EXISTS "${name}";`;

        return snowflakePoolService.execute(this.workspaceId,`USE WAREHOUSE "${name}"`)
            .then(() => {
                return snowflakePoolService.execute(this.workspaceId, sqlText)
                    .then(() => {
                        log.info('Database created', {name});
                        return Promise.resolve();
                    });
            });
    }

    getWarehouse() {
        return snowflakePoolService.execute(this.workspaceId, `SHOW WAREHOUSES LIKE '${this.warehouseName}'`);
    }

    deleteWarehouse(dropDb = false) {
        const promises = [];
        promises.push(snowflakePoolService.execute(this.workspaceId,
            `DROP WAREHOUSE IF EXISTS "${this.warehouseName}"; `));
        if (dropDb)
            promises.push(snowflakePoolService.execute(this.workspaceId,
                `DROP DATABASE IF EXISTS "${this.databaseName}";`));

        return Promise.all(promises)
            .then(results => {
                if (results[0]) log.info('Warehouse dropped', {name: this.warehouseName});
                if (results[1]) log.info('Database dropped', {name: this.databaseName});
                return Promise.resolve();
            })
            .catch(e => Promise.reject(e));
    }

    createTable(tableName, schema) {
        const colSpecs = [];
        schema.map(col => {
            if (col.name && col.type)
                colSpecs.push(`"${col.name}" ${col.type}`);
        });

        const sql = `CREATE OR REPLACE TABLE "${this.databaseName}"."PUBLIC"."${tableName}" (${colSpecs.join(',')})`;
        return snowflakePoolService.execute(this.workspaceId, sql)
            .then(() => log.info('Table created', {tableName}))
            .then(() => Promise.resolve());
    }

    dropTable(tableName) {
        const sql = `DROP TABLE IF EXISTS "${this.databaseName}"."PUBLIC"."${tableName}";`;
        return snowflakePoolService.execute(this.workspaceId, sql)
            .then(() => log.info('Table dropped', {tableName}))
            .then(() => Promise.resolve());
    }

    crossJoin(tableName, schemaByTable, tables) {
        return new Promise((fulfill, reject) => {
            const colSpecsByTable = {};
            const globalColSpecs = [];
            for (let index = 0; index < tables.length; index++) {
                const table = tables[index];
                const schema = schemaByTable[table];

                const colSpecs = [];

                schema.map(col => {
                    if (col.name && col.type && !systemColumn(col.name.replace(/"/gu, ''))) {
                        colSpecs.push(`"${this.databaseName}"."PUBLIC"."${table}"."${col.name}"`);
                        globalColSpecs.push(`"${col.name}"`);
                    }
                });

                colSpecsByTable[table] = colSpecs;
            }
            const seqSqlText = `CREATE OR REPLACE SEQUENCE 
            "${this.databaseName}"."PUBLIC"."seq_${tableName}" start = 1 increment = 1;`;

            console.log(seqSqlText);

            snowflakePoolService.execute(this.workspaceId, seqSqlText)
                .then(() => {
                    let sqlText = `CREATE OR REPLACE TABLE "${this.databaseName}"."PUBLIC"."${tableName}" AS 
                    SELECT "${this.databaseName}"."PUBLIC"."seq_${tableName}".NEXTVAL as "_",
                    ${globalColSpecs.join(',')}
                    FROM  "${this.databaseName}"."PUBLIC"."${tables[0]}"
                    CROSS JOIN (SELECT ${colSpecsByTable[tables[1]].join(',')} 
                    FROM  "${this.databaseName}"."PUBLIC"."${tables[1]}")`;

                    const newSchema = schemaByTable[tables[0]].filter(item => {
                        return !systemColumn(item.name);
                    }).concat(schemaByTable[tables[1]]
                    .filter(item => {
                        return !systemColumn(item.name);
                    }));

                    // lets add the _ column in as first column
                    newSchema.unshift({'name': '_', 'type': 'number'});

                    return Promise.all([sqlText, newSchema]);
                })
                .then(([sqlText, newSchema]) => Promise.all([
                    snowflakePoolService.execute(this.workspaceId, sqlText, [], false), newSchema])
                )
                .then(([, newSchema]) => {
                    fulfill(newSchema);
                })
                .catch(e => reject(e));
        });
    }

    union(tableName, schemaByTable, tables) {
        return new Promise((fulfill, reject) => {
            const colSpecs = [];
            schemaByTable[tables[0]].map(col => {
                if (col.name && col.type && !systemColumn(col.name.replace(/"/gu, '')))
                    colSpecs.push(`"${col.name}"`);
            });

            const seqSqlText = `CREATE OR REPLACE SEQUENCE "${this.databaseName}"."PUBLIC"."seq_${tableName}" 
            start = 1 increment = 1;`;

            console.log(seqSqlText);

            snowflakePoolService.execute(this.workspaceId, seqSqlText)
                .then(() => {
                    let sqlText = `CREATE OR REPLACE TABLE "${this.databaseName}"."PUBLIC"."${tableName}" AS 
                    SELECT "_", ${colSpecs.join(',')} 
                    FROM ((SELECT "${this.databaseName}"."PUBLIC"."seq_${tableName}".NEXTVAL 
                    as "_",${colSpecs.join(',')} FROM  "${this.databaseName}"."PUBLIC"."${tables[0]}") 
                    UNION (SELECT "${this.databaseName}"."PUBLIC"."seq_${tableName}".NEXTVAL 
                    as "_",${colSpecs.join(',')} 
                    FROM  "${this.databaseName}"."PUBLIC"."${tables[1]}"))`;

                    const newSchema = schemaByTable[tables[0]];

                    return Promise.all([sqlText, newSchema]);
                })
                .then(([sqlText, newSchema]) => Promise.all([
                    snowflakePoolService.execute(this.workspaceId, sqlText, [], false), newSchema])
                )
                .then(([, newSchema]) => {
                    fulfill(newSchema);
                })
                .catch(e => reject(e));
            });
    }

    leftJoin(tableName, schemaByTable, tables, joinColumns) {
        return new Promise((fulfill, reject) => {
            const colSpecsByTable = {};
            const globalColSpecs = [];
            const newSchema = [{'name': '_', 'type': 'number'}];
            for (let index = 0; index < tables.length; index++) {
                const table = tables[index];
                const schema = schemaByTable[table];

                const colSpecs = [];
                schema.map(col => {
                    const secondAndInList = joinColumns.indexOf(col.name) > -1 && index > 0;
                    if (col.name && col.type && !secondAndInList && !systemColumn(col.name.replace(/"/gu, ''))) {
                        colSpecs.push(`"${this.databaseName}"."PUBLIC"."${table}"."${col.name}"`);
                        globalColSpecs.push(`"${this.databaseName}"."PUBLIC"."${table}"."${col.name}"`);
                        newSchema.push({ 'name': col.name, 'type': col.type});
                    }
                });

                colSpecsByTable[table] = colSpecs;
            }

            const seqSqlText = `CREATE OR REPLACE SEQUENCE "${this.databaseName}"."PUBLIC"."seq_${tableName}" 
            start = 1 increment = 1;`;

            console.log(seqSqlText);

            snowflakePoolService.execute(this.workspaceId, seqSqlText)
                .then(() => {
                    let sqlText = `CREATE OR REPLACE TABLE "${this.databaseName}"."PUBLIC"."${tableName}" 
                    AS SELECT * FROM (`;

                    sqlText += `SELECT "${this.databaseName}"."PUBLIC"."seq_${tableName}".NEXTVAL 
                    as "_", ${globalColSpecs.join(',')} 
                    FROM "${this.databaseName}"."PUBLIC"."${tables[0]}" `;

                    for (let index = 1; index < tables.length; index++) {
                        const table = tables[index];
                        sqlText += ` LEFT OUTER JOIN "${this.databaseName}"."PUBLIC"."${table}"`;

                        const joins = [];
                        joinColumns.map(column => {
                            joins.push(` "${this.databaseName}"."PUBLIC"."${tables[0]}"."${column}" = 
                            "${this.databaseName}"."PUBLIC"."${table}"."${column}"`);
                        });

                        if (joins.length > 0) sqlText += ` ON ${joins.join(' AND ')} `;
                    }

                    sqlText += `)`;

                    console.log(sqlText);

                    return Promise.all([sqlText, newSchema]);
                })
                .then(([sqlText, newSchema]) => Promise.all([
                    snowflakePoolService.execute(this.workspaceId, sqlText, [], false), newSchema])
                )
                .then(([,newSchema]) => {
                    fulfill(newSchema);
                })
                .catch(e => reject(e));
        });
    }


    insert(tableName, rows) {

        const placeholders = [];
        const values = [];
        rows.map(row => {
            const ph = [];
            row.map(col => {
                ph.push('?');
                values.push(col);
            });
            placeholders.push(`(${ph.join(',')})`);
        });
        console.log(values[0]);
        const sql = `INSERT INTO "${this.databaseName}"."PUBLIC"."${tableName}" VALUES ${placeholders.join(',')}`;
        return snowflakePoolService.execute(this.workspaceId, sql, values);
    }

    update(tableName, rows) {

        const placeholders = [];
        const values = [];
        rows.map(row => {
            const ph = [];
            row.map(col => {
                ph.push('?');
                values.push(col);
            });
            placeholders.push(`(${ph.join(',')})`);
        });
        console.log(values[0]);
        const sql = `INSERT INTO "${this.databaseName}"."PUBLIC"."${tableName}" VALUES ${placeholders.join(',')}`;
        return snowflakePoolService.execute(this.workspaceId, sql, values);
    }

    getFilterQuery(filter) {
        const where = [];
        filter.map(f => {
            const { columnType } = f;

            if (f.filterType === 'IS_BETWEEN') where.push(`(TRY_TO_NUMBER("${f.column}") 
            BETWEEN ${f.min} AND ${f.max})`);
            if (f.filterType === 'CATEGORY') where.push(`("${f.column}" IN ('${f.categories.join("','")}'))`);
            if (f.filterType === 'CONTAINS') where.push(`("${f.column}" LIKE ('%${f.pattern}%'))`);
            if (f.filterType === 'STARTS_WITH') where.push(`("${f.column}" LIKE ('${f.pattern}%'))`);
            if (f.filterType === 'ENDS_WITH') where.push(`("${f.column}" LIKE ('%${f.pattern}'))`);
            if (f.filterType === 'GREATER_THAN') where.push(`(cast(TRY_TO_NUMBER("${f.column}") 
            as decimal(15,2)) > ${f.pattern})`);
            if (f.filterType === 'GREATER_THAN_OR_EQUAL_TO') where.push(`(cast(TRY_TO_NUMBER("${f.column}") 
            as decimal(15,2)) >= ${f.pattern})`);
            if (f.filterType === 'LESS_THAN') where.push(`(cast(TRY_TO_NUMBER("${f.column}") 
            as decimal(15,2)) < ${f.pattern})`);
            if (f.filterType === 'LESS_THAN_OR_EQUAL_TO') where.push(`(cast(TRY_TO_NUMBER("${f.column}") 
            as decimal(15,2)) <= ${f.pattern})`);
            if (f.filterType === 'EQUALS') {
                if (columnType === 'string') {
                    where.push(`("${f.column}" = '${f.pattern}')`);
                }
else {
                    where.push(`(
                        cast(TRY_TO_NUMBER("${f.column}") as decimal(15,2))
                        = cast(${f.pattern} as decimal(15,2))
                        )`);
                }
            }
            if (f.filterType === 'NOT_EQUAL_TO') {
                if (columnType === 'string') {
                    where.push(`("${f.column}" != ('${f.pattern}'))`);
                }
else {
                    where.push(`(
                        cast(TRY_TO_NUMBER("${f.column}") as decimal(15,2))
                        != cast(${f.pattern} as decimal(15,2))
                        )`);
                }
            }
            if (f.filterType === 'IS_EMPTY') where.push(`("${f.column}" LIKE '')`);
            if (f.filterType === 'IS_ERROR')
                where.push(`Not IS_NULL_VALUE(PARSE_JSON(TRY_PARSE_JSON("row_errors")):"${f.column}")`);
            if (f.filterType === 'IS_NULL') where.push(`(IS_NULL_VALUE(to_variant("${f.column}")))`);
            if (f.filterType === 'IS_NUMBER')
                where.push(`(NOT IS_NULL_VALUE(to_variant("${f.column}")) and TRY_TO_NUMBER("${f.column}"))`);
            if (f.filterType === 'IS_TEXT') where.push(`(IS_VARCHAR(to_variant("${f.column}")))`);
        });

        return where;
    }

    /**
     * Returns ReadableStream for selected rows given current active filters from offset for limit rows
     * @param tableName
     * @param filters - Array of Filter operations
     * @param sorts - Array of Sort operations
     * @param offset
     * @param limit
     * @returns {Promise<ReadableStream>} - Readable stream providing access to selected rows
     */
    selectStream({tableName, filter = [], sort = [], offset = 0, limit}) {
        return new Promise((fulfill, reject) => {
            let sqlText = `SELECT * FROM "${this.databaseName}"."PUBLIC"."${tableName}"`;
            console.log(filter);

            const where = this.getFilterQuery(filter);

            if (filter.length > 0) sqlText += ` WHERE ${where.join(' AND ')}`;

            const order = [];
            sort.map(s => {
                order.push(`"${s.column}" ${s.direction}`);
            });

            if (sort.length > 0) sqlText += ` ORDER BY ${order.join(', ')}`;

            console.log(sqlText);

            snowflakePoolService.execute(this.workspaceId, sqlText, [], true)
                .then(stmt => {
                    if (!isNaN(limit)) {
                        fulfill(stmt.streamRows({start: offset, end: offset + limit}));
                    }
                    else {
                    fulfill(stmt.streamRows());
                    }
                })
                .catch(e => reject(e));
        });
    }


    getLastRowId(tableName) {
        const sqlText = `SELECT MAX("_") as ROWID FROM "${this.databaseName}"."PUBLIC"."${tableName}"`;
        console.log(sqlText);
        return snowflakePoolService.execute(this.workspaceId, sqlText);
    }


    getCount(tableName, filter = []) {

        let sqlText = `SELECT count(*) as COUNT FROM "${this.databaseName}"."PUBLIC"."${tableName}"`;
        console.log(filter);
        const where = this.getFilterQuery(filter);
        if (filter.length > 0) sqlText += ` WHERE ${where.join(' AND ')}`;

        console.log(sqlText);
        return snowflakePoolService.execute(this.workspaceId, sqlText);
    }

    getDataQualityInfo(tableName, schema) {
        return new Promise((fulfill, reject) => {

            const queries = [];

            for (let index = 0; index < schema.length; index += 1) {
                const column = schema[index].name;

                queries.push(`(SELECT  median(colValue) median, AVG(colValue) mean, stddev(colValue) sd, name FROM 
                (SELECT TRY_TO_NUMBER("${column}") colValue, '${column}' name 
                FROM "${this.databaseName}"."PUBLIC"."${tableName}" WHERE NOT is_null_value(colValue))
                GROUP BY name order by name)`);
            }

            let sqlText = queries.join(' UNION ');

            console.log(sqlText);

            snowflakePoolService.execute(this.workspaceId, sqlText)
                .then(rows => {
                    fulfill(rows);
                })
                .catch(e => fulfill(null));
        });
    }
}

module.exports = SnowflakeService;