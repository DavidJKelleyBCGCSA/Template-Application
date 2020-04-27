const bcrypt = require('bcrypt');
const { App, DevAccount, WidgetClass, ModuleTemplate, ModuleInstance, WidgetInstance,
    ModuleInstanceSetup, WidgetRelation, ModuleInstanceRun } = require('../../model');
const { Sequelize } = require('../../model');
const { PrimitiveWidgetClassType } = require('../../util/enums');
const VizService = require('../../services/widget/visualizationService');
const { depResolve } = require('../util/dataQuality');
const moment = require('moment');
const AppRunService = require('./appRunService');

class AppCatalogService {
    /**
     * List apps available in App Store
     * @param offset
     * @param limit
     * @returns {Promise<Model<any, any>[]>}
     */
    listApps(offset, limit) {
        return App.findAll({
            where: { id: { [Sequelize.Op.gt]: 1 }, primitive: { [Sequelize.Op.not]: true } }, offset,
            limit
        });
    }

    /**
     * Register new App to App Store - intended to be called by deployment script or from new App at startup
     * @param names
     * @param description
     * @param version
     * @param environment
     * @returns {*}
     */
    registerApp(manifest) {
        const { sequelize } = App; // TODO: Inject when Inversify implemented

        const { account, slug, key, name, description, version, environment, config, primitive } = manifest.app;
        const { setup, run } = manifest;

        const isValidWidgetDependencies = this.isValidWidgetInstanceDependencies(manifest.widgetInstances);

        if (!isValidWidgetDependencies) {
            return Promise.reject(new Error("Circular dependecies between widget instances is not allowed"));
        }

        // setup checks
        if (setup) {
            if (!(setup.version && setup.tabs && setup.tabs.length > 0)) {
                return Promise.reject(new Error('Manifest missing required element in Setup definition'));
            }
            // lets check if there are no duplicated tab keys
            const tabKeys = [];
            for (let index = 0; index < setup.tabs.length; index++) {
                const tab = setup.tabs[index];
                if (tabKeys.includes(tab.key)) {
                    return Promise.reject(new Error('Manifest Setup definition has tabs with duplicated keys'));
                }
                tabKeys.push(tab.key);
            }

        }

        // Create widget classes
        const widgetClasses = [];

        manifest.widgetClassDefs.map(widgetClass => {
            const { type, description, version, environment, config, parameters, tabs, name,
                connectionType } = widgetClass;
            if (!(type && description && version && environment && config && parameters))
                return Promise.reject(new Error('Manifest missing required element in widget class definitions'));

            widgetClasses.push({ type, description, version, environment, config, parameters, tabs, name, primitive,
                connectionType });
        });

        // Create components
        const widgetInstances = [];

        manifest.widgetInstances.map(widgetInstance => {
            const { title, description, type, version, parameters, slug, inputs, schema, config } = widgetInstance;
            if (!(title && type && version && parameters))
                return Promise.reject(new Error('Manifest missing required elements in widget instance specs'));

            widgetInstances.push({title, description, type, version, parameters, slug, schema, config, inputs});
        });

        // Check that devAccount exists and proper key is supplied
        const checkDevAuthorization = () => {
            return new Promise((fulfill, reject) => {
                DevAccount.findOne({ where: { handle: account } })
                    .then(devAccount => {
                        if (!devAccount) reject(new Error('No valid Dev Account found for supplied key'));

                        bcrypt.compare(key, devAccount.key).then(pass => {
                            if (pass)
                                fulfill({
                                    devAccountId: devAccount.id,
                                    allowCreatePrimitives: devAccount.allowCreatePrimitives
                                });
                            else
                                reject(new Error('No valid Dev Account found for supplied key'));
                        });
                    });
            });
        };

        // Check that this is a unique slug-version and bail if app version already registered
        const checkAppUnique = () =>
            App.findOne({ where: { slug, version } }).then(app => Promise.resolve({ unique: !app, app }));


        // Create moduleTemplate
        const createModuleTemplate = (transaction) =>
            ModuleTemplate.create({ type: 'APP', name, description, widgets: widgetInstances, config, setup, run },
                { transaction });

        // Create app
        const createApp = (transaction, devAccountId, moduleTemplateId) =>
            App.create({ primitive, slug, devAccountId, name, description, version, environment, moduleTemplateId },
                { transaction });


        const createWidgetClasses = (transaction, appId) => {
            return Promise.all(widgetClasses.map(widget => {
                widget.appId = appId;
                return WidgetClass.create(widget, { transaction });
            }));
        };

        return sequelize.transaction(t => {
            return checkDevAuthorization()
                .then(({ devAccountId, allowCreatePrimitives }) => {
                    if (!devAccountId) return Promise.reject(new Error('Unauthorized'));
                    else if (!allowCreatePrimitives && primitive) return Promise.reject(new Error('Unauthorized'));
                    return checkAppUnique()
                        .then(({ unique, app }) => {
                            if (!unique) return Promise.resolve({ created: false, app });

                            return createModuleTemplate(t)
                                .then(moduleTemplate =>
                                    createApp(t, devAccountId, moduleTemplate.id))
                                .then(app => {
                                    return createWidgetClasses(t, app.id)
                                        .then(() => Promise.resolve({ created: true, app }));
                                });
                        });
                });
        });
    }

    /**
     * Install App from App Store into user's Workspace/Module
     * @param id
     */
    installApp(appId, workspaceId, ownerId) {
        const { sequelize } = App; // TODO: Inject when Inversify implemented

        /**
         * private method to get initial configurations like schema, etc.
         * Here we can control it and add some needed logic to them.
         */
        const getInitialWidgetConfiguration = ({schema, inputs, config}) => {
            const initConfig = {};

            // lets check each of them specifically so we can have control on which attribute can be initialized.
            if (schema) {
                initConfig.schema = {inputSchema: [], outputSchema: []};

                // schema should be an array of schemas
                if (Array.isArray(schema)) {
                    schema.map(userDefinedSchema => {
                        // if the element is an array (user defined columns for this input schema)
                        if (Array.isArray(userDefinedSchema)) {
                            initConfig.schema.inputSchema.push({
                                columns: userDefinedSchema,
                                inheritSchema: false
                            });

                            // if the element is not an array then it's maybe an inherit
                        }
                        else if (userDefinedSchema.inherit || userDefinedSchema.inheritSchema) {
                            initConfig.schema.inputSchema.push({ inheritSchema: true });
                        }
                    });
                }
            }
            if (config) {
                 // here we can check config specifics thing
                 initConfig.config = {...initConfig.config, ...config};
            }

            if (inputs) {
                // lets add the inputs to the config object
                initConfig.config = {...initConfig.config, inputs};
            }

            return initConfig;
        };

        const createSetup = (moduleInstanceId, setup, transaction) =>
            ModuleInstanceSetup.create({ moduleInstanceId, ...setup, appId }, { transaction });

        const createRun = (moduleInstanceId, run, transaction) => 
            ModuleInstanceRun.create({ moduleInstanceId, ...run, appId }, { transaction });

        /**
         * Private method that executes specific logic for widgets after creation. (relations, specific vix charts, etc)
         */
        const executePostInitWidgetConfiguration = (widgetInstances) => {
            const widgetRelationPromises = [];
            const postConfigurationPromises = [];
            const vizService = new VizService(ownerId);

            // first lets check the widget relations
            widgetInstances.map(widget => {
                if (widget.config) {
                    // add relations
                    if (widget.config.inputs && widget.config.inputs.length > 0) {
                        widget.config.inputs.map(inputSlug => {
                            const inputWidgetBySlug = widgetInstances.find(aWidget => aWidget.slug === inputSlug);
                            widgetRelationPromises.push(WidgetRelation.create(
                                {fromWidgetInstanceId: inputWidgetBySlug.id,
                                toWidgetInstanceId: widget.id}));
                        });
                    }
                }
            });
            // lets wait until widget relations are created ant then move forward to continue with the init
            // configuration
            return Promise.all(widgetRelationPromises)
                .then(() => {
                    widgetInstances.map(widget => {
                        if (widget.config) {
                            // Case that viz widget has specific chart init option
                            if (widget.widgetClassId === PrimitiveWidgetClassType.VISUALIZE.id) {
                                if (widget.config.charts && widget.config.charts.length > 0) {
                                    const chartPromises = widget.config.charts.map(chart => {
                                        return () => vizService.createChartFromConfig(widget.id,
                                            {
                                                title: chart.title || 'no title',
                                                description: chart.description || '',
                                                inputWidgetSlug: chart.inputWidgetSlug || '',
                                                workbookURL: chart.workbookURL || ''
                                            });
                                    });
                                    // we need to make this in order
                                    postConfigurationPromises.push(chartPromises.reduce((promise, next) =>
                                        promise.then(next), Promise.resolve()));
                                }
                            }
                        }
                    });
                    return Promise.all(postConfigurationPromises);
                });
        };

        // get App and associated moduleTemplate
        return App.findOne({ where: { id: appId } })
            .then(app => {
                if (!app) return Promise.reject(new Error('No App found with appId ' + appId));

                const { name, description } = app;
                const moduleName = name + ' ' + moment().format('YYYY-MM-DD - hh:mm');
                return ModuleTemplate.findOne({ where: { id: app.moduleTemplateId } })
                    .then(moduleTemplate => {
                        return sequelize.transaction(transaction => {
                            // create new moduleInstance in workspace to house app
                            return ModuleInstance.create({
                                name: moduleName,
                                description,
                                workspaceId,
                                config: moduleTemplate.config,
                                ownerId
                            },
                                { transaction })
                                .then(moduleInstance => {
                                    // check if this app has a setup activated
                                    if (!moduleTemplate.setup.active) return moduleInstance;
                                    return createSetup(moduleInstance.id, moduleTemplate.setup, transaction)
                                        .then(() => moduleInstance);
                                })
                                .then(moduleInstance => {
                                    // create new widgetInstances in module
                                    return Promise.all(moduleTemplate.widgets.map(widgetSpec => {
                                        const {title, description, type, version, parameters, slug, schema,
                                                config, inputs} = widgetSpec;
                                        return WidgetClass.findOne({
                                            where: { type, version, environment: app.environment }
                                        })
                                            .then(widgetClass => {
                                                // gets well formed init configuration data
                                                const initConfig = getInitialWidgetConfiguration({schema,
                                                                    inputs, config});

                                                return WidgetInstance.create({
                                                    widgetClassId: widgetClass.id, moduleInstanceId: moduleInstance.id,
                                                    title, description, parameters, slug, ownerId, ...initConfig
                                                }, { transaction });
                                            });
                                    }))
                                    .then(widgetInstances => {
                                        // check if this app has a run activated
                                        if (!moduleTemplate.run || !moduleTemplate.run.active) return widgetInstances;
                                        
                                        // Set WidgetInstanceIds in Run tabs
                                        const appRunService = new AppRunService();
                                        moduleTemplate.run.tabs = 
                                        appRunService.addWidgetInstanceIdToTabs(
                                            moduleTemplate.run.tabs, widgetInstances);
                                        
                                        // Create run instance    
                                        return createRun(moduleInstance.id, moduleTemplate.run, transaction)
                                            .then(() => widgetInstances);                                  
                                    });
                                });
                        })
                        .then(widgetInstances => {
                            // execute specific widget init config
                            return Promise.all([widgetInstances,
                                executePostInitWidgetConfiguration(widgetInstances)]);
                        })
                        .then(([widgetInstances,]) => widgetInstances);
                    });
            });
    }


    /**
     * Validatate if the widget instances has circular dependency
     * @param widgetInstances
     * @returns {boolean}
     */
    isValidWidgetInstanceDependencies(widgetInstances) {

        const evaluate = (node) => {

            let resolved = [];
            let unresolved = [];
            return depResolve(node, resolved, unresolved, widgetInstances);
        };

        try {
            // evaluate all posible connections even unrelated ones
            for (let i = 0; i < widgetInstances.length; i++) {
                evaluate(widgetInstances[i]);
            }
        }
        catch (err) {
            console.warn(err.message);
            return false;
        }
        return true;
    }


}
module.exports = AppCatalogService;