const assert = require('chai').assert;
const { initDb } = require('../../../test/init');

const workspaceService = require('./workspaceService');
const workspaceManager = new workspaceService({mock: true});

const ModuleManagerService = require('./moduleService');
const moduleManager = new ModuleManagerService();

describe('WorkspaceManager', function () {

    const ownerId = 1;
    const notOwnerId = 2;
    const workspaceId = 1;

    before(function(done) {
        initDb().then(() => done());
    });

    it('Should list workspaces', function(done) {
        workspaceManager.listWorkspaces(ownerId)
            .then(workspaces => {
                assert.equal(workspaces.length, 1);
                done();
            });
    });

    it('Should return empty workspaces list because user is member of none', function(done) {
        workspaceManager.listWorkspaces(notOwnerId)
            .then(workspaces => {
                assert.equal(workspaces.length, 0);
                done();
            });
    });

    it('Should create workspace and module and then find 1 module', function(done) {
        workspaceManager.createWorkspace('test', '00000-00', ownerId, 'test workspace', 'STAGING')
            .then(workspace => {
                moduleManager.createModule('test', 'test module', workspace.id, ownerId)
                    .then(() => moduleManager.listModules(workspace.id, ownerId))
                    .then(modules => {
                        assert.equal(modules.length, 1);
                        done();
                    });
            })
            .catch(e => done(e));
    });

    it('Should create workspace and add the owner as a member of it', function(done) {
        workspaceManager.createWorkspace('test', '00000-00', ownerId, 'test workspace', 'STAGING')
            .then(workspace => {
                return workspaceManager.getWorkspace(workspace.id, ownerId);
            }).then(
                wkspWithRelations => {
                    assert.equal(wkspWithRelations.workspaceMembers[0].userId, ownerId);
                    done();
                }
            ).catch(e => done(e));
    });


    it('Should create workspace with one existing user and with one invitation for a non exiting user', function(done) {
       workspaceManager.createWorkspace('test', '00000-00', ownerId, 'test workspace', 'STAGING',
                ['jack.smith@test.com', 'nonregistereduser@email.com'])
            .then(workspace => workspaceManager.getWorkspace(workspace.id, ownerId))
            .then(wkspWithRelations => {
                    assert.lengthOf(wkspWithRelations.workspaceMembers, 2);
                    assert.lengthOf(wkspWithRelations.workspaceInvitations, 1);
                    done();
                })
           .catch(e => done(e));
    });

    it('Should add new members to workspace', function(done) {
        const newEmails = ['jack.smith@test.com', 'nonregistereduser@email.com'];
        workspaceManager.inviteMembers(workspaceId, newEmails, ownerId)
            .then(() => workspaceManager.getWorkspace(workspaceId, ownerId))
            .then(workspace => {
                assert.lengthOf(workspace.workspaceMembers, 2);
                assert.lengthOf(workspace.workspaceInvitations, 1);
                done();
            })
            .catch(e => done(e));
     });


    it('Should not be allowed to add new members to a workspace where this user is not a member', function(done) {
        const newEmails = ['jack.smith@test.com', 'nonregistereduser@email.com'];
        workspaceManager.inviteMembers(workspaceId, newEmails, notOwnerId)
        .then(() => {
            assert.fail();
            done();
        })
        .catch(() => done());
     });

     it('Should get workspace info for a member of it. It should not for a non member', function(done) {
        workspaceManager.getWorkspace(workspaceId, ownerId)
            .then(persistedWorkspace => {
                assert.isNotNull(persistedWorkspace);
                return workspaceManager.getWorkspace(workspaceId, notOwnerId);
            })
            .then(() => {
                assert.fail();
                done();
            }).catch(() => done());
    });


    it('Should update a workspace if the user is the owner', function(done) {
        workspaceManager.getWorkspace(workspaceId, ownerId)
            .then(persistedWorkspace => {
                persistedWorkspace.title = 'updated title';
                return workspaceManager.updateWorkspace(persistedWorkspace.id, persistedWorkspace.title,
                    persistedWorkspace.description, ownerId);
            })
            .then(() => workspaceManager.getWorkspace(workspaceId, ownerId))
            .then(updatedWorkspace => {
                assert.isNotNull(updatedWorkspace);
                assert.equal(updatedWorkspace.title, 'updated title');
                done();
            })
            .catch(error => done(error));
    });

    it('Should archive an opened workspace ', function(done) {
        workspaceManager.getWorkspace(workspaceId, ownerId)
            .then(persistedWorkspace => {
                return workspaceManager.updateStatus(persistedWorkspace.id, 'ARCHIVED', ownerId);
            })
            .then(() => workspaceManager.getWorkspace(workspaceId, ownerId))
            .then(updatedWorkspace => {
                assert.isNotNull(updatedWorkspace);
                assert.equal(updatedWorkspace.status, 'ARCHIVED');
                done();
            })
            .catch(error => done(error));
    });


    it('Should open an archived workspace ', function(done) {
        workspaceManager.getWorkspace(workspaceId, ownerId)
            .then(persistedWorkspace => {
                return workspaceManager.updateStatus(persistedWorkspace.id, 'OPEN', ownerId);
            })
            .then(() => workspaceManager.getWorkspace(workspaceId, ownerId))
            .then(updatedWorkspace => {
                assert.isNotNull(updatedWorkspace);
                assert.equal(updatedWorkspace.status, 'OPEN');
                done();
            })
            .catch(error => done(error));
    });

    it('Should not be allowed to update a workspace if the user is NOT the owner.', function(done) {
        workspaceManager.getWorkspace(workspaceId, ownerId)
            .then(persistedWorkspace => {
                persistedWorkspace.title = 'should not update this workspace';
                return workspaceManager.updateWorkspace(persistedWorkspace.id, persistedWorkspace.title,
                    persistedWorkspace.description, notOwnerId);
            })
            .then(() => {
                assert.fail();
                done();
            })
            .catch(() => done());
    });

    it('Should soft delete a workspace if the user is the owner.', function(done) {
        workspaceManager.createWorkspace('to de deleted', '00000-00', ownerId, 'test workspace', 'STAGING')
            .then(persistedWorkspace => {
                workspaceManager.deleteWorkspace(persistedWorkspace.id, ownerId)
                    .then(() => {
                        workspaceManager.getWorkspace(persistedWorkspace.id, ownerId)
                            .then(() => {
                                // we should not get a deleted workspace
                                assert.fail();
                                done();
                            })
                            .catch(() => done());
                    })
                    .catch(error => done(error));
            })
            .catch(error => done(error));
    });

    it('Should not be allowed to delete a workspace if the user is NOT the owner.', function(done) {
        workspaceManager.createWorkspace('to de deleted', '00000-00', ownerId, 'test workspace', 'STAGING')
            .then(persistedWorkspace => {
                workspaceManager.deleteWorkspace(persistedWorkspace.id, notOwnerId)
                    .then(() => {
                        assert.fail();
                        done();
                    })
                    .catch(() => done());
            })
            .catch(error => done(error));
    });

    it('Should update a workspace if the user is not the owner but he is member of this workspace' +
        ' and the strictEditMode is false', function(done) {
        workspaceManager.getWorkspace(workspaceId, ownerId)
            .then(persistedWorkspace => {
                // lets first update it to disable strict edition mode
                return workspaceManager.updateWorkspace(persistedWorkspace.id, null, null, ownerId, false);
            })
            .then(() => workspaceManager.getWorkspace(workspaceId, ownerId))
            .then(persistedWorkspace => {
                return workspaceManager.updateWorkspace(persistedWorkspace.id, 'new title', null, notOwnerId);
            })
            .then(() => workspaceManager.getWorkspace(workspaceId, ownerId))
            .then(updatedWorkspace => {
                assert.isNotNull(updatedWorkspace);
                assert.equal(updatedWorkspace.title, 'new title');
                done();
            })
            .catch(error => done(error));
    });

    it('Should not be able to delete a workspace if workspace has modules', function(done) {
        workspaceManager.createWorkspace('a workspace 99', '00000-00', ownerId, 'test workspace', 'STAGING')
            .then(workspace => {
                moduleManager.createModule('test', 'test module', workspace.id, ownerId)
                    .then(() => {
                        workspaceManager.deleteWorkspace(workspace.id, ownerId)
                            .then(() => {
                                assert.fail();
                                done();
                            })
                            .catch(error => {
                                assert.isTrue(error.message.includes('The Workspace has Modules'));
                                done();
                            });
                    });
            })
            .catch((e) => done(e));
    });

    it('Should soft delete a workspace if the user is just a member and the the strictEditMode is false',
    function(done) {
        workspaceManager.createWorkspace('to de deleted', '00000-00', ownerId, 'test workspace', 'STAGING')
            .then(persistedWorkspace => workspaceManager.updateWorkspace(persistedWorkspace.id, null, null,
                ownerId, false))
            .then((persistedWorkspace) => {

                workspaceManager.deleteWorkspace(persistedWorkspace.id, notOwnerId)
                    .then(() => {
                        workspaceManager.getWorkspace(persistedWorkspace.id, ownerId)
                            .then(() => {
                                // we should not get a deleted workspace
                                assert.fail();
                                done();
                            })
                            .catch(() => done());
                    })
                    .catch(error => done(error));
            })
            .catch(error => done(error));
    });

    it('Should not be able to GET a deleted workspace', function(done) {
        workspaceManager.createWorkspace('to de deleted and not retrieved', '00000-00', ownerId, 'test workspace',
            'STAGING')
            .then(persistedWorkspace => {
                workspaceManager.deleteWorkspace(persistedWorkspace.id, ownerId)
                    .then(() => {
                        workspaceManager.getWorkspace(persistedWorkspace.id, ownerId)
                            .then(() => {
                                // we should not get a deleted workspace
                                assert.fail();
                                done();
                            })
                            .catch(() => done());
                    })
                    .catch(e => done(e));
            })
            .catch(error => done(error));
    });

    it('Should list recent workspaces activities for a user', function(done) {
        const creates = [workspaceManager.createWorkspace('wk1', '00001-00', ownerId, 'test workspace',
            'STAGING'),
            workspaceManager.createWorkspace('wk2', '00002-00', ownerId, 'test workspace',
            'STAGING'),
            workspaceManager.createWorkspace('wk3 - another owner', '00003-00', notOwnerId, 'test workspace',
            'STAGING'),
            workspaceManager.createWorkspace('wk4', '00004-00', ownerId, 'test workspace',
            'STAGING')];
        Promise.all(creates)
        .then(wksps => Promise.all([wksps,
            workspaceManager.updateWorkspace(wksps[0].id, 'wk1 - updated', wksps[0].description, ownerId)]))
        .then(([wksps]) => Promise.all([wksps,
            workspaceManager.updateWorkspace(wksps[1].id, 'wk2 - updated', wksps[1].description, ownerId)]))
        .then(([wksps]) => Promise.all([wksps,
            workspaceManager.updateWorkspace(wksps[2].id, 'wk3 - updated', wksps[2].description, notOwnerId)]))
        .then(([wksps]) => Promise.all([wksps,
            workspaceManager.updateWorkspace(wksps[3].id, 'wk4 - updated', wksps[3].description, ownerId)]))
        .then(([wksps]) => Promise.all([wksps,
            workspaceManager.getRecentWorkspacesActivity(3, ownerId)]))
        .then(([wksps, activites]) => {
            // lets check that wksp 3 is not here, they come grouped by workpsace and the order is the correct one
            assert.lengthOf(activites, 3);
            assert.equal(activites[0].workspaceId, wksps[3].id);
            assert.equal(activites[1].workspaceId, wksps[1].id);
            assert.equal(activites[2].workspaceId, wksps[0].id);
            return Promise.all([wksps,
                workspaceManager.updateWorkspace(wksps[1].id, 'wk2 - updated again', wksps[1].description, ownerId)]);
        })
        .then(([wksps]) => Promise.all([wksps, workspaceManager.getRecentWorkspacesActivity(3, ownerId)]))
        .then(([wksps, activites]) => {
            // lets check now that the order changed
            assert.lengthOf(activites, 3);
            assert.equal(activites[0].workspaceId, wksps[1].id);
            assert.equal(activites[1].workspaceId, wksps[3].id);
            assert.equal(activites[2].workspaceId, wksps[0].id);
            done();
        })
        .catch(e => done(e));
    });

});