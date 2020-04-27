const find = require('lodash/find');

const { DataSource, WidgetInstance, User } = require('../../model');
const SnowflakeService = require('./snowflakeService');
const { DataSourceType, ActivityEventType, ActivityType } = require('../../util/enums');
const activityBus = require('../../events/activityEventBus');
const config = require('../../../config');
const { systemColumn } = require('../../helpers/dataHelper');
const { isFormat } = require('../../helpers/dataTypeInferer');

const INSERT_BATCH_SIZE = config.INSERT_BATCH_SIZE;

class DataSourceService {
    constructor(workspaceId, widgetInstanceId, userId) {
        this.widgetInstanceId = widgetInstanceId;
        this.userId = userId;
        this.snowflakeService = new SnowflakeService(workspaceId);
    }

    /**
     * Gets token and offset for uploading file - allows continuation for partially uploaded files.  Required
     * prior to calling storeData
     * @param fileIdHash
     * @param filename
     * @param size
     * @param schema - schema def in form of {name: <String>, type: <String>}
     * @param tabName
     * @returns {Promise<any>}
     */
    getDataStoreToken(fileIdHash, filename, size, schema, tabName) {
        const { sequelize } = DataSource; // TODO: Inject when Inversify implemented

        return sequelize.transaction(transaction => {
            return DataSource.findAll({
                where: {widgetInstanceId: this.widgetInstanceId},
                order: [['version', 'DESC']],
            }, {transaction})
                .then(versions => {
                    const versionPend = versions.filter(a => a.fileIdHash === fileIdHash && a.status === 'PENDING');

                    // If there was already an upload started...
                    if (versionPend.length > 0) {
                        const tableName = `${this.widgetInstanceId}:${versionPend[0].version}`;
                        return this.snowflakeService.connect()
                            .then(() => this.snowflakeService.getLastRowId(tableName))
                            .then(result => {
                                let offset = 0;
                                if (result[0].ROWID !== null) {
                                    offset = result[0].ROWID + 1;
                                }

                                return Promise.resolve({token: fileIdHash, offset});
                            });
                    }

                    // We don't have an upload started, add a version to DataSource
                    const versionNumber = versions.length > 0 ? versions[0].version + 1 : 1;
                    const tableName = `${this.widgetInstanceId}:${versionNumber}`;

                    return this.snowflakeService.connect()
                        .then(() => this.snowflakeService.createTable(tableName, schema))
                        .then(() => {
                            return DataSource.create({
                                widgetInstanceId: this.widgetInstanceId,
                                version: versionNumber,
                                type: DataSourceType.FILE_UPLOAD,
                                schema,
                                tabName,
                                sourceLocation: tableName,
                                filename,
                                fileIdHash,
                                size,
                                status: 'PENDING',
                                uploadedBy: this.userId,
                            }, {transaction}).then(() => {
                                return WidgetInstance.update({parameters: {currentVersion: versionNumber}},
                                    {where: {id: this.widgetInstanceId}, transaction});
                            }).then(() => {
                                activityBus.emit(ActivityEventType.WIDGET_DATA, this.userId,
                                    ActivityType.FILE_CREATED,
                                    {filename}, this.widgetInstanceId);

                                return Promise.resolve({token: fileIdHash, offset: 0});
                            });
                        });
                });
        });
    }

    checkCellValueIsFormat(schema, name, value) {
        if (!systemColumn(name)) {
            const schemaRow = find(schema, { name: name });
            const format = schemaRow.format;

            return isFormat(value, format);
        }

        return true;
    }

    isNumber(n) {
        /*
        We were having an issue with catching invalid values like: '15019708S' as numbers.
        If you run this you get a true:

        !isNaN(parseFloat('15019708S'))
        true

        We found this solution that seems to work with all invalid values:

        !isNaN(parseFloat('123')) && !isNaN('123' - 0)
        true

        !isNaN(parseFloat('123abc')) && !isNaN('123abc' - 0)
        false

        !isNaN(parseFloat(5)) && !isNaN(5 - 0)
        true

        !isNaN(parseFloat(-5)) && !isNaN(-5 - 0)
        true

        !isNaN(parseFloat(null)) && !isNaN(null - 0)
        false

        !isNaN(parseFloat(undefined)) && !isNaN(undefined - 0)
        false

        !isNaN(parseFloat(false)) && !isNaN(false - 0)
        false

        !isNaN(parseFloat('   ')) && !isNaN('   ' - 0)
        false

        !isNaN(parseFloat('')) && !isNaN('' - 0)
        false
        */
        return !isNaN(parseFloat(n)) && !isNaN(n - 0);
    }

    checkCellValueIdDataType(schema, name, value) {
        if (!systemColumn(name)) {
            const schemaRow = find(schema, { name: name });
            const type = schemaRow.type;

            switch (type) {
                case 'number':
                    return this.isNumber(value);
                case 'string':
                default:
                    return true;
            }
        }

        return true;
    }

    storeData(token, stream, resolve) {
        return DataSource.findAll({
            where: {widgetInstanceId: this.widgetInstanceId, fileIdHash: token, status: 'PENDING'},
            order: [['version', 'DESC']],
        }).then(versions => {
            if (versions.length === 0) return Promise.reject(new Error('Invalid token'));

            const currentVersion = versions[0];
            const tableName = currentVersion.sourceLocation;
            const schema = currentVersion.schema;


            WidgetInstance.findOne({where: {id: this.widgetInstanceId}})
            .then(widget => {
                const schemaColumns = schema.filter(item => {
                    return !systemColumn(item.name);
                });
                widget.schema = {
                    ...widget.schema,
                    outputSchema: schemaColumns,
                    inputSchema: [{ columns: schemaColumns }]
                };
                widget.save();
            });

            return this.snowflakeService.connect()
                .then(() => {
                    const rowBuffer = [];
                    let batchCount = 0;

                    stream.on('data', data => {
                        //TODO: stream data as array objects to eliminate this step and added bandwidth
                        const row = [];
                        let rowErrorsIndex = 0;
                        const rowErrors = {};
                        schema.map(header => {
                            if (header.name === 'row_errors') {
                                rowErrorsIndex = row.length;
                                row.push('');
                            }
                            else {
                                let cellValue = data[header.name];

                                // const isValidFormat = this.checkCellValueIsFormat(schema, header.name, cellValue);
                                const isValidFormat = true;
                                const isValidDataType = this.checkCellValueIdDataType(schema, header.name, cellValue);

                                if (isValidDataType) {
                                    row.push(typeof cellValue !== 'undefined' ? String(cellValue) : '');
                                }
                                else {
                                    row.push(null);
                                }

                                if (!isValidFormat || !isValidDataType) {

                                    const schemaRow = find(schema, { name: header.name });
                                    const format = schemaRow.format;
                                    const type = schemaRow.type;

                                    rowErrors[header.name] = {originalValue: cellValue, isValidFormat, isValidDataType,
                                        format, type };
                                }
                            }
                        });

                        row[rowErrorsIndex] = JSON.stringify(rowErrors);
                        rowBuffer.push(row);

                        if (batchCount++ > INSERT_BATCH_SIZE) {
                            stream.pause();
                            this.snowflakeService.insert(tableName, rowBuffer)
                                .then(() => {
                                    rowBuffer.length = 0;
                                    batchCount = 0;
                                    stream.resume();
                                });
                        }
                    });

                    stream.on('end', () => {
                        if (rowBuffer.length > 0) {
                            this.snowflakeService.insert(tableName, rowBuffer);
                        }

                        currentVersion.status = 'READY';
                        currentVersion.updatedAt = new Date();

                        return currentVersion.save()
                            .then(() => WidgetInstance.findOne({where: {id: this.widgetInstanceId}}))
                            .then(widget => {
                                widget.output = {tableName, schema};
                                widget.parameters = {...widget.parameters, currentVersion: currentVersion.version};
                                return widget.save();
                            })
                            .then(() => {
                                activityBus.emit(ActivityEventType.WIDGET_DATA, this.userId,
                                    ActivityType.FILE_UPLOADED,
                                    {filename: currentVersion.filename}, this.widgetInstanceId);

                                activityBus.emit(ActivityEventType.WIDGET_DATA, this.userId,
                                    ActivityType.OUTPUT_CHANGED,
                                    {}, this.widgetInstanceId);

                                return resolve();
                            });
                    });
                });
        });
    }

    /**
     * Convenience function for testability - stores meta data assuming file already exists
     * @param filename
     * @param tabName
     * @param sourceLocation
     * @param fileIdHash
     * @param size
     * @param status
     * @param schema
     * @param metadata
     * @returns {Promise<any>}
     */
    storeVersionMeta(filename, tabName, sourceLocation, fileIdHash, size, status, schema, metadata) {
        const { sequelize } = DataSource; // TODO: Inject when Inversify implemented

        return sequelize.transaction(transaction => {
            return DataSource.findAll({where: {widgetInstanceId: this.widgetInstanceId}},{transaction})
                .then(versions => {
                    const version = versions.length > 0 ? versions[0].version : 1;
                    return DataSource.create({
                        widgetInstanceId: this.widgetInstanceId,
                        version,
                        type: DataSourceType.FILE_UPLOAD,
                        schema,
                        metadata,
                        sourceLocation,
                        filename,
                        tabName,
                        fileIdHash,
                        size,
                        status,
                        uploadedBy: this.userId,
                    }, {transaction})
                        .then(() => {
                            const output = {schema, tableName: sourceLocation};
                            return WidgetInstance.update({output}, {where: {id: this.widgetInstanceId}});
                        });
                });
        });
    }

    listVersions() {
        return DataSource.findAll({
            where: {widgetInstanceId: this.widgetInstanceId},
            include: [{
                model: User,
                attributes: ['id', 'firstName', 'lastName', ['username', 'email'], 'username', 'avatar'],
            }],
            order: [['version', 'DESC']],
        }).then(result => {
            return Promise.resolve(result);
        });
    }

    getCurrentVersion() {
        return WidgetInstance.findOne({where: {id: this.widgetInstanceId}})
            .then(widget => {
                const version = widget.parameters.currentVersion || 0;
                return Promise.resolve(version);
            });
    }

    setCurrentVersion(version) {
        const { sequelize } = DataSource; // TODO: Inject when Inversify implemented

        return sequelize.transaction(transaction => {
            return DataSource.findOne({where: {widgetInstanceId: this.widgetInstanceId, version}}, {transaction})
                .then(dataSource => {
                    return WidgetInstance.findOne({where: {id: this.widgetInstanceId}}, {transaction})
                        .then(widget => {
                            const tableName = dataSource.sourceLocation;
                            const schema = dataSource.schema;

                            widget.output = {tableName, schema};
                            widget.parameters = {...widget.parameters, currentVersion: version};

                            const schemaColumns = schema.filter(item => {
                                return !systemColumn(item.name);
                            });
                            widget.schema = {
                                ...widget.schema,
                                outputSchema: schemaColumns,
                                inputSchema: [{ columns: schemaColumns }]
                            };
                            return widget.save(transaction);
                        })
                        .then(() => {
                            activityBus.emit(ActivityEventType.WIDGET_DATA, this.userId,
                                ActivityType.CURRENT_VERSION_CHANGED,
                                {version}, this.widgetInstanceId);

                            activityBus.emit(ActivityEventType.WIDGET_DATA, this.userId,
                                ActivityType.OUTPUT_CHANGED,
                                {}, this.widgetInstanceId);

                            return Promise.resolve();
                        });
                });
        });
    }

    /**
     * Returns all metadata about version
     * @param version
     * @returns {Promise<Model<any, any> | null>}
     */
    getVersionInfo(version) {
        return DataSource.findOne({
            where: {widgetInstanceId: this.widgetInstanceId, version}
        });
    }

    /**
     * Gets stream of datasource file with specified version (or current version if not specified)
     * @param offset
     * @param limit
     * @param version
     * @returns {Promise<{stream: ReadableStream, dataSource: <Model<any, any> | null>} | never>}
     */
    getFileStream({offset = 0, limit, version} = {}) {
        const getVersion = () => {
            if (version && version !== -1) return Promise.resolve(version);
            return this.getCurrentVersion();
        };

        return getVersion()
            .then(version =>
                DataSource.findOne({where: {widgetInstanceId: this.widgetInstanceId, version}}))
            .then(dataSource => {
                const tableName = dataSource.sourceLocation;
                return this.snowflakeService.connect()
                    .then(() => this.snowflakeService.selectStream({tableName, offset, limit}))
                    .then(stream => Promise.resolve({stream, dataSource}));
            });
    }
}

module.exports = DataSourceService;