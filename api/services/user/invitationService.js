const UserService = require('./userService');
const {Invitation, WorkspaceInvitation, WorkspaceMember} = require('../../model');
const userService = new UserService();

class InvitationService {

    addInvitation(email) {
        return Invitation.findOrCreate({
            where: {
                email
            }
        });
    }

    findActiveByEmail(email) {
        return Invitation.findOne({
            where: {
                email,
                active: true
            }
        });
    }

    addWorkspaceInvitation(email, workspaceId) {
        return this.addInvitation(email).then(
            ([invitation]) => {
               return WorkspaceInvitation.findOrCreate({
                    where: {
                        invitationId: invitation.id,
                        workspaceId
                    }
                });
            }
        );
    }

     /**
      * update workspaces/module/widget members from workspace/module/widgets invitations
      */
     async addInvitedMemberRelations(email) {

        const invitation = await this.findActiveByEmail(email);
        // if there is an active invitation for this user
        if (invitation) {
            // get user by email
            const user = await userService.getUserByEmail(email);
            if (user) {

                // search for woekspaces with this invitated user
                const invitations = await WorkspaceInvitation.findAll({
                    where: {
                        invitationId: invitation.id
                    }
                });

                const addMembers = [];
                const removeInvitations = [];

                invitations.forEach(workspaceInvitation => {
                    addMembers.push(WorkspaceMember.findOrCreate({
                        where: {
                            userId: user.id,
                            workspaceId: workspaceInvitation.workspaceId
                        }
                    }));
                    removeInvitations.push(workspaceInvitation.destroy());
                });

                await Promise.all(addMembers);
                await Promise.all(removeInvitations);

                // deactivate the invitation
               return invitation.update({activated: false});
            }
        }

    }

}

module.exports = InvitationService;