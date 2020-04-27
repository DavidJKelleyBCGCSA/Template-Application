const SnowflakeService = require('../storage/snowflakeService');
const { WidgetInstance } = require('../../model');
const WidgetService = require('../widget/widgetService');
const config = require('../../../config');
const { noData } = require('../../util/errors');
const { executeRecipeStep, dataPrepActionsEnum,
    executeRecipeStepSchema } = require('../../helpers/dataPrep');
const activityBus = require('../../events/activityEventBus');
const {ActivityEventType, ActivityType} = require('../../util/enums');
const INSERT_BATCH_SIZE = config.INSERT_BATCH_SIZE;

class DataPrepRecipeService {
    constructor(workspaceId, widgetInstanceId, userId) {
        this.snowflakeService = new SnowflakeService(workspaceId);
        this.widgetInstanceId = widgetInstanceId;
        this.userId = userId;
        this.widgetService = new WidgetService(userId);
    }

    // Returns the name of the dataprep table
    getTableName (widgetId, version) {
        return `dataprep_${widgetId}:${version}`;
    }

    // Returns the name of the temp dataprep table
    getTempTableName (widgetId, version) {
        return `dataprep_temp_${widgetId}:${version}`;
    }

    // Returns the count of the records of a table based on the filters
    getCount(tableName, filter) {
        return new Promise((fulfill, reject) => {
            this.snowflakeService.connect()
            .then(() => this.snowflakeService.getCount(tableName, filter))
            .then(_result => {
                    let parentCount = 0;
                    if (_result[0].COUNT !== null) {
                        parentCount = _result[0].COUNT;
                    }

                    fulfill(parentCount);

            }).catch(e => reject(e));
        });
    }

    // Returns the stream of records of a table based on the filters and sorts
    getStream(tableName, sort, filter, offset, limit) {
        return new Promise((fulfill, reject) => {
            this.snowflakeService.connect()
                .then(() => this.snowflakeService.selectStream({tableName, sort, filter, offset, limit}))
                .then(stream => {
                    fulfill(stream);
                }).catch(e => reject(e));
        });
    }

    // Returns the data of a table based on the filters and sorts
    getTableData(tableName, sort, filter, offset) {
        return new Promise((fulfill, reject) => {
            this.getCount(tableName, filter, sort)
            .then(count => {
                this.getStream(tableName, sort,
                    filter, offset, count)
                .then(stream => {
                    fulfill({ stream, count});
                }).catch(e => reject(e));
            }).catch(e => reject(e));
        });
    }

    // Creates a new table on snowflake
    createTable(tableName, schema) {
        return new Promise((fulfill, reject) => {
            this.snowflakeService.connect()
            .then(() => this.snowflakeService.createTable(tableName, schema))
                .then(result => {
                    fulfill(result);
                }).catch(e => reject(e));
        });
    }

    // Drops a table on snowflake
    dropTable(tableName) {
        return new Promise((fulfill, reject) => {
            this.snowflakeService.connect()
            .then(() => this.snowflakeService.dropTable(tableName))
                .then(result => {
                    fulfill(result);
                }).catch(e => reject(e));
        });
    }

    // Inserts rows on a table on snowflake
    insertRows(tableName, rows) {
        return new Promise((fulfill, reject) => {
            this.snowflakeService.connect()
            .then(() => this.snowflakeService.insert(tableName, rows))
                .then(result => {
                    fulfill(result);
                }).catch(e => reject(e));
        });
    }

    // Processes a stream and runs the recipe steps as required.
    // Also inserts the new rows on a snowflake table.
    processRows(stream, limit, steps, schema, tableName) {
        return new Promise((fulfill, reject) => {
            this.snowflakeService.connect()
            .then(() => {
                const rowBuffer = [];
                let batchCount = 0;
                let rowCount = 0;

                if (stream) {

                    stream.on('data', data => {
                        if (rowCount < limit) {
                            const row = [];
                            data._ = rowCount++;

                            let dataRow = data;

                            if (steps) {
                                for (let stepIndex = 0;
                                    stepIndex < steps.length; stepIndex++) {
                                    const step = steps[stepIndex];
                                    dataRow =
                                    executeRecipeStep(dataRow, step, schema);
                                }
                            }

                            schema.map(schemaCol => {
                                row.push(dataRow[schemaCol.name]);
                            });

                            rowBuffer.push(row);

                            if (batchCount++ > INSERT_BATCH_SIZE ||
                                rowCount >= limit) {
                                stream.pause();
                                this.insertRows(tableName, rowBuffer)
                                    .then(() => {
                                        rowBuffer.length = 0;
                                        batchCount = 0;
                                        stream.resume();
                                    });
                            }
                        }
                        else {
                            stream.resume();
                        }
                    });

                    stream.on('end', () => {
                        fulfill();
                    });
                }
            }).catch(e => reject(e));
        });
    }

    updateWidgetVersionStatusError(widget, versions, tableName, reject, e) {
        const finalVersion = versions.filter(a => a.tableName === tableName)[0];

        finalVersion.status = 'FAILED';
        finalVersion.error = e.message;
        finalVersion.updatedAt = new Date();

        const parameters = { currentVersion: finalVersion.version,
            versions};

        widget.parameters = { ...widget.parameters,
            ...parameters };
        widget.save().then(() => reject(e));
    }

    runRecipe(runDataQualityProcess = false) {
        return this.widgetService.getInputTables(this.widgetInstanceId)
            .then(inputs => {
                if (inputs.length === 0) return Promise.reject(noData());
                let newSchema = inputs[0].schema;
                const inputTableName = inputs[0].tableName;

                return WidgetInstance.findOne({where: {id: this.widgetInstanceId}})
                    .then(widget => {
                        if (!widget) return Promise.reject(new Error('Widget not found'));
                        const firstUpload = !widget.parameters.versions || widget.parameters.versions.length === 0;

                        let lastItem = !firstUpload
                            ? widget.parameters.versions[widget.parameters.versions.length - 1] : null;

                        const lastVersion = !firstUpload ? lastItem.version : 0;
                        const versions = !firstUpload ? widget.parameters.versions : [];
                        const tableName = this.getTableName(this.widgetInstanceId, lastVersion + 1);
                        const tempTableName = this.getTempTableName(this.widgetInstanceId, lastVersion + 1);

                        const operations = widget.operations || {};
                        const steps = operations.steps || [];

                        const version = {
                            version: lastVersion + 1,
                            tableName,
                            status: 'PENDING',
                            updatedAt: new Date(),
                            savedBy: this.userId,
                        };

                        versions.push(version);

                        console.log(versions);
                        const parameters = {versions, currentVersion: lastVersion + 1};
                        widget.parameters = {
                            ...widget.parameters,
                            ...parameters
                        };

                        console.log("saving");
                        widget.save();

                        const schemaColumns = [];
                        for (let index = 0; index < newSchema.length; index++) {
                            const element = newSchema[index];
                            schemaColumns.push(element.name);
                        }

                        //Filters on fields that exist on FS
                        const filterOldColumns = steps.filter((step) => {
                            console.log(step.type);
                            return step.type.startsWith(dataPrepActionsEnum.FILTER_BY) &&
                                schemaColumns.indexOf(step.column) > 0;
                        }) || [];

                        //Filters on fields that were added by the user.
                        const filterNewColumns = steps.filter((step) => {
                            console.log(step.type);
                            return step.type.startsWith(dataPrepActionsEnum.FILTER_BY) &&
                                schemaColumns.indexOf(step.column) < 0;
                        }) || [];

                        //Sorts
                        const sorts = steps.filter((step) => {
                            console.log(step.type);
                            return step.type.startsWith(dataPrepActionsEnum.SORT_A_Z ||
                                step.type.startsWith(dataPrepActionsEnum.SORT_Z_A));
                        }) || [];

                        for (let index = 0; index < steps.length; index++) {
                            const step = steps[index];
                            newSchema = executeRecipeStepSchema(step, newSchema);
                        }

                        return this.createTable(tempTableName, newSchema)
                            .then(() => {
                                const offset = 0;

                                return this.getTableData(inputTableName, [], filterOldColumns, offset)
                                    .then(({stream, count}) => {
                                        const {operations} = widget;
                                        const {steps} = operations;
                                        return this.processRows(stream, count, steps, newSchema, tempTableName)
                                            .then(() => this.createTable(tableName, newSchema))
                                            .then(() => this.getTableData(tempTableName, sorts,
                                                filterNewColumns, offset))
                                            .then(({stream, count}) => {
                                                const {operations} = widget;
                                                const {steps} = operations;

                                                return this.processRows(stream, count, steps, newSchema, tableName)
                                                    .then(() => {

                                                        this.dropTable(tempTableName);

                                                        const finalVersion = versions.filter(
                                                            a => a.tableName === tableName
                                                        )[0];

                                                        finalVersion.status = 'DONE';
                                                        finalVersion.schema = newSchema;
                                                        finalVersion.updatedAt = new Date();

                                                        const parameters = {
                                                            currentVersion: finalVersion.version,
                                                            versions
                                                        };
                                                        widget.parameters = {
                                                            ...widget.parameters,
                                                            ...parameters
                                                        };

                                                        widget.output = {tableName, schema: newSchema};

                                                        // update also the iput shcema in schema attr.
                                                        widget.schema = {...widget.schema, outputSchema: newSchema};


                                                        return widget.save().then(() => {
                                                            activityBus.emit(ActivityEventType.WIDGET_DATA, this.userId,
                                                                ActivityType.RECIPE_RUNNED,
                                                                {}, this.widgetInstanceId);


                                                            activityBus.emit(ActivityEventType.WIDGET_DATA, this.userId,
                                                                ActivityType.OUTPUT_CHANGED,
                                                                {}, this.widgetInstanceId);

                                                            if (runDataQualityProcess) {
                                                                const widgetService = new WidgetService(this.userId);
                                                                return widgetService.setDataQuality(widget.id);
                                                            }

                                                            return Promise.resolve();
                                                        });
                                                    });
                                            });
                                    });
                            });
                    });
            });
    }
}

module.exports = DataPrepRecipeService;