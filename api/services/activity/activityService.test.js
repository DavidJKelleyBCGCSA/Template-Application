const assert = require('chai').assert;
const { initDb } = require('../../../test/init');

const WorkspaceService = require('../workspace/workspaceService');
const workspaceManager = new WorkspaceService({mock: true});

const ModuleManagerService = require('../workspace/moduleService');
const moduleManager = new ModuleManagerService();

const WidgetService = require('../widget/widgetService');

const ActivityService = require('./activityService');
const activityManager = new ActivityService();

const {ActivityType} = require('../../util/enums');

describe('Activity Service', function () {

    const ownerId = 1;

    before(function (done) {
        initDb()
            .then(() => done())
            .catch(e => done(e));
    });

    it('will register an activity when creating a workspace', function(done) {
        workspaceManager.createWorkspace('test', '00000-00', ownerId, 'test workspace',
        'STAGING', ['anemail@email.net'])
            .then(workspace => {
                setTimeout(() => {
                    activityManager.listActivitiesByWorkspace(workspace.id, ownerId)
                    .then(activities => {
                        assert.lengthOf(activities, 2);
                        const workspaceActivity = activities.find(activity => activity.type ===
                            ActivityType.WORKSPACE_CREATED);
                        assert.equal(workspaceActivity.workspaceId,workspace.id);

                        const workspaceActivity2 = activities.find(activity => activity.type ===
                            ActivityType.WORKSPACE_USERS_INVITED);
                        assert.equal(workspaceActivity2.workspaceId,workspace.id);

                        done();
                    })
                    .catch(e => done(e));
                }, 1000);
            });

    });

    it('will register an activity when creating a module', function(done) {
        const workpsaceId = 1;
        moduleManager.createModule('A test module', 'A description', workpsaceId, ownerId)
            .then(amodule => {
                setTimeout(() => {
                    activityManager.listActivitiesByModule(amodule.id, ownerId)
                    .then(activities => {
                        assert.lengthOf(activities, 1);
                        const modActivity = activities.find(activity => activity.type === ActivityType.MODULE_CREATED);
                        assert.equal(modActivity.workspaceId, workpsaceId);
                        assert.equal(modActivity.moduleInstanceId, amodule.id);
                        done();
                    })
                    .catch(e => done(e));
                }, 1000);
        });
    });

    it('will register an activity when creating a widget', function(done) {
        const workpsaceId = 1;
        const moduleId = 1;
        const widgetService = new WidgetService(ownerId);
        widgetService.createWidget('Test widget', 'desc', {}, [], 1, moduleId)
            .then(widget => {
                setTimeout(() => {
                    activityManager.listActivitiesByWidget(widget.id, ownerId)
                    .then(activities => {
                        assert.lengthOf(activities, 1);
                        const widgetActivity = activities.find(activity => activity.type ===
                            ActivityType.WIDGET_CREATED);
                        assert.equal(widgetActivity.workspaceId, workpsaceId);
                        assert.equal(widgetActivity.moduleInstanceId, moduleId);
                        assert.equal(widgetActivity.widgetInstanceId, widget.id);
                        done();
                    })
                    .catch(e => done(e));
                }, 1000);
        });
    });

    it('will register an activity when a widget is set as an input of another one', function(done) {
        const moduleId = 1;
        const widgetService = new WidgetService(ownerId);
        widgetService.createWidget('Test widget FS', 'desc', {}, [], 1, moduleId)
        .then(widgetFS => {
            widgetService.createWidget('Test widget DP', 'desc', {}, [], 2, moduleId)
                .then(widgetDP => {
                    widgetService.setInput(widgetDP.id, widgetFS.id)
                    .then(() => {
                        setTimeout(() => {
                            activityManager.listActivitiesByWidget(widgetDP.id)
                                .then(activities => {
                                    assert.equal(activities[0].type, ActivityType.CONNECTED_INPUT_WIDGET);
                                })
                                .then(() => activityManager.listActivitiesByWidget(widgetFS.id))
                                .then(activities => {
                                    assert.equal(activities[0].type, ActivityType.CONNECTED_OUTPUT_WIDGET);
                                })
                                .then(() => done())
                                .catch(e => done(e));
                        }, 1000);
                    });
            });
        });
    });

    it('will register an activity when a widget is set as an output of another one', function(done) {
        const moduleId = 1;
        const widgetService = new WidgetService(ownerId);
        widgetService.createWidget('Test widget FS', 'desc', {}, [], 1, moduleId)
        .then(widgetFS => {
            widgetService.createWidget('Test widget DP', 'desc', {}, [], 2, moduleId)
                .then(widgetDP => {
                    widgetService.setOutput(widgetFS.id, widgetDP.id)
                    .then(() => {
                        setTimeout(() => {
                            activityManager.listActivitiesByWidget(widgetDP.id)
                                .then(activities => {
                                    assert.equal(activities[0].type, ActivityType.CONNECTED_INPUT_WIDGET);
                                })
                                .then(() => activityManager.listActivitiesByWidget(widgetFS.id))
                                .then(activities => {
                                    assert.equal(activities[0].type, ActivityType.CONNECTED_OUTPUT_WIDGET);
                                })
                                .then(() => done())
                                .catch(e => done(e));
                        }, 1000);
                    });
            });
        });
    });
});