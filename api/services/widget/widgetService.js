const { ModuleInstance, WidgetInstance, WidgetRelation, WidgetClass, Workspace,
    WarehouseAccount } = require('../../model');
const findIndex = require('lodash/findIndex');
const { Sequelize } = require('../../model');
const { forbidden } = require('../../util/errors');
const ModuleManagerService = require('../workspace/moduleService');
const moduleManager = new ModuleManagerService();
const activityBus = require('../../events/activityEventBus');
const { ActivityEventType, ActivityType } = require('../../util/enums');
const ActivityService = require('../activity/activityService');
const activityService = new ActivityService();
const DiscussionService = require('../discussion/discussionService');
const discussionService = new DiscussionService();
const SnowflakeService = require('../storage/snowflakeService');
const config = require('../../../config');
const { widgetOutputInclude, widgetInputInclude } = require('../util/includes');
const INSERT_BATCH_SIZE = config.INSERT_BATCH_SIZE;
const { PrimitiveWidgetClassType, filterConectionTypeMap } = require('../../util/enums');
const { calculateRowDataQuality, calculateDataQuality } = require('../util/dataQuality');
const isEqual = require('lodash/isEqual');
const cloneDeep = require('lodash/cloneDeep');
const { depResolve } = require('../util/dataQuality');
const { systemColumn } = require('../../helpers/dataHelper');
const seeder = require('../../util/seeder');
const DataSourceService = require('../storage/dataSourceService');

class WidgetService {
    constructor(userId) {
        this.userId = userId;
    }

    listWidgetsClasses() {
        return WidgetClass.findAll({});
    }

    listWidgetAvailableByModuleInstance(moduleInstanceId) {

        return moduleManager.getModule(moduleInstanceId, this.userId).then(({ workspaceId }) => {
            return moduleManager.listModules(workspaceId, this.userId).then(modules => {
                const modulesId = modules.map(mod => mod.id);
                return WidgetInstance.findAll({
                    attributes: ['widgetClassId'],
                    where: {
                        moduleInstanceId: modulesId
                    }
                }).then(widgetInstances => {
                    const widgetClassesId = widgetInstances.map(instance => instance.widgetClassId);
                    return WidgetClass.findAll({
                        where: {
                            [Sequelize.Op.or]: [
                                { id: widgetClassesId },
                                { primitive: true },
                            ]
                        }
                    });
                });
            });
        });
    }


    listWidgetsAvailableToConnect(moduleInstanceId, widgetInstanceId) {
        return this.listWidgetsByModuleInstance(moduleInstanceId)
            .then(widgets => {
                const passedWidget = widgets.find(widget => parseInt(widget.id) === parseInt(widgetInstanceId));
                if (!passedWidget)
                    throw new Error('the widget was no found');

                const { connectionType: widgetSendedConnectionType } = passedWidget.widgetClass;
                const filterQuery = filterConectionTypeMap[widgetSendedConnectionType];
                return widgets.filter(widget => {
                    if (filterQuery.includes(widget.widgetClass.connectionType) &&
                        parseInt(widget.id) !== parseInt(widgetInstanceId)) {
                        return widget;
                    }
                });
            });
    }

    listWidgetsByModuleInstance(moduleInstanceId) {
        const { sequelize } = WidgetInstance; // TODO: Inject when Inversify implemented
        return moduleManager.getModule(moduleInstanceId, this.userId)
            .then(() => WidgetInstance.findAll({
                where: { moduleInstanceId, deletedAt: null },
                include: [
                    {
                        model: WidgetRelation,
                        as: 'toInstance',
                        attributes: [[Sequelize.col("from_widget_instance_id"), 'id']],
                        where: {
                            WidgetRelation:
                                Sequelize.where(Sequelize.col("widgetInstance.id"),
                                    "=", Sequelize.col("toInstance.to_widget_instance_id"))
                        },
                        required: false,
                    },
                    {
                        model: WidgetRelation,
                        as: 'fromInstance',
                        attributes: [[Sequelize.col("to_widget_instance_id"), 'id']],
                        where: {
                            WidgetRelation:
                                Sequelize.where(Sequelize.col("widgetInstance.id"),
                                    "=", Sequelize.col("fromInstance.from_widget_instance_id"))
                        },
                        required: false,
                    },
                    WidgetClass, {
                        model: ModuleInstance,
                    }
                ]
            })).then((widgets) => {

                let promises = [];

                widgets.map(widget => {
                    widget.from = widget.fromInstance.map(from => from.id);
                    delete widget.fromInstance;
                    widget.to = widget.toInstance.map(to => to.id);
                    delete widget.toInstance;

                    promises.push(WidgetInstance.findAll({
                        where: {
                            id: widget.from
                        }
                    }).then(fromWidgets => {
                        return WidgetInstance.findAll({
                            where: {
                                id: widget.to
                            }
                        }).then(toWidgets => {
                            return { ...widget.toJSON(), toInstance: toWidgets, fromInstance: fromWidgets };
                        });
                    }));

                    return widget;
                });

                return Promise.all(promises).then(widgets => {
                    return widgets;
                });
            });
    }

    getWidget(id, includeWorkspaceData = false) {
        // check if we should include workspace and warehouse data on the widget. False by default
        const moduleInclude = includeWorkspaceData ? {
            model: ModuleInstance,
            include: [{
                model: Workspace,
                include: [WarehouseAccount]
            }]
        } : ModuleInstance;

        return WidgetInstance.findOne({
            where: { id, deletedAt: null },
            include: [WidgetClass, moduleInclude, 'toInstance']
        })
            .then(widget => {
                if (widget) {
                    widget.inputs = [];
                    widget.toInstance.map(input => widget.inputs.push(input.fromWidgetInstanceId));
                    return moduleManager.getModule(widget.moduleInstanceId, this.userId)
                        .then(() => widget);
                }
                throw forbidden();
            });
    }

    getWidgetInputData(id) {
        return WidgetRelation.findAll({
            where: { toWidgetInstanceId: [id] },
            attributes: ['fromWidgetInstanceId'],
        }).then(widgets => {

            let ids = [];
            if (widgets) {
                ids = widgets.map(widget => widget.fromWidgetInstanceId);
            }
            return WidgetInstance.findAll({
                where: { id: ids, deletedAt: null },
                include: [WidgetClass, ModuleInstance]
            });
        });
    }

    // TODO: Should we add security to this one ?
    listOutputs(workspaceId) {
        return WidgetRelation.findAll({
            attributes: ['id'],
            include: [{
                model: WidgetInstance,
                as: 'toInstance',
                include: [{
                    model: ModuleInstance,
                    where: { workspaceId }
                }]
            }],
        });
    }

    listOutputsByWidgetInstance(widgetInstanceId) {
        return WidgetInstance.findAll({
            attributes: ['id', 'widgetClassId', 'title', 'parameters'],
            include: [{
                model: WidgetRelation,
                as: 'toInstance',
                where: { fromWidgetInstanceId: widgetInstanceId }
            }, widgetInputInclude(widgetInstanceId)],
        });
    }

    listInputsByWidgetInstance(widgetInstanceId) {
        return WidgetInstance.findAll({
            attributes: ['id', 'widgetClassId', 'title', 'output'],
            include: [{
                model: WidgetRelation,
                as: 'fromInstance',
                where: { toWidgetInstanceId: widgetInstanceId },
            }, widgetOutputInclude(widgetInstanceId)],
        });
    }


    applySpecificWidgetLogic(widget, workspaceId) {
        switch (widget.widgetClassId) {
            case PrimitiveWidgetClassType.VISUALIZE.id:
                {
                    const VisualizationService = require('./visualizationService');
                    const visualizationService = new VisualizationService(this.userId);
                    return visualizationService.createVisulizationWidgetProjectTree(widget.id, workspaceId,
                        widget.createdAt)
                        .then(widgetVizProject => {
                            const projectId = widgetVizProject.project.id;
                            widget.parameters = { projectId, charts: [] };
                            return widget.save();
                        })
                        .catch(() => Promise.resolve({
                            id: widget.id, status: 202,
                            warning: 'There was a problem communicating with Tableau'
                        }));
                }
            case PrimitiveWidgetClassType.MODEL.id:
                {
                    const ModelService = require('./modelWidgetService');
                    const modelService = new ModelService(widget.id, workspaceId, this.userId);

                    return modelService.createNotebook()
                        .then(() => {
                            const output = { tableName: `modelOutput${widget.id}`, schema: [] };
                            widget.output = output;
                            return widget.save();
                        })
                        .then(_widget => Promise.resolve(_widget))
                        .catch(() => Promise.resolve({
                            id: widget.id, status: 202,
                            warning: 'There was a problem communicating with Jupyter'
                        }));
                }
            default:
                return Promise.resolve(widget);
        }
    }

    /**
     * Creates a new widget
     * @param title
     * @param description
     * @param parameters
     * @param inputs - {Array | number} Array of widgetInstanceIds or just a single widgetInstanceId for inputs
     * @param widgetClassId
     * @param moduleInstanceId
     * @param userId
     * @returns {PromiseLike<T | never>}
     */
    createWidget(title, description, parameters, inputs, widgetClassId, moduleInstanceId, slug) {
        let workspaceId = null;
        return moduleManager.getModule(moduleInstanceId, this.userId)
            .then(moduleInstance => {
                workspaceId = moduleInstance.workspaceId;
                return WidgetInstance.create({
                    title, description, ownerId: this.userId, parameters, inputs, widgetClassId,
                    moduleInstanceId, slug
                });
            })
            .then(widget => {
                if (Array.isArray(inputs)) {
                    inputs.map(inputWidgetId => {
                        this.setInput(widget.id, inputWidgetId, false);
                    });
                }
                else {
                    this.setInput(widget.id, inputs, true);
                }

                activityBus.emit(ActivityEventType.WIDGET_DATA, this.userId, ActivityType.WIDGET_CREATED, {},
                    widget.id);

                return this.applySpecificWidgetLogic(widget, workspaceId);
            });
    }


    /**
     * @deprecated
     */
    widgetFlow(widgetInstanceId) {
        return WidgetInstance.findOne({
            attributes: ['id', 'title', 'output', [Sequelize.literal(`0`), 'order']],
            where: {
                id: widgetInstanceId
            },
            include: [
                {
                    attributes: ['id', 'type'],
                    model: WidgetClass,
                }
            ],
        }).then(widget => {
            const result = [widget];

            return WidgetInstance.findAll({
                attributes: ['id', 'title', 'output', [Sequelize.literal('-1'), 'order']],
                include: [{
                    model: WidgetRelation,
                    as: 'fromInstance',
                    where: { toWidgetInstanceId: widgetInstanceId },
                },
                { attributes: ['id', 'type'], model: WidgetClass }
                ],
            }).then(inputs => {
                if (inputs) result.push(inputs);

                return WidgetInstance.findAll({
                    attributes: ['id', 'title', 'output', [Sequelize.literal('1'), 'order']],
                    include: [{
                        model: WidgetRelation,
                        as: 'toInstance',
                        where: { fromWidgetInstanceId: widgetInstanceId },
                    },
                    { attributes: ['id', 'type'], model: WidgetClass }
                    ],
                }).then(outputs => {
                    if (outputs) result.push(outputs);

                    return Promise.resolve(result);
                });
            });
        });
    }


    /**
     * Sets input(s) for a given widget from output of specified other widget(s)
     * @param widgetInstanceId - this widget instance
     * @param inputWidgetInstanceId - widget instance output to connect to this widgets input
     * @param userId
     * @param replace - replace existing inputs (default = false)
     * @returns {Promise<any>}
     */
    setInput(widgetInstanceId, inputWidgetInstanceId, replace = false) {
        const { sequelize } = WidgetRelation; // TODO: Inject when Inversify implemented

        const clearInputs = (transaction) => {
            if (!replace) return Promise.resolve();
            return WidgetRelation.destroy({ where: { toWidgetInstanceId: widgetInstanceId }, transaction });
        };

        return this.validateCircularDependency(widgetInstanceId, inputWidgetInstanceId, replace)
            .then(() => {
                return sequelize.transaction(transaction => {
                    return clearInputs(transaction)
                        .then(() => {
                            return WidgetRelation.upsert({
                                toWidgetInstanceId: widgetInstanceId,
                                fromWidgetInstanceId: inputWidgetInstanceId,
                            }, { transaction }).then(() => {

                                activityBus.emit(ActivityEventType.WIDGET_DATA, this.userId,
                                    ActivityType.CONNECTED_INPUT_WIDGET, { input: inputWidgetInstanceId }, widgetInstanceId);
                                activityBus.emit(ActivityEventType.WIDGET_DATA, this.userId,
                                    ActivityType.CONNECTED_OUTPUT_WIDGET, { output: widgetInstanceId }, inputWidgetInstanceId);

                                return this.getWidget(inputWidgetInstanceId)
                                    .then(inputWidget => {
                                        return this.getWidget(widgetInstanceId)
                                            .then(widget => {

                                                const schemaColumns = inputWidget.output.schema
                                                    ? inputWidget.output.schema.filter(item => {
                                                        return !systemColumn(item.name);
                                                    }) : [];

                                                const config = seeder.getPrimitiveWidgetClassConfig(widget.widgetClassId);

                                                if (config.multipleSchemaTabs) {
                                                    let nextPosition = widget.schema.inputSchema.length;
                                                    if (widget.schema.inputSchema.length === 1 &&
                                                        widget.schema.inputSchema[0].columns.length === 0) {
                                                        //default values will be overrided
                                                        nextPosition = 0;
                                                    }

                                                    const inputSchema = {};
                                                    inputSchema.inputWidgetId = inputWidget.id;
                                                    inputSchema.columns = schemaColumns;
                                                    inputSchema.inheritSchema = true;
                                                    widget.schema.inputSchema[nextPosition] = inputSchema;
                                                }
                                                else {
                                                    const inputSchema = widget.schema.inputSchema[0]
                                                        ? widget.schema.inputSchema[0] : {};
                                                    inputSchema.columns = schemaColumns;
                                                    inputSchema.inheritSchema = true;
                                                    widget.schema.inputSchema[0] = inputSchema;

                                                }

                                                return WidgetInstance.update({ schema: widget.schema },
                                                    { where: { id: widget.id } }, { transaction })
                                                    .then((result) => {
                                                        if (widget.widgetClassId === PrimitiveWidgetClassType.MODEL.id) {
                                                            const ModelWidgetService = require('./modelWidgetService');
                                                            const modelWidgetService = new ModelWidgetService(widget.id,
                                                                widget.moduleInstance.workspaceId, this.userId);
                                                            return modelWidgetService.updateInputData();
                                                        }

                                                        const runDataQualityProcess = widget.widgetClassId ===
                                                            PrimitiveWidgetClassType.DATA_PREP.id;
                                                        if (runDataQualityProcess) {
                                                            return this.setDataQuality(widgetInstanceId, inputWidget);
                                                        }
                                                    });
                                            }).catch(() => {
                                                throw new Error();
                                            });
                                    }).catch(() => {
                                        throw new Error();
                                    });

                            }).catch(() => {
                                const error = new Error(`Widget ${widgetInstanceId} or ${inputWidgetInstanceId} not found`);
                                error.status = 404;
                                throw error;
                            });
                        });
                });
            })
            .catch(err => Promise.reject(err));


    }

    /**
     * Sets output for a widget
     * @param widgetInstanceId - widget to set output for
     * @param outputWidgetInstanceId - widget that uses this widget as input
     * @param userId
     * @param replace {boolean} - make this widget the only input for outputWidgetInstance
     * @returns {Promise<any>}
     */
    setOutput(widgetInstanceId, outputWidgetInstanceId, replace = false) {
        return this.setInput(outputWidgetInstanceId, widgetInstanceId, replace);
    }

    /**
    * Removes an input source WidgetInstance
    * @param inputWidgetInstanceId
    */
    removeInput(widgetInstanceId, inputWidgetInstanceId) {
        const { sequelize } = WidgetRelation; // TODO: Inject when Inversify implemented
        return sequelize.transaction(transaction => {

            return WidgetRelation.destroy({
                where: {
                    toWidgetInstanceId: widgetInstanceId,
                    fromWidgetInstanceId: inputWidgetInstanceId,
                }
            }, { transaction }).then(() => {
                // return WidgetInstance.findOne({ where: { id: widgetInstanceId }, include: [ModuleInstance] })
                return this.getWidget(widgetInstanceId)
                    .then(widget => {

                        const config = seeder.getPrimitiveWidgetClassConfig(widget.widgetClassId);
                        if (config.multipleSchemaTabs) {

                            let widgetSchemaPosition = findIndex(widget.schema.inputSchema, o => {
                                return o.inputWidgetId === inputWidgetInstanceId;
                            });

                            if (widget.schema.inputSchema &&
                                widget.schema.inputSchema.length > 0 &&
                                widgetSchemaPosition > -1) {

                                widget.schema.inputSchema.splice(widgetSchemaPosition, 1);
                            }

                            console.log(widget.schema.inputSchema);
                        }

                        return WidgetInstance.update({ schema: widget.schema },
                            { where: { id: widget.id } }, { transaction })
                            .then((result) => {

                                activityBus.emit(ActivityEventType.WIDGET_DATA, this.userId, ActivityType.DISCONNECTED_INPUT_WIDGET,
                                    { input: inputWidgetInstanceId }, widgetInstanceId);
                            });
                    });

            });

        });
    }

    updateWidget(title = null, description = null,
        parameters = null, widgetInstanceId, strictEditMode = null) {
        return this.getWidget(widgetInstanceId, this.userId).then(async widget => {
            if (widget) {
                let canEdit = !widget.strictEditMode ||
                    await Workspace.count({
                        where: {
                            id: widget.moduleInstance.workspaceId, ownerId: this.userId,
                            deletedAt: null
                        }
                    }) === 1 ||
                    await WidgetInstance.count({ where: { id: widget.id, ownerId: this.userId } });

                // if any member can edit or this user is the worksapce owner or this user is the widget creator
                if (canEdit) {
                    const data = {};

                    if (parameters !== null) {
                        data.parameters = { ...data.parameters, ...parameters };
                    }

                    if (title !== null) {
                        data.title = title;
                    }
                    if (description !== null) {
                        data.description = description;
                    }

                    if (strictEditMode !== null) {
                        data.strictEditMode = strictEditMode;
                    }

                    const result = await WidgetInstance.update(data, { where: { id: widgetInstanceId } });

                    activityBus.emit(ActivityEventType.WIDGET_DATA, this.userId, ActivityType.WIDGET_UPDATED,
                        { title, description }, widgetInstanceId);

                    return result;

                }
                throw forbidden('You do not have enough permissions to edit this widget.');
            }
            throw forbidden('The widget to be updated was not found.');
        });
    }

    updateInputSchema(widgetInstanceId, newInputSchema) {
        return this.getWidget(widgetInstanceId, this.userId).then(async widget => {
            if (widget) {
                const data = {};

                // check if we need to update the input schema
                let inputSchemaChanged = false;
                const storedWidgetSchema = widget.schema;
                if (newInputSchema !== null && newInputSchema.length > 0) {
                    if (storedWidgetSchema !== null && storedWidgetSchema.inputSchema &&
                        storedWidgetSchema.inputSchema.length > 0) {
                        inputSchemaChanged = newInputSchema.some(inputSchema => !isEqual(inputSchema,
                            storedWidgetSchema.inputSchema));
                    }
                }

                if (inputSchemaChanged) {
                    data.schema = { ...storedWidgetSchema, inputSchema: newInputSchema };

                    // if widget is FS, then we need to apply this input schema as the output schema too
                    if (widget.widgetClassId === PrimitiveWidgetClassType.FILE_SOURCE.id) {
                        data.schema.outputSchema = newInputSchema[0].columns;
                        const newFilesourceOutputSchema = cloneDeep(data.schema.outputSchema);

                        // probably we will need to add the system columns

                        if (newFilesourceOutputSchema.findIndex(schemaCol => schemaCol.name === '_') === -1) {
                            newFilesourceOutputSchema.unshift({ name: '_', type: 'integer' });
                        }
                        if (newFilesourceOutputSchema.findIndex(schemaCol =>
                            schemaCol.name === 'row_errors') === -1) {
                            newFilesourceOutputSchema.unshift({ name: 'row_errors', type: 'string' });
                        }

                        data.output = { ...widget.output, schema: newFilesourceOutputSchema };
                    }

                    activityBus.emit(ActivityEventType.WIDGET_DATA, this.userId,
                        ActivityType.WIDGET_INPUT_SCHEMA_CHANGED, {}, widgetInstanceId);

                    const result = await WidgetInstance.update(data, { where: { id: widgetInstanceId } });

                    switch (widget.widgetClassId) {
                        case PrimitiveWidgetClassType.DATA_PREP.id: {
                            return new Promise((resolve) => {
                                // this timeout ??
                                setTimeout(resolve, 3000);
                            }).then(() => {
                                return this.setDataQuality(widget.id)
                                    .then(() => result);
                            });
                        }
                        // case PrimitiveWidgetClassType.FILE_SOURCE.id: {
                        //     // we need to run the row_errors generation again
                        //     // to do this, we need to get all snowflake data ann process it again
                        //     const dataSourceService = new DataSourceService(widget.moduleInstance.workspaceId,
                        //         widgetInstanceId, this.userId);
                        //     dataSourceService.getFileStream()
                        //         .then(({stream}) => {

                        //         });
                        // }

                        default:
                            return result;
                    }
                }
            }
            throw forbidden('The widget to be updated was not found.');
        });
    }

    deleteWidget(widgetInstanceId) {
        return this.getWidget(widgetInstanceId).then(async widget => {
            if (widget) {
                const connections = await WidgetRelation.findAll({
                    where: {
                        [Sequelize.Op.or]: [
                            { toWidgetInstanceId: widgetInstanceId },
                            { fromWidgetInstanceId: widgetInstanceId },
                        ]
                    }
                });

                if (connections.length === 0) {
                    let canDelete = !widget.strictEditMode ||
                        await Workspace.count({
                            where: {
                                id: widget.moduleInstance.workspaceId, ownerId: this.userId,
                                deletedAt: null
                            }
                        }) === 1 ||
                        await WidgetInstance.count({ where: { id: widget.id, ownerId: this.userId } });

                    // if any member can edit or this user is the workspace owner or this user is the widget creator
                    if (canDelete) {
                        const data = {};
                        data.deletedAt = new Date();

                        const result = await WidgetInstance.update(data, { where: { id: widgetInstanceId } });

                        activityBus.emit(ActivityEventType.WIDGET_DATA, this.userId, ActivityType.WIDGET_DELETED,
                            {}, widgetInstanceId);

                        return result;
                    }
                    throw forbidden('You do not have enough permissions to delete this widget.');
                }
                else {
                    throw new Error('The Widget has connections with other widgets. Please disconnect them first.');
                }

            }
            throw forbidden('The widget to be deleted was not found.');
        });
    }

    getActivities(widgetInstanceId) {
        // this first call is just to know if the user is allowed to see this widget info
        return this.getWidget(widgetInstanceId)
            .then(async () => {
                const activities = await activityService.listActivitiesByWidget(widgetInstanceId);
                const updateAll = [];
                activities.forEach(activity => updateAll.push(activityService.populateActivity(activity)));

                await Promise.all(updateAll);

                return activities;
            });
    }

    /**
     * Finds the input widget for the supplied widget instance and gets its output table information
     * @param widgetInstanceId
     */
    getInputTables(widgetInstanceId) {
        return this.listInputsByWidgetInstance(widgetInstanceId)
            .then(inputWidgets => {
                return Promise.resolve(inputWidgets.map(widget => widget.output));
            });
    }

    /**
     * Gets read-only stream of output table from specified widget
     * @param widgetInstanceId
     * @returns {Promise<T | never>}
     */
    getOutputStream(widgetInstanceId) {
        return this.getWidget(widgetInstanceId).then(widget => {
            if (widget) {
                const workspaceId = widget.moduleInstance.workspaceId;
                const snowflakeService = new SnowflakeService(workspaceId);
                const tableName = widget.output.tableName;
                if (!tableName) return Promise.resolve(null);

                return snowflakeService.connect()
                    .then(() => snowflakeService.selectStream({ tableName }))
                    .then(stream => Promise.resolve(stream));
            }
            Promise.resolve(null);
        }).catch(error => {
            console.log(error);
            Promise.resolve(null);
        });
    }

    /**
     * Sets schema for output.  Must be called before calling saveOutput
     * @param widgetInstanceId
     * @param schema
     */
    setOutputSchema(widgetInstanceId, schema) {
        const { sequelize } = WidgetInstance; // TODO: Inject when Inversify implemented
        const newSchema = [...schema];
        if (schema.findIndex(column => column.name === '_') === -1) {
            newSchema.unshift({ name: '_', type: 'integer' });
        }
        return sequelize.transaction(transaction => {
            return WidgetInstance.findOne({ where: { id: widgetInstanceId } }, { transaction })
                .then(widget => {
                    // const tableName = widget.tableName;
                    const tableName = widget.output.tableName;
                    widget.output = { schema: newSchema, tableName };
                    return widget.save({ transaction })
                        .then(() => Promise.resolve(widget));
                });
        });
    }

    /**
     * Takes stream and save to output table of this widget
     * @param widgetInstanceId
     * @param schema
     * @param stream - readable stream
     */
    saveOutput(widgetInstanceId, stream) {
        return this.getWidget(widgetInstanceId)
            .then(widget => {
                const workspaceId = widget.moduleInstance.workspaceId;
                const snowflakeService = new SnowflakeService(workspaceId);

                const oldTableName = widget.output.tableName;
                const schema = widget.output.schema;
                if (!schema) return Promise.reject(new Error('Schema must be defined before saving output'));

                // Name tablename with unix timestamp for uniqueness
                const tableName = `${widgetInstanceId}:${new Date().getTime()}`;

                return snowflakeService.connect()
                    .then(() => snowflakeService.createTable(tableName, schema))
                    .then(() => {
                        const rowBuffer = [];
                        let batchCount = 0;
                        let rowCount = 0;

                        stream.on('data', buffer => {
                            //TODO: stream data as array objects to eliminate this step and added bandwidth
                            const data = JSON.parse(buffer.toString('utf8'));
                            const row = [rowCount++];
                            schema.map(header => {
                                if (header.name !== '_') {
                                    const cellValue = data[header.name];
                                    row.push(typeof cellValue !== 'undefined' ? String(cellValue) : '');
                                }
                            });
                            rowBuffer.push(row);

                            if (batchCount++ > INSERT_BATCH_SIZE) {
                                stream.pause();
                                snowflakeService.insert(tableName, rowBuffer)
                                    .then(() => {
                                        rowBuffer.length = 0;
                                        batchCount = 0;
                                        stream.resume();
                                    });
                            }
                        });

                        stream.on('end', () => {
                            if (rowBuffer.length > 0) {
                                snowflakeService.insert(tableName, rowBuffer);
                            }

                            widget.output = { schema, tableName };
                            return widget.save()
                                .then(() => {
                                    if (oldTableName) snowflakeService.dropTable(oldTableName);

                                    activityBus.emit(ActivityEventType.WIDGET_DATA, this.userId,
                                        ActivityType.OUTPUT_CHANGED,
                                        {}, widgetInstanceId);
                                    return Promise.resolve();
                                });
                        });
                    });
            });
    }

    getParameters(widgetInstanceId) {
        return this.getWidget(widgetInstanceId)
            .then(widget => Promise.resolve(widget.parameters));
    }

    setParameters(widgetInstanceId, parameters) {
        const { sequelize } = WidgetInstance; // TODO: Inject when Inversify implemented
        return sequelize.transaction(transaction => {
            return WidgetInstance.findOne({ where: { id: widgetInstanceId } }, { transaction })
                .then(widget => {
                    widget.parameters = { ...widget.parameters, ...parameters };
                    return widget.save({ transaction });
                });
        });
    }

    addComment(text, widgetInstanceId) {
        // checks if user is allowed to add a comment to this widget
        return this.getWidget(widgetInstanceId)
            .then(widgetInstance => {
                return discussionService.addComment(this.userId, text, widgetInstance.moduleInstance.workspaceId,
                    widgetInstance.moduleInstanceId, widgetInstanceId)
                    .then(comment => {
                        activityBus.emit(ActivityEventType.WIDGET_DATA, this.userId, ActivityType.COMMENTED_ON_WIDGET,
                            { commentId: comment.id }, widgetInstanceId);
                    }
                    );
            });
    }

    getComments(widgetInstanceId, limit) {
        // this first call is just to know if the user is allowed to see this workspace info
        return this.getWidget(widgetInstanceId)
            .then(() => {
                return discussionService.listCommentsByWidget(widgetInstanceId, limit)
                    .then(comments => {
                        const updateAll = [];
                        comments.forEach(comment => updateAll.push(discussionService.populateComment(comment)));
                        return Promise.all(updateAll);
                    });
            });
    }

    // Returns the count of the records of a table based on the filters
    getCount(workspaceId, tableName) {

        return new Promise((fulfill, reject) => {
            const snowflakeService = new SnowflakeService(workspaceId);
            snowflakeService.connect()
                .then(() => snowflakeService.getCount(tableName))
                .then(_result => {

                    let parentCount = 0;
                    if (_result[0].COUNT !== null) {
                        parentCount = _result[0].COUNT;
                    }

                    fulfill(parentCount);

                }).catch(e => reject(e));
        });
    }

    getDataQualityInfo(workspaceId, tableName, schema) {
        return new Promise((fulfill, reject) => {
            const snowflakeService = new SnowflakeService(workspaceId);
            snowflakeService.connect()
                .then(() => snowflakeService.getDataQualityInfo(tableName, schema))
                .then(_result => {
                    fulfill(_result);
                }).catch(e => reject(e));
        });
    }

    setDataQuality(widgetInstanceId, inputWidget = null) {
        return new Promise((fulfill, reject) => {
            return this.getWidget(widgetInstanceId)
                .then(widget => {
                    if (widget) {
                        widget.parameters = { ...widget.parameters, dataQualityInfo: {} };
                        widget.save();

                        this.getWidgetInputData(widgetInstanceId).then(inputs => {

                            let dataWidget = {};
                            let schema = {};
                            let queryId = 0;
                            let tableName = "";
                            let widgetSchema = {};
                            let input = inputWidget;

                            if (!dataWidget.output) fulfill();

                            // TODO: For widget that allows multiple input, we will need to check them all..
                            // not only the first one, and somehow merge them.
                            if (widget.schema.inputSchema && widget.schema.inputSchema[0] &&
                                widget.schema.inputSchema[0].columns &&
                                widget.schema.inputSchema[0].columns.length > 0) {
                                // if it's not an inherit
                                dataWidget = widget;
                                widgetSchema = dataWidget.schema.inputSchema[0].columns;
                                const auxWidget = input ? input : inputs[0];
                                queryId = auxWidget.id;
                                // version = auxWidget.parameters.currentVersion;
                                // tableName = `${auxWidget.id}:${version}`;
                                tableName = auxWidget.output.tableName;
                                // schema = auxWidget.schema.outputSchema;
                                schema = auxWidget.output.schema;
                            }
                            else {
                                // if it is an inherit
                                dataWidget = input ? input : inputs[0];
                                // schema = dataWidget.schema.outputSchema;
                                // widgetSchema = dataWidget.schema.outputSchema;
                                schema = dataWidget.output.schema;
                                widgetSchema = dataWidget.output.schema;
                                // version = dataWidget.parameters.currentVersion;
                                // tableName = `${dataWidget.id}:${version}`;
                                tableName = dataWidget.output.tableName;

                                queryId = dataWidget.id;
                            }

                            schema = schema.filter(item => {
                                return !systemColumn(item.name);
                            });

                            const workspaceId = dataWidget.moduleInstance.workspaceId;
                            this.getDataQualityInfo(workspaceId, tableName, schema).then(dataQualityInfo => {
                                if (dataQualityInfo) {
                                    this.getCount(workspaceId, tableName).then(count => {
                                        this.getOutputStream(queryId).then(stream => {
                                            let summary = {};
                                            let keys = {};
                                            stream.on('data', data => {
                                                keys = Object.keys(data);
                                                summary = calculateRowDataQuality(data, widgetSchema,
                                                    dataQualityInfo, summary);
                                            });
                                            stream.on('end', () => {
                                                const totalSummary = calculateDataQuality(keys, widgetSchema,
                                                    count, summary);
                                                widget.parameters = {
                                                    ...widget.parameters,
                                                    dataQualityInfo: totalSummary
                                                };
                                                widget.save()
                                                    .then(() => fulfill({ totalSummary }));

                                                activityBus.emit(ActivityEventType.WIDGET_DATA,
                                                    this.userId, ActivityType.DATA_QUALITY_UPDATED, {},
                                                    widget.id);
                                            });
                                        }).catch(e => reject(e));
                                    }).catch(e => reject(e));
                                }
                                else {
                                    fulfill({});
                                }
                            }).catch(e => reject(e));
                        });
                    }
                }).catch(e => reject(e));
        });
    }

    setParametersSlug(moduleInstanceId, widgetInstanceSlug, parameters) {
        const { sequelize } = WidgetInstance; // TODO: Inject when Inversify implemented
        return sequelize.transaction(transaction => {
            return WidgetInstance.findOne({ where: { moduleInstanceId: moduleInstanceId, slug: widgetInstanceSlug } },
                { transaction })
                .then(widget => {
                    if (widget) {
                        widget.parameters = { ...widget.parameters, ...parameters };
                        return widget.save({ transaction });
                    }
                });
        });
    }


    validateCircularDependency(widgetInstanceId, inputWidgetInstanceId, replace) {


        // evaluate depenency by node
        const evaluate = (node, mappedWidgetInstance) => {
            let resolved = [];
            let unresolved = [];
            depResolve(node, resolved, unresolved, mappedWidgetInstance);
        };

        // add new widget connection on code, in order to test ig this generate a circular dependency
        const addConnection = (widgetInstanceId, inputWidgetInstanceId, mappedWidgetInstance) => {
            const idx = mappedWidgetInstance.findIndex(widget => widget.slug === widgetInstanceId);
            if (!mappedWidgetInstance[idx].inputs.includes(inputWidgetInstanceId))
                mappedWidgetInstance[idx].inputs.push(inputWidgetInstanceId);
        };

        // emulate the remove when replace is sended
        const removeWhenReplace = (widgetInstanceId, mappedWidgetInstance) => {
            //return;
            for (let i = 0; i < mappedWidgetInstance.length; i++) {
                //const idx = mappedWidgetInstance.findIndex(widget => widget.inputs.includes(widgetInstanceId));
                const idxToRemove = mappedWidgetInstance[i].inputs.findIndex(el => el === widgetInstanceId);
                if (idxToRemove > -1)
                    mappedWidgetInstance[i].inputs.splice(idxToRemove, 1);
            }
        };

        return new Promise((resolve, reject) => {
            this.getWidget(widgetInstanceId)
                .then(moduleInstance => this.listWidgetsByModuleInstance(moduleInstance.moduleInstanceId))
                .then(widgets => {

                    // formatted to make it work using our depResolver method
                    const mappedWidgetInstance = widgets.map(widget => {
                        return {
                            slug: widget.id,
                            inputs: widget.toInstance.map(w => w.id)
                        };
                    });

                    if (replace)
                        removeWhenReplace(widgetInstanceId, mappedWidgetInstance);

                    // here we add the new connection to test the circular dependency if any
                    addConnection(widgetInstanceId, inputWidgetInstanceId, mappedWidgetInstance);

                    try {
                        // this way we can evaluate unrelated dependencies
                        for (let i = 0; i < mappedWidgetInstance.length; i++) {
                            evaluate(mappedWidgetInstance[i], mappedWidgetInstance);
                        }
                    }
                    catch (err) {
                        console.warn(err.message);
                        reject(err);
                    }
                    resolve(true);
                })
                .catch(err => reject(err));
        });
    }


}

module.exports = WidgetService;