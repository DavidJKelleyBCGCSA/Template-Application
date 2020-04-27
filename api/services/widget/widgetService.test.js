const { assert, expect } = require('chai');
const { initDb } = require('../../../test/init');

const WidgetService = require('./widgetService');

const ModuleManagerService = require('../workspace/moduleService');
const moduleManager = new ModuleManagerService();

const workspaceService = require('../workspace/workspaceService');
const workspaceManager = new workspaceService({ mock: true });

const IdentityService = require('../user/identityService');
const identityService = new IdentityService();

const isEqual = require('lodash/isEqual');

const enums = require('../../util/enums');

describe('WidgetManager', function () {

    const ownerId = 1;
    const notOwnerId = 2;
    const workspaceId = 1;
    const moduleId = 1;
    const newUser1 = 3;

    before(function (done) {
        initDb()
            .then(() => identityService.register('john.doe.22@test.com', 'notsafeforpassword', 'John2', 'Doe2', 'BCG'))
            .then(() => {
                const newEmails = ['john.doe.22@test.com'];
                workspaceManager.inviteMembers(workspaceId, newEmails, ownerId);
            })
            .then(() => done());
    });

    it('should return primitive widgets and workspaces widget classes', function (done) {
        const moduleInstanceId = 1;
        const widgetManager = new WidgetService(ownerId);
        widgetManager.listWidgetAvailableByModuleInstance(moduleInstanceId)
            .then(list => {
                assert.typeOf(list, 'array');
                expect(list.length).to.be.above(0);
                done();
            });
    });


    it('should not return widgets instances allowed to connect with the passed widget instance', function (done) {
        const moduleInstanceId = 1;
        const widgetInstanceId = 1;
        const widgetManager = new WidgetService(ownerId);
        widgetManager.listWidgetsAvailableToConnect(moduleInstanceId, widgetInstanceId)
            .then(list => {
                assert.typeOf(list, 'array');
                expect(list.length).to.be.equal(0);
                done();
            });
    });

    it('should return widgets instances allowed to connect with the passed widget instance', function (done) {
        const moduleInstanceId = 1;
        const widgetInstanceId = 2;
        const widgetManager = new WidgetService(ownerId);
        const allowedTypes = enums.filterConectionTypeMap.BOTH;
        widgetManager.listWidgetsAvailableToConnect(moduleInstanceId, widgetInstanceId)
            .then(list => {
                assert.typeOf(list, 'array');
                expect(list.length).to.be.above(0);
                list.forEach(widget => {
                    expect(allowedTypes).that.does.include(widget.widgetClass.connectionType);
                });
                done();
            });
    });


    it('Should create widgets and list them by module id', function (done) {
        const widgetManager = new WidgetService(ownerId);
        moduleManager.createModule('new module test', 'A description', workspaceId, ownerId)
            .then(newModule =>
                Promise.all([
                    widgetManager.createWidget('Test widget 1', 'desc', {}, [], 1, newModule.id, ownerId),
                    widgetManager.createWidget('Test widget 2', 'desc', {}, [], 1, newModule.id, ownerId),
                    widgetManager.createWidget('Test widget 3', 'desc', {}, [], 1, newModule.id, ownerId),
                ])
            )
            .then((results) => widgetManager.listWidgetsByModuleInstance(results[0].moduleInstanceId))
            .then(widgets => {
                assert.lengthOf(widgets, 3);
                done();
            });
    });

    it('Should get widget by id', function (done) {
        const widgetManager = new WidgetService(ownerId);
        const widgetId = 1;
        widgetManager.getWidget(widgetId)
            .then(widget => {
                assert.equal(widget.title, `Test ${enums.PrimitiveWidgetClassType.FILE_SOURCE.name} Widget`);
                done();
            })
            .catch((e) => done(e));
    });


    it('Should not be allowed to get widget from a module/workspace this user doesnt belong to ', function (done) {
        const widgetId = 1;
        const widgetManager = new WidgetService(notOwnerId);
        widgetManager.getWidget(widgetId)
            .then(() => {
                assert.fail();
                done();
            })
            .catch(() => done());
    });

    it('Should create a widget successfully', function (done) {
        const widgetManager = new WidgetService(ownerId);
        widgetManager.createWidget('Test widget', 'desc', {}, [], 1, moduleId)
            .then(newWidget => widgetManager.getWidget(newWidget.id))
            .then(widget => {
                assert.equal(widget.title, 'Test widget');
                done();
            })
            .catch((e) => done(e));
    });

    it('Should not be allowed to create a widget from a module/workspace this user doesnt belong to', function (done) {
        const widgetManager = new WidgetService(notOwnerId);
        widgetManager.createWidget('Test widget', 'desc', {}, [], 1, moduleId)
            .then(() => {
                assert.fail();
                done();
            })
            .catch(() => done());
    });

    it('Should not be allowed to list widget from module/workspace this user doesnt boelong to ', function (done) {
        const widgetManager = new WidgetService(ownerId);
        moduleManager.createModule('new module test', 'A description', workspaceId, ownerId)
            .then(newModule =>
                Promise.all([
                    widgetManager.createWidget('Test widget 1', 'desc', {}, [], 1, newModule.id),
                    widgetManager.createWidget('Test widget 2', 'desc', {}, [], 1, newModule.id),
                    widgetManager.createWidget('Test widget 3', 'desc', {}, [], 1, newModule.id),
                ])
            )
            .then((results) => {
                const widgetManager2 = new WidgetService(notOwnerId);
                widgetManager2.listWidgetsByModuleInstance(results[0].moduleInstanceId);
            })
            .then(() => {
                assert.fail();
                done();
            })
            .catch(() => done());
    });


    it('should connect Widget 2 to Widget 1 as input, and therefore Widget 1 to Widget 2 as output', function (done) {
        const widgetManager = new WidgetService(ownerId);
        widgetManager.setInput(2, 1)
            .then(() => widgetManager.getWidget(2))
            .then((widget2) => {
                assert.equal(widget2.inputs[0], 1);
                done();
            })
            .catch(e => done(e));
    });


    it('should NOT connect Widgets due circular dependency', function (done) {
        const widgetManager = new WidgetService(ownerId);
        widgetManager.setInput(3, 1)
        .then(() => widgetManager.setInput(2, 3))
        .then(() => {
            widgetManager.setInput(1, 2).catch(e => {
                assert.equal(e.message, 'circular dependency');
                // roll back changes
                Promise.all([
                    widgetManager.removeInput(3, 1),
                    widgetManager.removeInput(2, 3)
                ]).then(() => done());

            });

        }).catch(e => done(e));
    });


    it('should list all available outputs in workspace', function (done) {
        const widgetManager = new WidgetService(ownerId);
        widgetManager.listOutputs(1)
            .then(outputs => {
                assert.equal(outputs[0].id, 1);
                done();
            })
            .catch(e => done(e));
    });

    it('Should return Widget 2 input/output flow',
        function (done) {
            const widgetManager = new WidgetService(ownerId);
            widgetManager.widgetFlow(2)
                .then((flow) => {
                    const currentWidget = flow[0].dataValues.id === 2;
                    const inputWidget = flow[1][0].dataValues.id === 1;
                    assert.isTrue(currentWidget && inputWidget);
                    done();
                })
                .catch(e => done(e));
        });


    it('should remove Widget 1 as input of Widget 2 and therefore remove Widget 2 as output of Widget 1',
        function (done) {
            const widgetManager = new WidgetService(ownerId);
            widgetManager.setInput(2, 1)
                .then(() => widgetManager.removeInput(2, 1))
                .then(() => widgetManager.getWidget(2))
                .then((widget1) => {
                    assert.lengthOf(widget1.inputs, 0);
                    done();
                })
                .catch(e => done(e));

        });

    it('should NOT detect circular dependecy if replace true', function (done) {
        const widgetManager = new WidgetService(ownerId);
        widgetManager.setInput(3, 1)
        .then(() => widgetManager.setInput(2, 3))
        .then(() => {
            widgetManager.setInput(1, 2, true)
            .then(() => {
                // roll back changes
                Promise.all([
                    widgetManager.removeInput(3, 1),
                    widgetManager.removeInput(2, 3)
                ]).then(() => done());
            })
            .catch(e => done(e));

        }).catch(e => done(e));
    });


    it('Should edit a widget if user is the owner of workspace', function (done) {
        const widgetTitle = 'widget edited';
        const widgetManager = new WidgetService(ownerId);
        widgetManager.createWidget('first name', 'A description', {}, [], 1, moduleId)
            .then(widget => {
                const widgetManager = new WidgetService(ownerId);
                widgetManager.updateWidget(widgetTitle, null, null, widget.id)
                    .then(() => widgetManager.getWidget(widget.id))
                    .then((updatedWidget) => {
                        assert.equal(updatedWidget.title, widgetTitle);
                        done();
                    })
                    .catch((e) => done(e));
            })
            .catch((e) => done(e));
    });

    it('Should edit a widget if user is the creator of that widget', function (done) {
        const widgetTitle = 'widget edited';
        const widgetManager = new WidgetService(newUser1);
        widgetManager.createWidget('first name', 'A description', {}, [], 1, moduleId)
            .then(widget => {
                widgetManager.updateWidget(widgetTitle, null, null, widget.id)
                    .then(() => widgetManager.getWidget(widget.id))
                    .then((updatedWidget) => {
                        assert.equal(updatedWidget.title, widgetTitle);
                        done();
                    })
                    .catch((e) => done(e));
            })
            .catch((e) => done(e));
    });

    it('Should not be able to edit a widget if user is not workspace owner neither widget creator', function (done) {
        const widgetTitle = 'widget edited';
        const widgetManager = new WidgetService(ownerId);
        widgetManager.createWidget('first name', 'A description', {}, [], 1, moduleId)
            .then(widget => {
                const widgetManager2 = new WidgetService(newUser1);
                widgetManager2.updateWidget(widgetTitle, null, null, widget.id)
                    .then(() => {
                        assert.fail();
                        done();
                    })
                    .catch(() => done());
            })
            .catch((e) => done(e));
    });

    it('Should delete a widget if user is the owner of workspace', function (done) {
        const widgetManager = new WidgetService(newUser1);
        widgetManager.createWidget('first name', 'A description', {}, [], 1, moduleId, newUser1)
            .then(widget => {
                const widgetManager2 = new WidgetService(ownerId);
                widgetManager2.deleteWidget(widget.id)
                    .then(() => widgetManager2.getWidget(widget.id))
                    .then(() => {
                        assert.fail();
                        done();
                    })
                    .catch(() => done());
            })
            .catch((e) => done(e));
    });

    it('Should delete a widget if user is the creator of that module', function (done) {
        const widgetManager = new WidgetService(newUser1);
        widgetManager.createWidget('first name', 'A description', {}, [], 1, moduleId)
            .then(widget => {
                widgetManager.deleteWidget(widget.id)
                    .then(() => widgetManager.getWidget(widget.id))
                    .then(() => {
                        assert.fail();
                        done();
                    })
                    .catch(() => done());
            })
            .catch((e) => done(e));
    });

    it('Should delete a widget and this widget should not appear in the list', function (done) {
        const widgetManager = new WidgetService(ownerId);
        moduleManager.createModule('new module test', 'A description', workspaceId, ownerId)
            .then(newModule =>
                Promise.all([
                    widgetManager.createWidget('Test widget 1', 'desc', {}, [], 1, newModule.id),
                    widgetManager.createWidget('Test widget 2', 'desc', {}, [], 1, newModule.id),
                    widgetManager.createWidget('Test widget 3', 'desc', {}, [], 1, newModule.id),
                ])
            )
            .then((results) => widgetManager.listWidgetsByModuleInstance(results[0].moduleInstanceId))
            .then(widgets => {
                assert.lengthOf(widgets, 3);
                return widgetManager.deleteWidget(widgets[0].id)
                    .then(() => widgetManager.listWidgetsByModuleInstance(widgets[0].moduleInstanceId))
                    .then(widgets => {
                        assert.lengthOf(widgets, 2);
                        done();
                    });
            });
    });

    it('Should not be able to delete a widget with connections', function (done) {
        const widgetManager = new WidgetService(ownerId);
        moduleManager.createModule('new module test', 'A description', workspaceId, ownerId)
            .then(newModule =>
                Promise.all([
                    widgetManager.createWidget('Test widget 1', 'desc', {}, [], 1, newModule.id),
                    widgetManager.createWidget('Test widget 2', 'desc', {}, [], 1, newModule.id),
                    widgetManager.createWidget('Test widget 3', 'desc', {}, [], 1, newModule.id),
                ])
            )
            .then((results) => widgetManager.listWidgetsByModuleInstance(results[0].moduleInstanceId))
            .then(widgets => {
                return widgetManager.setInput(widgets[0].id, widgets[1].id)
                    .then(() => {
                        assert.lengthOf(widgets, 3);
                        return widgetManager.deleteWidget(widgets[0].id)
                            .then(() => {
                                assert.fail();
                                done();
                            })
                            .catch(error => {
                                assert.isTrue(error.message.includes('The Widget has connection'));
                                done();
                            });
                    });
            });
    });

    it('Should not be able to delete a widget if user is not workspace owner neither widget creator', function (done) {
        const widgetManager = new WidgetService(ownerId);
        widgetManager.createWidget('first name', 'A description', {}, [], 1, moduleId)
            .then(widget => {
                const widgetManager2 = new WidgetService(newUser1);
                widgetManager2.deleteWidget(widget.id)
                    .then(() => {
                        assert.fail();
                        done();
                    })
                    .catch(() => done());
            })
            .catch((e) => done(e));
    });

    it('Should edit a widget if user is just a member of the workspace and strictEditMode is false', function (done) {
        const widgetTitle = 'widget edited';
        const widgetManager = new WidgetService(ownerId);
        widgetManager.createWidget('first name', 'A description', {}, [], 1, moduleId)
            .then(widget => {
                // make it editable eby any member
                widgetManager.updateWidget(null, null, null, widget.id, false)
                    .then(() => {
                        const widgetManager2 = new WidgetService(newUser1);
                        widgetManager2.updateWidget(widgetTitle, null, null, widget.id)
                            .then(() => widgetManager.getWidget(widget.id))
                            .then((updatedWidget) => {
                                assert.equal(updatedWidget.title, widgetTitle);
                                done();
                            })
                            .catch((e) => done(e));
                    });
            })
            .catch((e) => done(e));
    });

    it('Should delete a widget if user is just a member of the workspace and strictEditMode is false', function (done) {
        const widgetManager = new WidgetService(newUser1);
        widgetManager.createWidget('first name', 'A description', {}, [], 1, moduleId)
            .then(widget => {
                // make it editable eby any member
                const widgetManager2 = new WidgetService(ownerId);
                widgetManager2.updateWidget(null, null, null, widget.id, false)
                    .then(() => {
                        widgetManager2.deleteWidget(widget.id)
                            .then(() => widgetManager2.getWidget(widget.id))
                            .then(() => {
                                assert.fail();
                                done();
                            })
                            .catch(() => done());
                    });
            })
            .catch((e) => done(e));
    });

    it('Should successfully create output', function (done) {
        const widgetService = new WidgetService(ownerId);
        const schema = [{ name: '_', type: 'integer' }, { name: 'col1', type: 'integer' }, { name: 'col2', type: 'string' }];
        const { Readable } = require('stream');

        const items = [{ _: 1, col1: 2, col2: 'a' }, { _: 2, col1: 3, col2: 'b' }];
        const stream = new Readable({
            objectMode: true,
            read() {
                const item = items.shift();
                if (!item) {
                    this.push(null);
                    return;
                }
                this.push(JSON.stringify(item));
            },
        });

        widgetService.createWidget('first name', 'A description', {}, [], 1, moduleId)
            .then(widget => widgetService.setOutputSchema(widget.id, schema))
            .then(widget => widgetService.saveOutput(widget.id, stream))
            .then(() => done())
            .catch(e => done(e));
    });

    it('Should udpate the input schema of a non FS widget', function (done) {
        const widgetManager = new WidgetService(ownerId);
        widgetManager.createWidget('Name', 'A description', {}, [], enums.PrimitiveWidgetClassType.JOIN.id, moduleId)
            .then(widget => {
                const newInputSchema = [{inheritSchema: true, columns: [] }, {columns: [{name: 'col1', type: 'string'}]}];
                widgetManager.updateInputSchema(widget.id, newInputSchema)
                    .then(() => {
                        widgetManager.getWidget(widget.id)
                        .then(_widget => {
                            assert.isTrue(isEqual(_widget.schema.inputSchema, newInputSchema));
                            assert.isTrue(isEqual(_widget.schema.outputSchema, []));
                            done();
                        })
                        .catch((e) => done(e));
                    })
                    .catch((e) => done(e));
            })
            .catch((e) => done(e));
    });

    it('Should udpate the input schema of a FS widget and also update the output schema', function (done) {
        const widgetManager = new WidgetService(ownerId);
        widgetManager.createWidget('Name', 'A description', {}, [], enums.PrimitiveWidgetClassType.FILE_SOURCE.id, moduleId)
            .then(widget => {
                const newInputSchema = [{columns: [{name: 'col1', type: 'integer'}, {name: 'col2', type: 'string'}]}];
                widgetManager.updateInputSchema(widget.id, newInputSchema)
                    .then(() => {
                        widgetManager.getWidget(widget.id)
                        .then(_widget => {
                            assert.isTrue(isEqual(_widget.schema.inputSchema, newInputSchema));
                            assert.isTrue(isEqual(_widget.schema.outputSchema, newInputSchema[0].columns));
                            assert.lengthOf(_widget.output.schema, newInputSchema[0].columns.length + 2); // _ && row_errors
                            done();
                        })
                        .catch((e) => done(e));
                    })
                    .catch((e) => done(e));
            })
            .catch((e) => done(e));
    });
});