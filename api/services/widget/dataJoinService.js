const SnowflakeService = require('../storage/snowflakeService');
const WidgetService = require('../../services/widget/widgetService');
const { WidgetInstance } = require('../../model');
const activityBus = require('../../events/activityEventBus');
const {ActivityEventType, ActivityType} = require('../../util/enums');
const { systemColumn } = require('../../helpers/dataHelper');

const find = require('lodash/find');
const isEqual = require('lodash/isEqual');
const sortBy = require('lodash/sortBy');

const enums = require('../../util/enums');

class DataJoinService {
    constructor(workspaceId, widgetInstanceId, userId) {
        this.snowflakeService = new SnowflakeService(workspaceId);
        this.widgetInstanceId = widgetInstanceId;
        this.userId = userId;
    }

    // Returns the name of the datajoin table
    getTableName (widgetId, version) {
        return `datajoin_${widgetId}:${version}`;
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


    async union(tableName, schemaByTable, tables) {
        const newSchema = await this.snowflakeService.connect()
        .then(() => this.snowflakeService.union(tableName, schemaByTable, tables));
        return newSchema;
    }

    async leftJoin(tableName, schemaByTable, tables, joinColumns) {
        const newSchema = await this.snowflakeService.connect()
        .then(() => this.snowflakeService.leftJoin(tableName, schemaByTable, tables, joinColumns));

        return newSchema;
    }

    async crossJoin(tableName, schemaByTable, tables) {
        const newSchema = await this.snowflakeService.connect()
        .then(() => this.snowflakeService.crossJoin(tableName, schemaByTable, tables));

        return newSchema;
    }

    joinWidgets() {
        const { sequelize } = WidgetInstance; // TODO: Inject when Inversify implemented

        return new Promise((fulfill, reject) => {
            sequelize.transaction(transaction => {
                WidgetInstance.findOne({where: {id: this.widgetInstanceId}}, {transaction})
                    .then(widget => {
                        if (!widget) reject(new Error('Widget not found'));

                        const firstUpload = !widget.parameters.versions || widget.parameters.versions.length === 0;

                        let lastItem = !firstUpload
                        ? widget.parameters.versions[widget.parameters.versions.length - 1] : null;

                        const lastVersion = !firstUpload ? lastItem.version : 0;
                        const versions = !firstUpload ? widget.parameters.versions : [];
                        const finalTableName = this.getTableName(this.widgetInstanceId, lastVersion + 1);

                        const version = {
                            version: lastVersion + 1,
                            tableName: finalTableName,
                            status: 'RUNNING',
                            updatedAt: new Date(),
                            savedBy: this.userId,
                            error: '',
                        };

                        versions.push(version);

                        console.log(versions);
                        const parameters = { versions };
                        widget.parameters = { ...widget.parameters,
                            ...parameters };

                        console.log("saving");
                        widget.save();

                        const { joinLogic } = widget.parameters;

                        const widgetService = new WidgetService(this.userId);
                        widgetService.getWidgetInputData(this.widgetInstanceId, this.userId)
                        .then(async widgets => {

                            let tables = [];
                            let schemaByTable = {};
                            let joinLogicByTable = {};
                            let inputByTable = {};

                            for (let index = 0; index < widgets.length; index++) {
                                const inputWidget = widgets[index];
                                let output = inputWidget.output;
                                tables.push(output.tableName);
                                schemaByTable[output.tableName] = output.schema;
                                joinLogicByTable[output.tableName] = find(joinLogic,['id', inputWidget.id]);
                                inputByTable[output.tableName] = inputWidget;
                            }

                            const orderArray = sortBy(Object.keys(joinLogicByTable), key => {
                                        return joinLogicByTable[key].order;
                                    });

                            tables = orderArray.map(key => {
                                return key;
                            });

                            const firstTable = tables[0];

                            let baseTable = firstTable;
                            let currentTable = 'join_temp_w' + widget.id + '_step';

                            for (let index = 1; index < tables.length; index+=1) {
                                currentTable = 'join_temp_w' + widget.id + '_step_' + index;
                                currentTable = index === tables.length - 1 ? finalTableName : currentTable;

                                const combinedTable = tables[index];
                                const tableJoinLogic = joinLogicByTable[combinedTable];

                                const baseTableKeys = schemaByTable[baseTable].filter(item => {
                                    return !systemColumn(item.name);
                                }).map(attr => {
                                    return attr.name;
                                });

                                const keys = schemaByTable[combinedTable].filter(item => {
                                    return !systemColumn(item.name);
                                }).map(attr => {
                                    return attr.name;
                                });

                                // is append
                                if (tableJoinLogic.combineLogic === "appendRows") {
                                    const equals = isEqual(sortBy(keys), sortBy(baseTableKeys));
                                    if (!equals) reject(new Error(`Schemas dont match on ${inputByTable[combinedTable].title}`));

                                    const newSchema = await this.union(currentTable, schemaByTable, [ baseTable, combinedTable]); //eslint-disable-line
                                    baseTable = currentTable;
                                    schemaByTable[currentTable] = newSchema;

                                }
                                else if (tableJoinLogic.combineLogic === "lookUp") {

                                    const baseFirstKey = baseTableKeys[0];
                                    const combinedFirstKey = keys[0];

                                    if (baseFirstKey !== combinedFirstKey) reject(new Error(`Schemas dont match ${inputByTable[combinedTable].title}`));

                                    const newSchema = await this.leftJoin(currentTable, schemaByTable, [baseTable, combinedTable], [baseFirstKey]); //eslint-disable-line
                                    baseTable = currentTable;
                                    schemaByTable[currentTable] = newSchema;
                                }
                                else if (tableJoinLogic.combineLogic === "crossJoin") {
                                    const newSchema = await this.crossJoin(currentTable, schemaByTable, [baseTable, combinedTable]); //eslint-disable-line
                                    baseTable = currentTable;
                                    schemaByTable[currentTable] = newSchema;
                                }

                            }

                            const finalVersion = versions.filter(a => a.tableName === finalTableName)[0];

                            finalVersion.status = 'DONE';
                            // finalVersion.schema = schema;
                            finalVersion.schema = schemaByTable[finalTableName];
                            finalVersion.updatedAt = new Date();

                            const parameters = { currentVersion: finalVersion.version,
                                versions};

                            widget.parameters = { ...widget.parameters,
                                ...parameters };

                            widget.output = {tableName: finalVersion.tableName, schema: finalVersion.schema};
                            widget.schema = {...widget.schema, outputSchema: finalVersion.schema};

                            widget.save().then(() => {
                                // DQ on join is not needed for the moment
                                // const widgetService = new WidgetService(this.userId);
                                // widgetService.setDataQuality(widget.id)
                                // .then(() => {
                                    activityBus.emit(ActivityEventType.WIDGET_DATA, this.userId,
                                        ActivityType.JOIN_RUNNED,
                                        {}, this.widgetInstanceId);

                                    activityBus.emit(ActivityEventType.WIDGET_DATA, this.userId,
                                        ActivityType.OUTPUT_CHANGED,
                                        {}, this.widgetInstanceId);

                                    fulfill();
                                    }
                                );
                            // });

                        }).catch(e => this.updateWidgetVersionStatusError(widget, versions, finalTableName, reject, e));
                    }).catch(e => reject(e));
            }).catch(e => reject(e));
        });
    }
}

module.exports = DataJoinService;