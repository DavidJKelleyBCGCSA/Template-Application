const assert = require('chai').assert;
const { initDb } = require('../../../test/init');

const workspaceService = require('../workspace/workspaceService');
const workspaceManager = new workspaceService({mock: true});

const IdentityService = require('./identityService');
const identityManager = new IdentityService();

const InvitationService = require('./invitationService');
const invitationManager = new InvitationService();

const UserService = require('./userService');
const userManager = new UserService();

describe('InvitationManager', function () {

    before(function(done) {
        initDb().then(() => done());
    });


    it('Should add a new user as a member of a workspace where  this new user`s email belongs to the pending ' +
        'invitations list of this workspace', function(done) {
        const email = 'nonregistereduser@email.com';
        let workspaceId = 0;
        let ownerId = 1;
        workspaceManager.createWorkspace('test', '00000-00', ownerId, 'test workspace', 'STAGING', [email])
            .then(workspace => {
                workspaceId = workspace.id;
                ownerId = workspace.ownerId;
                return workspaceManager.getWorkspace(workspaceId, ownerId);
            })
            .then(wkspWithRelations => {
                    assert.lengthOf(wkspWithRelations.workspaceMembers, 1);
                    assert.lengthOf(wkspWithRelations.workspaceInvitations, 1);

                   return identityManager.register(email, 'anypassword', 'John', 'Doe',
                       'ACME');
               })
            .then(() => invitationManager.addInvitedMemberRelations(email))
            .then(() => workspaceManager.getWorkspace(workspaceId, ownerId))
            .then(freshWkspWithRelations => {
                    assert.lengthOf(freshWkspWithRelations.workspaceMembers, 2);
                    assert.lengthOf(freshWkspWithRelations.workspaceInvitations, 0);

                    const userId = freshWkspWithRelations.workspaceMembers[1].userId;
                    userManager.getUserByEmail(email).then(
                        user => {
                            assert.equal(userId, user.id);
                            done();
                        }
                    );
                }
            ).catch(e => done(e));
    });
});