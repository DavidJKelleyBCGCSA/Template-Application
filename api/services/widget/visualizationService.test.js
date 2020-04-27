const assert = require('chai').assert;
const { initDb } = require('../../../test/init');
const {PrimitiveWidgetClassType} = require('../../util/enums');
const VisualizationService = require('./visualizationService');
const AppCatalogService = require('../appStore/appCatalogService');
const appCatalog = new AppCatalogService();
const WorkspaceManagerService = require('../workspace/workspaceService');
const workspaceManager = new WorkspaceManagerService({mock: true});

const WidgetService = require('./widgetService');

// SKIP. We do not want to call Tableau on each test.
// TODO: Mock tableau service calls
describe.skip('Visualization Service', function () {
    before(function (done) {
        initDb()
            .then(() => done())
            .catch(e => done(e));
    });

    it(' List Chart ', function(done) {
        const visualizationService = new VisualizationService(1);

        visualizationService.listCharts()
        .then(function (resp) {
            assert.exists(resp);
            assert.isObject(resp);
            done();
        })
        .catch(e => done(e));
    });

    it('Creates a Viz widget with already custom defined Chart ', function(done) {
        const visualizationService = new VisualizationService(1);
        const moduleId = 1;
        const widgetManager = new WidgetService(1);
        widgetManager.createWidget('FS', 'desc', {}, [], PrimitiveWidgetClassType.FILE_SOURCE.id,
                                    moduleId, 'fs_test_widget')
            .then(widgetFS =>
                Promise.all([widgetFS, widgetManager.createWidget('VIZ', 'desc', {}, [],
                    PrimitiveWidgetClassType.VISUALIZE.id, moduleId)]))
            .then(([widgetFS, widgetViz]) =>
                Promise.all([widgetViz, widgetManager.setInput(widgetViz.id, widgetFS.id)]))
            .then(([widgetViz]) => {
                const url ='http://localhost:8008/workbook_template.twb';
                const config = {
                    title: 'Chart Title',
                    description: 'Chart description',
                    inputWidgetSlug: 'fs_test_widget',
                    workbookURL: url
                };
                return visualizationService.createChartFromConfig(widgetViz.id, config);
            })
            .then(() => {
                done();
            })
            .catch(e => done(e));
    });

    it('Creates a Viz widget and download its template', function(done) {
        const visualizationService = new VisualizationService(1);
        const moduleId = 1;
        const widgetManager = new WidgetService(1);
        widgetManager.createWidget('FS', 'desc', {}, [], PrimitiveWidgetClassType.FILE_SOURCE.id,
                                    moduleId, 'fs_test_widget')
            .then(widgetFS =>
                Promise.all([widgetFS, widgetManager.createWidget('VIZ', 'desc', {}, [],
                    PrimitiveWidgetClassType.VISUALIZE.id, moduleId)]))
            .then(([widgetFS, widgetViz]) =>
                Promise.all([widgetViz, widgetFS, widgetManager.setInput(widgetViz.id, widgetFS.id)]))
            .then(([widgetViz, widgetFS,]) => {
                return Promise.all([widgetViz, visualizationService.createChart(widgetViz.id, widgetFS.id,
                    'test title 12345', 'desc')]);
            })
            .then(([widgetViz,]) => Promise.all([widgetViz, visualizationService.listCharts(widgetViz.id)]))
            .then(([widgetViz, charts]) => {
                const chart = charts.charts.find(chart => chart.name === 'test title 12345');
                assert.isNotNull(chart);
                return visualizationService.generateWorkbookTemplate(widgetViz.id, chart.id);
            })
            .then(() => {
                done();
            })
            .catch(e => done(e));
    });

    it('Should instantiate an apps with a custom chart', function(done) {

        const manifest = {
            widgetClassDefs: [],
            widgetInstances: [
                {
                    title: 'FS',
                    description: 'file source',
                    type: 'PRIMITIVE_FILE_SOURCE',
                    slug: 'fs_slug',
                    version: 1,
                    parameters: {}
                },
                {
                    title: 'Viz',
                    description: 'Viz widget',
                    type: 'PRIMITIVE_VISUALIZE',
                    version: 1,
                    parameters: {},
                    inputs: ['fs_slug'],
                    config: {
                        charts: [
                            {
                                title: 'chart 1',
                                description: 'description 1',
                                inputWidgetSlug: 'fs_slug',
                                workbookURL: 'http://localhost:8008/workbook_template.twb'
                            },
                            {
                                title: 'chart 2',
                                inputWidgetSlug: 'fs_slug',
                                workbookURL: 'http://localhost:8008/workbook_template2.twb'
                            }
                        ]
                    }
                },
            ],
            app: {
                account: 'testing-handle',
                key: '0123456789',
                slug: 'sample-app-3',
                name: 'Sample App Viz test',
                description: 'This is a sample app installed by the API to test charts init configuration',
                version: 1,
                environment: 'STAGING'
            }
        };

        appCatalog.registerApp(manifest)
            .then(({app}) => {
                workspaceManager.createWorkspace('test-viz', '00000-00', 1, 'test viz workspace','STAGING')
                    .then(workspace => {
                        return appCatalog.installApp(app.id, workspace.id, 1);
                    })
                    .then(() => done())
                    .catch(e => done(e));
            });
    });

    it('gets a trusted ticket', function(done) {
        const visualizationService = new VisualizationService(1);
        const moduleId = 1;
        const widgetManager = new WidgetService(1);
        widgetManager.createWidget('VIZ', 'desc', {}, [], PrimitiveWidgetClassType.VISUALIZE.id,
                                    moduleId)
            .then(widget => {

                return visualizationService.getTrustedToken(widget.id);
            })
            .then(() => {
                done();
            })
            .catch(e => done(e));
    });

});