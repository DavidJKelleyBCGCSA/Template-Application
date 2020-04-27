const assert = require('chai').assert;
const { initDb } = require('../../../test/init');

const AppCatalogService = require('./appCatalogService');
const appCatalog = new AppCatalogService();

const AppSetupService = require('./appSetupService');
const appSetupService = new AppSetupService(1);

const WorkspaceManagerService = require('../workspace/workspaceService');
const workspaceManager = new WorkspaceManagerService({ mock: true });

const ModuleManagerService = require('../workspace/moduleService');
const moduleManager = new ModuleManagerService();

describe('AppSetup', function () {

    const manifest = (version) => ({
        widgetClassDefs: [
            {
                type: 'Widget1',
                name: 'Widget 1',
                description: 'First widget',
                version: version,
                environment: 'STAGING',
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
                environment: 'STAGING',
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
                slug: 'file1',
                inputs: [],
            },
            {
                title: 'Instance of Widget2',
                description: 'Widget2 is used for something else',
                type: 'Widget2',
                version: version,
                slug: 'file2',
                parameters: { a: 'a', b: 'b', c: 'c' },
                inputs: ['file1'],
            }
        ],
        app: {
            account: 'testing-handle',
            key: '0123456789',
            slug: 'sample-app-2',
            name: 'Sample App 1',
            description: 'This is a sample app installed by the API',
            version: version,
            environment: 'STAGING',
            config: {
                about: 'https://en.wiktionary.org/wiki/about_page'
            },
        },
        setup: {
            active: true,
            version: 1,
            config: {},
            parameters: {
                'defaultParams1': {
                    'param1': 1,
                    'param2': '2'
                }
            },
            tabs: [
                { "key": "tab1", "name": "first setup tab", "url": 'http://www.google.com' },
                { "key": "tab2", "name": "second setup tab", "url": 'http://www.yahoo.com' },
                { "key": "tab-last", "name": "last setup tab", "url": 'http://www.bing.com' },
            ]
        }
    });

    before(function (done) {
        initDb()
            // lets create an App to be used on the tests
            .then(() => appCatalog.registerApp(manifest(1)))
            .then(({ app }) => {
                return workspaceManager.createWorkspace('test', '00000-00', 1, 'test workspace', 'STAGING')
                    .then(workspace => {
                        appCatalog.installApp(app.id, workspace.id, 1)
                            .then(() => moduleManager.listModules(workspace.id, 1))
                            .then(modules => {
                                assert.equal(modules.length, 1);
                                this.moduleInstanceId = modules[0].id;
                                done();
                            })
                            .catch(e => done(e));
                    })
                    .catch(e => done(e));
            })
            .catch(e => done(e));
    });

    it('Should get the Setup tabs', function (done) {
        appSetupService.listSetupTabs(this.moduleInstanceId)
            .then(tabs => {
                assert.equal(tabs.length, 3);
                assert.equal(tabs[1].key, "tab2");
                done();
            })
            .catch(e => done(e));
    });

    it('Should mark second tab as good', function (done) {
        appSetupService.markTabAsGood(this.moduleInstanceId, 'tab2', true)
            .then(() => appSetupService.listSetupTabs(this.moduleInstanceId))
            .then(tabs => {
                assert.isNotTrue(tabs[0].good);
                assert.isTrue(tabs[1].good);
                assert.isNotTrue(tabs[2].good);
                done();
            })
            .catch(e => done(e));
    });


    it('Should NOT mark setup as completed if a tab is not good', function (done) {
        // last tab will remain no goodnpm run te
        appSetupService.markTabAsGood(this.moduleInstanceId, 'tab2', true)
            .then(appSetupService.markTabAsGood(this.moduleInstanceId, 'tab1', true))
            .then(() => appSetupService.markSetupAsCompleted(this.moduleInstanceId))
            .then(() => {
                done(new Error("setup should not be completed"));
            })
            .catch(e => {
                done();
            });
    });

    it('Should mark setup as completed if all tabs are good', function (done) {
        appSetupService.markTabAsGood(this.moduleInstanceId, 'tab1', true)
            .then(() => appSetupService.markTabAsGood(this.moduleInstanceId, 'tab2', true))
            .then(() => appSetupService.markTabAsGood(this.moduleInstanceId, 'tab-last', true))
            .then(() => appSetupService.markSetupAsCompleted(this.moduleInstanceId))
            .then(() => {
                done();
            })
            .catch(e => {
                done(e);
            });
    });

    it('Should get default parameters', function (done) {
        appSetupService.getParameters(this.moduleInstanceId)
            .then(params => {
                assert.containsAllKeys(params, ['defaultParams1']);
                assert.equal(params.defaultParams1.param1, 1);
                assert.equal(params.defaultParams1.param2, "2");
                done();
            })
            .catch(e => {
                done(e);
            });
    });

    it('Should add new parameters to setup', function (done) {
        const newParams = { 'newparam': 'a brand new param' };
        appSetupService.setParameters(this.moduleInstanceId, newParams)
            .then(() => appSetupService.getParameters(this.moduleInstanceId))
            .then(params => {
                assert.containsAllKeys(params, ['defaultParams1', 'newparam']);
                assert.equal(params.newparam, 'a brand new param');
                done();
            })
            .catch(e => {
                done(e);
            });
    });

    it('Should update existing parameters in setup', function (done) {
        const updatedParams = {
            'defaultParams1': {
                'param1': 111,
                'param2': '222'
            }
        };
        appSetupService.setParameters(this.moduleInstanceId, updatedParams)
            .then(() => appSetupService.getParameters(this.moduleInstanceId))
            .then(params => {
                assert.containsAllKeys(params, ['defaultParams1']);
                assert.equal(params.defaultParams1.param1, 111);
                assert.equal(params.defaultParams1.param2, "222");
                done();
            })
            .catch(e => {
                done(e);
            });
    });


});