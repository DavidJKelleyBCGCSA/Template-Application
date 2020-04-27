const assert = require('chai').assert;
const { initDb } = require('../../../test/init');

const ModuleManagerService = require('./moduleService');
const moduleManager = new ModuleManagerService();

const WidgetService = require('../widget/widgetService');

const workspaceService = require('./workspaceService');
const workspaceManager = new workspaceService({mock: true});

const IdentityService = require('../user/identityService');
const identityService = new IdentityService();

describe('ModuleManager', function () {

    const ownerId = 1;
    const notOwnerId = 2;
    const workspaceId = 1;
    const moduleId = 1;

    const newUser1 = 3;
    const newUser2 = 4;

    before(function(done) {
        initDb()
            .then(() =>
                 Promise.all([
                    identityService.register('john.doe.22@test.com', 'notsafeforpassword', 'John2', 'Doe2', 'BCG'),
                    identityService.register('john.doe.33@test.com', 'notsafeforpassword', 'John3', 'Doe3', 'BCG')
                ]))
                // add a couple of memebers to workspace...
            .then(() => {
                const newEmails = ['john.doe.22@test.com', 'john.doe.33@test.com'];
                return workspaceManager.inviteMembers(workspaceId, newEmails, ownerId);
            })
            .then(() => done());
    });

    it('Should create and list modules', function(done) {

        moduleManager.listModules(workspaceId, ownerId)
            .then(list => assert.lengthOf(list, 1))
            .then(() => moduleManager.createModule('New Module', 'A description', workspaceId, ownerId))
            .then(() => moduleManager.listModules(workspaceId, ownerId))
            .then(list => {
                assert.lengthOf(list, 2);
                done();
            });

    });

    it('Should create and get the created module', function(done) {
        const moduleName = 'New Module #333';
        moduleManager.createModule(moduleName, 'A description', workspaceId, ownerId)
            .then(newModule => {
                moduleManager.getModule(newModule.id, ownerId)
                    .then(persistedModule => {
                        assert.equal(persistedModule.name, moduleName);
                        done();
                    })
                    .catch((e) => done(e));
            })
            .catch((e) => done(e));
    });

    it('Should not be allowed to create a module from workspace where the user is not a member', function(done) {
    const moduleName = 'New Module #333';
        moduleManager.createModule(moduleName, 'A description', workspaceId, notOwnerId)
            .then(() => {
                assert.fail();
                done();
            })
            .catch(() => done());
    });


    it('Should not be allowed to get a module from workspace where the user is not a member', function(done) {
        moduleManager.getModule(moduleId, notOwnerId)
            .then(() => {
                assert.fail();
                done();
            })
            .catch(() => done());
    });

    it('Should edit a module if user is the owner of workspace', function(done) {
            const moduleName = 'module edited';
            moduleManager.createModule('first name', 'A description', workspaceId, newUser1)
                .then(newModule => {
                    moduleManager.updateModule(moduleName, null, newModule.id, ownerId)
                        .then(() => moduleManager.getModule(newModule.id, ownerId))
                        .then((updatedModule) => {
                            assert.equal(updatedModule.name, moduleName);
                            done();
                        })
                        .catch((e) => done(e));
                    })
                .catch((e) => done(e));
    });

    it('Should edit a module if user is the creator of that module', function(done) {
        const moduleName = 'module edited';
        moduleManager.createModule('first name', 'A description', workspaceId, newUser1)
            .then(newModule => {
                moduleManager.updateModule(moduleName, null, newModule.id, newUser1)
                    .then(() => moduleManager.getModule(newModule.id, newUser1))
                    .then((updatedModule) => {
                        assert.equal(updatedModule.name, moduleName);
                        done();
                    })
                    .catch((e) => done(e));
                })
            .catch((e) => done(e));
    });

    it('Should not be able to edit a module if user is not workspace owner neither module creator', function(done) {
        const moduleName = 'module edited';
        moduleManager.createModule('first name', 'A description', workspaceId, newUser1)
            .then(newModule => {
                moduleManager.updateModule(moduleName, null, newModule.id, newUser2)
                    .then(() => {
                        assert.fail();
                        done();
                    })
                    .catch(() => done());
            })
            .catch((e) => done(e));
    });

    it('Should delete a module if user is the owner of workspace', function(done) {
        moduleManager.createModule('first name', 'A description', workspaceId, newUser1)
        .then(newModule => {
            moduleManager.deleteModule(newModule.id, ownerId)
                .then(() => {
                    moduleManager.getModule(newModule.id, ownerId)
                        .then(() => {
                            assert.fail();
                            done();
                        })
                        .catch(() => done());
                })
                .catch((e) => done(e));
            })
        .catch((e) => done(e));
    });

    it('Should delete a module if user is the creator of that module', function(done) {
        moduleManager.createModule('first name', 'A description', workspaceId, newUser1)
            .then(newModule => {
                moduleManager.deleteModule(newModule.id, newUser1)
                    .then(() => {
                        moduleManager.getModule(newModule.id, newUser1)
                            .then(() => {
                                assert.fail();
                                done();
                            })
                            .catch(() => done());
                    })
                    .catch((e) => done(e));
            })
            .catch((e) => done(e));
    });

    it('Should not be able to delete a module if user is not workspace owner neither module creator', function(done) {
        moduleManager.createModule('first name', 'A description', workspaceId, newUser1)
            .then(newModule => {
                moduleManager.deleteModule(newModule.id, newUser2)
                    .then(() => {
                        assert.fail();
                        done();
                    })
                    .catch(() => done());
            })
            .catch((e) => done(e));
    });

    it('Should not be able to delete a module if module has widgets', function(done) {
        moduleManager.createModule('first name', 'A description', workspaceId, ownerId)
            .then(newModule => {
                const widgetService = new WidgetService(ownerId);
                widgetService.createWidget('Test widget 1', 'desc', {}, [], 1, newModule.id)
                    .then(() => {
                        moduleManager.deleteModule(newModule.id, ownerId)
                            .then(() => {
                                assert.fail();
                                done();
                            })
                            .catch(error => {
                                assert.isTrue(error.message.includes('The Module has Widgets'));
                                done();
                            });
                    });
            })
            .catch((e) => done(e));
    });

    it('Should edit a module if user is just a member of the workspace and strictEditMode is false', function(done) {
        const moduleName = 'module edited';
        moduleManager.createModule('first name', 'A description', workspaceId, ownerId)
            .then((newModule) => {
                // make it editable for any member
                moduleManager.updateModule(null, null, newModule.id, ownerId, false)
                    .then(() => {
                        moduleManager.updateModule(moduleName, null, newModule.id, newUser2)
                            .then(() => moduleManager.getModule(newModule.id, newUser2))
                            .then((updatedModule) => {
                                assert.equal(updatedModule.name, moduleName);
                                done();
                            })
                            .catch((e) => done(e));
                    });
            })
            .catch((e) => done(e));
    });

    it('Should delete a module if user is just a member of the workspace and strictEditMode is false', function(done) {
        moduleManager.createModule('first name', 'A description', workspaceId, ownerId)
            .then((newModule) => {
                // make it editable for any member
                moduleManager.updateModule(null, null, newModule.id, ownerId, false)
                    .then(() => {
                        moduleManager.deleteModule(newModule.id, newUser2)
                            .then(() => {
                                moduleManager.getModule(newModule.id, newUser2)
                                .then(() => {
                                    assert.fail();
                                    done();
                                })
                                .catch(() => done());
                            });
                    })
                    .catch((e) => done(e));
            })
            .catch((e) => done(e));
    });

});