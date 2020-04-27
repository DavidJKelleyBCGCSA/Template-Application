const assert = require('chai').assert;
const { initDb } = require('../../../test/init');
const config = require('../../../config');

const AppCatalogService = require('./appCatalogService');
const appCatalog = new AppCatalogService();

const WorkspaceManagerService = require('../workspace/workspaceService');
const workspaceManager = new WorkspaceManagerService({ mock: true });

const ModuleManagerService = require('../workspace/moduleService');
const moduleManager = new ModuleManagerService();

const WidgetManagerService = require('../widget/widgetService');
const widgetManagaer = new WidgetManagerService(1);


const widgetInstances = [
    {
        "title": "Cell Data",
        "description": "Cell Data",
        "type": "PRIMITIVE_FILE_SOURCE",
        "version": 1,
        "parameters": {},
        "slug": "cell-data",
    },
    {
        "title": "Elasticity Data",
        "description": "Elasticity Data",
        "type": "PRIMITIVE_FILE_SOURCE",
        "version": 1,
        "parameters": {},
        "slug": "elasticity-data",
    },
    {
        "title": "Join Data",
        "description": "Join Data",
        "type": "PRIMITIVE_JOIN",
        "version": 1,
        "parameters": {},
        "slug": "join-data",
        "inputs": ['cell-data', 'elasticity-data']
    },
    {
        "title": "Data Prep",
        "description": "Data Prep",
        "type": "PRIMITIVE_DATA_PREP",
        "version": 1,
        "parameters": {},
        "slug": "data-prep",
        "inputs": ['join-data']
    },
    {
        "title": "Setup Widget",
        "description": "Setup for FI Price Grid",
        "type": "SetupWidget",
        "version": 1,
        "parameters": {
            "firstName": "Matt",
            "lastName": "Kropp"
        },
        "slug": "setup",
        "inputs": []
    },
    {
        "title": "Optimizer",
        "description": "Optimizer",
        "type": "OptimizerWidget",
        "version": 1,
        "parameters": {
        },
        "slug": "optimizer",
        "inputs": ['data-prep', 'join-data']
    },
    {
        "title": "Dashboard",
        "description": "Dashboard",
        "type": "PRIMITIVE_VISUALIZE",
        "version": 1,
        "parameters": {
        },
        "slug": "dashboard",
        "inputs": ['optimizer']
    }
];


describe('AppCatalog', function () {

    const manifest = (version) => ({
        widgetClassDefs: [
            {
                type: 'Widget1',
                name: 'Widget 1',
                description: 'First widget',
                version: version,
                environment: config.ENVIRONMENT,
                "tabs": [
                    { "key": "input", "name": "Input", "class": "InputTab" },
                    { "key": "output", "name": "Output", "class": "OutputTab" },
                    { "key": "activity", "name": "activity", "class": "ActivityTab" },
                    { "key": "discussion", "name": "Output", "class": "DiscussionTab" }
                ],
                config: { one: 1, two: 2, anything: 'anything' },
                parameters: ['a', 'b'],
                connectionType: "BOTH"
            },
            {
                type: 'Widget2',
                name: 'Widget 2',
                description: 'Second widget',
                version: version,
                environment: config.ENVIRONMENT,
                "tabs": [
                    { "key": "input", "name": "Input", "class": "InputTab" },
                    { "key": "output", "name": "Output", "class": "OutputTab" },
                    { "key": "activity", "name": "activity", "class": "ActivityTab" },
                    { "key": "discussion", "name": "Output", "class": "DiscussionTab" }
                ],
                config: { one: 1, two: 2, anything: 'anything' },
                parameters: ['a', 'b', 'c'],
                connectionType: "BOTH"
            }
        ],
        widgetInstances: [
            {
                title: 'Instance of Widget1',
                description: 'Widget1 is used for ABC',
                type: 'Widget1',
                version: version,
                parameters: { a: 'a', b: 'b' },
                schema: [[{col1: 'a', type: 'string'}, {col2: 'b', type: 'string'}]],
                slug: 'widget1',
                inputs: []

            },
            {
                title: 'Instance of Widget2',
                description: 'Widget2 is used for something else',
                type: 'Widget2',
                version: version,
                parameters: { a: 'a', b: 'b', c: 'c' },
                slug: 'widget2',
                inputs: ['widget1']
            },
            {
                title: 'Instance of Widget3',
                description: 'Widget1 is used for ABC',
                type: 'PRIMITIVE_VISUALIZE',
                version: 1,
                parameters: { a: 'a', b: 'b' },
                schema: [[{col1: 'aa', type: 'string'}, {col2: 'bb', type: 'string'}],
                         {inherit: true},
                         [{col12: 'a2', type: 'string'}, {col22: 'b2', type: 'string'}]],
                inputs: ['widget1', 'widget2']

            }
        ],
        app: {
            account: 'testing-handle',
            key: '0123456789',
            slug: 'sample-app-2',
            name: 'Sample App 1',
            description: 'This is a sample app installed by the API',
            version: version,
            environment: config.ENVIRONMENT,
            config: { any: 'any', damn: 'damn', thing: 1 },
        }
    });

    before(function (done) {
        initDb()
            .then(() => done())
            .catch(e => done(e));
    });

    it('Should get list of apps', function (done) {
        appCatalog.listApps()
            .then(() => done())
            .catch(e => done(e));

    });


    it('should return true if there is NO cicurlar dependecy', function(done) {
        // this will add a circular dependecy

        const response = appCatalog.isValidWidgetInstanceDependencies(widgetInstances);
        assert(response === true);
        done();
    });


    it('should return false if there is cicurlar dependecy', function(done) {
        // this will add a circular dependecy
        widgetInstances[0].inputs = ['join-data'];
        const response = appCatalog.isValidWidgetInstanceDependencies(widgetInstances);
        assert(response === false);
        done();
    });

    it('Should NOT register a new App due circular dependency ', function (done) {

        // deep copy from manifest so that, we don't modify the original one
        const manifestCopy = JSON.parse(JSON.stringify(manifest(1)));

        // here we create a circular dependency
        manifestCopy.widgetInstances[0].inputs.push('widget2');

        appCatalog.registerApp(manifestCopy)
            .catch(e => {
                console.log(e);
                assert.equal(e.message, 'Circular dependecies between widget instances is not allowed');
                done();
            });
    });


    it('Should register a new App', function (done) {
        appCatalog.registerApp(manifest(1))
            .then(() => done())
            .catch(e => done(e));
    });

    it('Should not allow to register a new App if Setup has duplicated tab keys', function (done) {
        const man = manifest(3);
        man.setup = {
            active: true,
            version: 1,
            config: {},
            parameters: {},
            tabs: [
                { "key": "tab-repeated", "name": "first setup tab" },
                { "key": "tab2", "name": "second setup tab" },
                { "key": "tab-repeated", "name": "last setup tab" },
            ],
        };
        appCatalog.registerApp(man)
            .then(() => done(new Error('Should not allow to register the App')))
            .catch(e => done());
    });


    it('Should instantiate new App in new workspace', function (done) {
        appCatalog.registerApp(manifest(2))
            .then(({ app }) => {
                workspaceManager.createWorkspace('test', '00000-00', 1, 'test workspace', config.ENVIRONMENT)
                    .then(workspace => {
                        appCatalog.installApp(app.id, workspace.id, 1)
                            .then(() => moduleManager.listModules(workspace.id, 1))
                            .then(modules => {
                                assert.equal(modules.length, 1);
                                done();
                            });
                    })
                    .catch(e => done(e));
            });
    });

    it('Should instantiate apps with already defined schemas ', function (done) {
        appCatalog.registerApp(manifest(4))
            .then(({ app }) => {
                workspaceManager.createWorkspace('test', '00000-00', 1, 'test workspace', config.ENVIRONMENT)
                    .then(workspace => {
                        appCatalog.installApp(app.id, workspace.id, 1)
                            .then(() => moduleManager.listModules(workspace.id, 1))
                            .then(modules => {
                                assert.equal(modules.length, 1);
                                return widgetManagaer.listWidgetsByModuleInstance(modules[0].id);
                            })
                            .then(widgets => {
                                const widget0 = widgets.find(widget => widget.title.endsWith('1'));
                                const widget1 = widgets.find(widget => widget.title.endsWith('2'));
                                const widget2 = widgets.find(widget => widget.title.endsWith('3'));
                                assert.isTrue(widget0.schema && widget0.schema.inputSchema.length === 1 &&
                                    widget0.schema.inputSchema[0].columns[0].col1 === 'a');
                                assert.isTrue(widget1.schema && widget1.schema.inputSchema.length === 1);
                                assert.isTrue(widget2.schema && widget2.schema.inputSchema.length === 3);
                                assert.isTrue(widget2.schema.inputSchema[0].columns[0].col1 === 'aa');
                                assert.isTrue(widget2.schema.inputSchema[1].inheritSchema);
                                assert.isTrue(widget2.schema.inputSchema[2].columns[0].col12 === 'a2');
                                done();
                            });
                    })
                    .catch(e => done(e));
            });
    });

    it('Should instantiate new App and add widget relations', function(done) {
        appCatalog.registerApp(manifest(5))
            .then(({app}) => {
                workspaceManager.createWorkspace('test', '00000-00', 1, 'test workspace',config.ENVIRONMENT)
                    .then(workspace => {
                        appCatalog.installApp(app.id, workspace.id, 1)
                            .then(() => moduleManager.listModules(workspace.id, 1))
                            .then(modules => widgetManagaer.listWidgetsByModuleInstance(modules[0].id))
                            .then(widgets => {
                                const widget0 = widgets.find(widget => widget.title.endsWith('1'));
                                const widget1 = widgets.find(widget => widget.title.endsWith('2'));
                                const widget2 = widgets.find(widget => widget.title.endsWith('3'));
                                assert.equal(widget0.fromInstance.length, 2);
                                assert.equal(widget1.fromInstance[0].id, widget2.id);
                                assert.equal(widget1.toInstance[0].id, widget0.id);
                                assert.equal(widget2.toInstance.length, 2);
                                assert.isTrue(widget2.toInstance[0].id === widget0.id ||
                                    widget2.toInstance[0].id === widget1.id);
                                assert.isTrue(widget2.toInstance[1].id === widget0.id ||
                                    widget2.toInstance[1].id === widget1.id);

                                done();
                            });
                    })
                    .catch(e => done(e));
            });
    });

});