const SnowflakeService = require('../storage/snowflakeService');
const WidgetService = require('../widget/widgetService');
const { WidgetInstance, User } = require('../../model');
const { noData } = require('../../util/errors');
const activityBus = require('../../events/activityEventBus');
const {ActivityEventType, ActivityType} = require('../../util/enums');
const log = require('../../util/log');

class DataPrepService {
    constructor(workspaceId, widgetInstanceId, userId) {
        this.snowflakeService = new SnowflakeService(workspaceId);
        this.widgetInstanceId = widgetInstanceId;
        this.userId = userId;
        this.widgetService = new WidgetService(userId);
    }

    preview() {
        return new Promise((fulfill, reject) => {
            WidgetInstance.findOne({where: {id: this.widgetInstanceId}})
                .then(widget => {
                    const currentVersion = widget.parameters.currentVersion;
                    if (!currentVersion) throw noData();

                    const version = widget.parameters.versions.filter(a => a.version === currentVersion)[0];
                    const tableName = version.tableName;

                    this.snowflakeService.connect()
                        .then(() => this.snowflakeService.selectStream({tableName, offset: 0, limit: 1000}))
                        .then(stream => {
                            fulfill(stream);
                        });
                })
                .catch(e => reject(e));
        });
    }

    download(version) {
        return new Promise((fulfill, reject) => {
            WidgetInstance.findOne({where: {id: this.widgetInstanceId}})
                .then(widget => {

                    let aVersion = version;

                    if (version === -1) {
                        // a hack to say we want the current version
                        aVersion = widget.parameters.currentVersion;
                    }

                    const selectedVersion = widget.parameters.versions.filter(a => a.version === aVersion)[0];

                    if (!selectedVersion) throw noData();

                    const filename = `${selectedVersion.filename}${selectedVersion.tabName
                        ? `(${selectedVersion.tabName})` : ''}.csv`;

                    const tableName = selectedVersion.tableName;

                    this.snowflakeService.connect()
                        .then(() => this.snowflakeService.selectStream({tableName}))
                        .then(stream => fulfill({stream, filename}));
                })
                .catch(e => reject(e));
        });
    }

    addSort(params) {
        const { sequelize } = WidgetInstance; // TODO: Inject when Inversify implemented

        return sequelize.transaction(transaction => {
            return WidgetInstance.findOne({where: {id: this.widgetInstanceId}}, {transaction})
                .then(widget => {
                    const operations = widget.operations || {};
                    const steps = operations.steps || [];
                    steps.push({...params});
                    widget.operations = { steps };
                    return widget.save({transaction});
                });
        });
    }

    removeSort(stepIndex) {
        const { sequelize } = WidgetInstance; // TODO: Inject when Inversify implemented

        return sequelize.transaction(transaction => {
            return WidgetInstance.findOne({where: {id: this.widgetInstanceId}}, {transaction})
                .then(widget => {
                    const operations = widget.operations || {};
                    const steps = operations.steps || [];
                    log.info(stepIndex);
                    log.info(steps.length);

                    if (stepIndex >= 0 && stepIndex < steps.length) {
                        // steps.splice(stepIndex, steps.length);
                        steps.splice(stepIndex, 1);
                    }

                    widget.operations = { steps };
                    return widget.save({transaction});
                });
        });
    }

    addRangeFilter(params, index = null) {
        const { sequelize } = WidgetInstance; // TODO: Inject when Inversify implemented

        return sequelize.transaction(transaction => {
            return WidgetInstance.findOne({where: {id: this.widgetInstanceId}}, {transaction})
                .then(widget => {
                    const operations = widget.operations || {};
                    const steps = operations.steps || [];
                    if (index !== null) {
                        steps[index] = params;
                    }
 else {
                        steps.push({...params});
                    }
                    widget.operations = {steps};
                    return widget.save({transaction});
                });
        });
    }

    removeRangeFilter(stepIndex) {
        const { sequelize } = WidgetInstance; // TODO: Inject when Inversify implemented

        return sequelize.transaction(transaction => {
            return WidgetInstance.findOne({where: {id: this.widgetInstanceId}}, {transaction})
                .then(widget => {
                    const operations = widget.operations || {};
                    const steps = operations.steps || [];
                    if (stepIndex >= 0 && stepIndex < steps.length) {
                       //steps.splice(stepIndex, steps.length);
                       steps.splice(stepIndex, 1);
                    }
                    widget.operations = {steps};
                    return widget.save({transaction});
                });
        });
    }

    addCategoryFilter(params, index = null) {
        const { sequelize } = WidgetInstance; // TODO: Inject when Inversify implemented

        return sequelize.transaction(transaction => {
            return WidgetInstance.findOne({where: {id: this.widgetInstanceId}}, {transaction})
                .then(widget => {
                    const operations = widget.operations || {};
                    const steps = operations.steps || [];
                    if (index !== null) {
                        steps[index] = params;
                    }
 else {
                        steps.push({...params});
                    }
                    widget.operations = { steps };
                    return widget.save({transaction});
                });
        });
    }


    removeCategoryFilter(stepIndex) {
        const { sequelize } = WidgetInstance; // TODO: Inject when Inversify implemented

        return sequelize.transaction(transaction => {
            return WidgetInstance.findOne({where: {id: this.widgetInstanceId}}, {transaction})
                .then(widget => {
                    const operations = widget.operations || {};
                    const steps = operations.steps || [];
                    if (stepIndex >= 0 && stepIndex < steps.length) {
                        //steps.splice(stepIndex, steps.length);
                        steps.splice(stepIndex, 1);
                    }
                    widget.operations = { steps};
                    return widget.save({transaction});
                });
        });
    }


    addFilter(params, index = null) {
        const { sequelize } = WidgetInstance; // TODO: Inject when Inversify implemented

        return sequelize.transaction(transaction => {
            return WidgetInstance.findOne({where: {id: this.widgetInstanceId}}, {transaction})
                .then(widget => {
                    const operations = widget.operations || {};
                    const steps = operations.steps || [];
                    if (index !== null) {
                        steps[index] = params;
                    }
 else {
                        steps.push({...params});
                    }

                    widget.operations = { steps };
                    return widget.save({transaction});
                });
        });
    }


    removeFilter(stepIndex) {
        const { sequelize } = WidgetInstance; // TODO: Inject when Inversify implemented

        return sequelize.transaction(transaction => {
            return WidgetInstance.findOne({where: {id: this.widgetInstanceId}}, {transaction})
                .then(widget => {
                    const operations = widget.operations || {};
                    const steps = operations.steps || [];
                    log.info(stepIndex);
                    log.info(steps.length);

                    if (stepIndex >= 0 && stepIndex < steps.length) {
                        // steps.splice(stepIndex, steps.length);
                        steps.splice(stepIndex, 1);
                    }

                    widget.operations = {steps};
                    return widget.save({transaction});
                });
        });
    }

    /**
     * Selects data from input table, applying all sort and filter operations
     * @param offset
     * @param limit
     * @returns {PromiseLike<any | never>}
     */
    select(offset, limit) {
        return this.widgetService.getInputTables(this.widgetInstanceId)
            .then((inputTables) => {
                if (inputTables.length === 0) return Promise.reject(noData());

                const {tableName, schema} = inputTables[0];

                if (tableName && schema) {

                    return WidgetInstance.findOne({where: {id: this.widgetInstanceId}})
                        .then(widget => {
                            const operations = widget.operations || {};
                            const steps = operations.steps || [];

                            const schemaColumns = [];
                            for (let index = 0; index < schema.length; index++) {
                                const element = schema[index];
                                schemaColumns.push(element.name);
                            }

                            const sort = steps.filter((step) => {
                                log.info(step.type);
                                return step.type.startsWith("SORT_") && schemaColumns.indexOf(step.column) > 0;
                            }) || [];

                            const filter = steps.filter((step) => {
                                log.info(step.type);
                                return step.type.startsWith("FILTER_BY") && schemaColumns.indexOf(step.column) > 0;
                            }) || [];

                            log.info("sort");
                            log.info(sort);
                            log.info("filter");
                            log.info(filter);

                            return this.snowflakeService.connect()
                                .then(() =>
                                this.snowflakeService.selectStream({tableName, filter, sort, offset, limit}))
                                .then(stream => Promise.resolve(stream));

                        });
                }

                return Promise.resolve(null);
            });
    }

        /**
     * Widget input info
     * @returns {PromiseLike<any | never>}
     */
    inputInfo() {
        return this.widgetService.getInputTables(this.widgetInstanceId)
            .then((inputTables) => {
                if (inputTables.length === 0) return Promise.reject(noData());

                const {tableName, schema} = inputTables[0];

                if (tableName && schema) {
                    return WidgetInstance.findOne({where: {id: this.widgetInstanceId}})
                    .then(widget => {
                        const totalColumns = schema.length;
                        const totalDataTypes = schema.map(item => item.type)
                            .filter((value, index, self) => self.indexOf(value) === index).length;

                        //fake data for order and dataquality
                        const columns = schema.map((elem, index) => {
                            const num = Math.random() * 100;
                            return {
                                order: index,
                                name: elem.name,
                                type: elem.type,
                                dataQuality: Math.floor(num + 1)
                            };
                        });

                        const operations = widget.operations;

                        return this.snowflakeService.connect()
                            .then(() => this.snowflakeService.getCount(tableName))
                            .then(_result => {

                                let totalRows = 0;
                                if (_result[0].COUNT !== null) {
                                    totalRows = _result[0].COUNT;
                                }

                                const result = {
                                    "info": {
                                        "totalColumns": totalColumns,
                                        "totalRows": totalRows,
                                        "totalDataTypes": totalDataTypes
                                    },
                                    "columns": columns,
                                    "operations": operations,
                                };

                                return Promise.resolve(result);
                            });
                    });
                }

                return Promise.resolve(null);


            });
    }

    addStep(params, index = null) {
        const { sequelize } = WidgetInstance; // TODO: Inject when Inversify implemented

        return sequelize.transaction(transaction => {
            return WidgetInstance.findOne({where: {id: this.widgetInstanceId}}, {transaction})
                .then(widget => {
                    const operations = widget.operations || {};
                    const steps = operations.steps || [];
                    if (index !== null) {
                        steps[index] = params;
                    }
 else {
                        steps.push({...params});
                    }
                    widget.operations = {...operations, steps};
                    return widget.save({transaction});
                });
        });
    }

    removeStep(stepIndex) {
        const { sequelize } = WidgetInstance; // TODO: Inject when Inversify implemented

        return sequelize.transaction(transaction => {
            return WidgetInstance.findOne({where: {id: this.widgetInstanceId}}, {transaction})
                .then(widget => {
                    const operations = widget.operations || {};
                    const steps = operations.steps || [];

                    if (stepIndex >= 0 && stepIndex < steps.length) {
                        //steps.splice(stepIndex, steps.length);
                        steps.splice(stepIndex, 1);
                    }

                    widget.operations = {steps};
                    return widget.save({transaction});
                });
        });
    }

    listVersions() {
        return WidgetInstance.findOne({where: {id: this.widgetInstanceId}})
            .then(async widget => {
                const userJoins = [];

                const versions = widget.parameters.versions || [];

                versions.map(version => {
                    userJoins.push(User.findOne(
                        {
                            where: {id: version.savedBy},
                            attributes: ['id', 'firstName', 'lastName', ['username', 'email'], 'username', 'avatar']
                        }
                    ));
                });

                const users = await Promise.all(userJoins);

                versions.map((version, index) => {
                    version.savedBy = users[index];
                });

                return Promise.resolve({versions,
                currentVersion: widget.parameters.currentVersion});
            });
    }

    setVersion(version, userId) {
        const { sequelize } = WidgetInstance; // TODO: Inject when Inversify implemented

        return sequelize.transaction(transaction => {
            return WidgetInstance.findOne({where: {id: this.widgetInstanceId}}, {transaction})
                .then(widget => {
                    widget.parameters = {...widget.parameters, currentVersion: version};
                    return widget.save({transaction});
                })
                .then(() => {
                    activityBus.emit(ActivityEventType.WIDGET_DATA, userId,
                        ActivityType.CURRENT_VERSION_CHANGED,
                        {version}, this.widgetInstanceId);
                });
        });
    }

    /**
     * Executes all operations and writes out to new datastore table
     * @returns {Promise<never>}
     */
    // execute() {
    //     return Promise.reject(new Error('not implemented YET'));
    // }
}

module.exports = DataPrepService;