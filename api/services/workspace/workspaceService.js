const UserService = require('../user/userService');
const InvitationService = require('../user/invitationService');
const { workspaceMemberInclude, workspaceInvitationInclude, workspaceOwnerInclude,
    workspaceModulesInclude } = require('../util/includes');
const SnowflakeService = require('../storage/snowflakeService');
const config = require('../../../config');
const DEFAULT_WAREHOUSE = config.DEFAULT_WAREHOUSE_ACCOUNT_ID;
const { Workspace, WorkspaceMember, Sequelize } = require('../../model');
const { forbidden, noData } = require('../../util/errors');
const Op = Sequelize.Op;
const DiscussionService = require('../discussion/discussionService');
const discussionService = new DiscussionService();
const userService = new UserService();
const invitationService = new InvitationService();

const activityBus = require('../../events/activityEventBus');
const { ActivityEventType, ActivityType, WorkspaceStatus } = require('../../util/enums');

const ActivityService = require('../activity/activityService');
const activityService = new ActivityService();

class WorkspaceService {
    /**
     * Call with param = {mock:true} to avoid round-trip to Snowflake datawarehouse - use for testing
     * @param mock
     */
    constructor(params) {
        this.mock = params && params.mock && params.mock === true;
    }

    async listWorkspaces(userId, addDeleted = false) {
        const workspacesRelations = await WorkspaceMember.findAll({
            attributes: ['workspaceId', 'userId'],
            where: { userId }
        });

        if (workspacesRelations && workspacesRelations.length > 0) {
            const workspacesIds = workspacesRelations.map(relation => relation.workspaceId);
            const additionalData = addDeleted ? {} : { deletedAt: null };
            return Workspace.findAll({
                where: { id: { [Op.in]: workspacesIds }, ...additionalData },
                include: [
                    workspaceMemberInclude,
                    workspaceInvitationInclude,
                    workspaceOwnerInclude],
            });
        }
        return [];
    }

    async getWorkspace(id, userId) {
        const workspace = await Workspace.findOne({
            where: { id, deletedAt: null },
            include: [
                workspaceMemberInclude,
                workspaceInvitationInclude,
                workspaceOwnerInclude,
            ]
        });
        if (workspace && workspace.workspaceMembers.findIndex(member => member.userId === userId) !== -1) {
            return workspace;
        }

        throw forbidden();
    }

    async createWorkspace(title, number, ownerId, description, environment, emails, warehouseAccountId) {
        const whid = warehouseAccountId ? warehouseAccountId : DEFAULT_WAREHOUSE;
        const newWorkspace = await Workspace.create({
            title, number, ownerId, description, environment,
            warehouseAccountId: whid
        });

        if (!this.mock) {
            // Create data warehouse and associated database
            const snowflakeService = new SnowflakeService(newWorkspace.id);
            await snowflakeService.connect();
            await snowflakeService.createWarehouseAndDatabase();
        }

        // add the owner as a member
        await WorkspaceMember.create({ workspaceId: newWorkspace.id, userId: ownerId });

        activityBus.send(ActivityEventType.WORKSPACE_DATA, ownerId, ActivityType.WORKSPACE_CREATED, {},
            newWorkspace.id);

        //add members and no members from emails
        await this.inviteMembers(newWorkspace.id, emails, ownerId);

        return newWorkspace;
    }

    async updateWorkspace(workspaceId, title = null, description = null, userId, strictEditMode = null) {
        const dbworkspace = await Workspace.findOne({ where: { id: workspaceId, deletedAt: null } });

        if (dbworkspace) {
            if (!dbworkspace.strictEditMode || dbworkspace.ownerId === userId) {

                // warehouses are created based on id and number,
                // so we should avoid allowing the user to change 'number' attribute for the moment.

                const data = { version: dbworkspace.version + 1 };

                if (title !== null) {
                    data.title = title;
                }

                if (description !== null) {
                    data.description = description;
                }

                if (strictEditMode !== null) {
                    data.strictEditMode = strictEditMode;
                }

                const result = await dbworkspace.update(data, { where: { id: workspaceId } });

                activityBus.send(ActivityEventType.WORKSPACE_DATA, userId, ActivityType.WORKSPACE_UPDATED,
                    { title, description },
                    workspaceId);

                return result;
            }
            throw forbidden();
        }
        throw noData();
    }

    async updateStatus(workspaceId, status, userId) {
        const dbworkspace = await Workspace.findOne({ where: { id: workspaceId, deletedAt: null } });

        if (dbworkspace) {
            if (!dbworkspace.strictEditMode || dbworkspace.ownerId === userId) {

                // warehouses are created based on id and number,
                // so we should avoid allowing the user to change 'number' attribute for the moment.


                // if the old status is the same as the new one, we do nothing
                if (dbworkspace.status === status) {
                    return Promise.resolve();
                }

                // workspace status workflow rules
                let canChange = false;
                switch (dbworkspace.status) {
                    case WorkspaceStatus.OPEN:
                        // if we want to let them open the case again
                        canChange = status === WorkspaceStatus.ARCHIVED;
                        break;
                    case WorkspaceStatus.ARCHIVED:
                        // if we want to let them archive an opened case
                        canChange = status === WorkspaceStatus.OPEN;
                        break;
                    default:
                        break;
                }

                if (canChange) {
                    dbworkspace.status = status;
                    const result = await dbworkspace.save();

                    activityBus.send(ActivityEventType.WORKSPACE_DATA, userId, ActivityType.WORKSPACE_STATUS_CHANGED,
                        { status },
                        workspaceId);

                    return result;
                }
                throw forbidden();
            }
            throw forbidden();
        }
        throw noData();
    }


    async deleteWorkspace(workspaceId, userId) {
        const dbworkspace = await Workspace.findOne({
            where: { id: workspaceId, deletedAt: null },
            include: [workspaceModulesInclude]
        });

        if (dbworkspace) {
            if (dbworkspace.moduleInstances.length === 0) {
                if (!dbworkspace.strictEditMode || dbworkspace.ownerId === userId) {
                    dbworkspace.deletedAt = new Date();
                    const result = await dbworkspace.save();

                    activityBus.send(ActivityEventType.WORKSPACE_DATA, userId, ActivityType.WORKSPACE_DELETED, {},
                        workspaceId);

                    return result;
                }
                throw forbidden();
            }

            throw new Error('The Workspace has Modules. Please delete them first.');
        }
        throw noData();
    }

    async inviteMembers(workspaceId, emails, currentUserId) {
        const bindUsers = [];
        const addInvitations = [];

        // lets check if the user from the request is a member og this workspace
        const user = await WorkspaceMember.findOne({ where: { workspaceId, userId: currentUserId } });
        if (user) {

            // bind the members
            if (emails) {
                const queries = [];

                for (let index = 0; index < emails.length; index += 1) {
                    const email = emails[index];
                    queries.push(userService.getUserByEmail(email));
                }

                const users = await Promise.all(queries);
                for (let index = 0; index < users.length; index += 1) {
                    const user = users[index];
                    if (user) {
                        bindUsers.push(WorkspaceMember.findOrCreate({
                            where: {
                                workspaceId: workspaceId,
                                userId: user.id
                            }
                        }));
                    }
                    else {
                        addInvitations.push(invitationService.addWorkspaceInvitation(emails[index], workspaceId));
                    }
                }
            }

            await Promise.all(addInvitations);
            await Promise.all(bindUsers);

            if (emails && emails.length > 0) {
                activityBus.send(ActivityEventType.WORKSPACE_DATA, currentUserId, ActivityType.WORKSPACE_USERS_INVITED,
                    { emails }, workspaceId);
            }

        }
        else {
            throw forbidden();
        }
    }

    getActivities(workspaceId, deepMode, limit, userId) {
        // this first call is just to know if the user is allowed to see this workspace info
        return this.getWorkspace(workspaceId, userId)
            .then(async () => {
                const activities = await activityService.listActivitiesByWorkspace(workspaceId, deepMode, limit);
                const updateAll = [];
                activities.forEach(activity => updateAll.push(activityService.populateActivity(activity)));

                await Promise.all(updateAll);

                return activities;
            });
    }

    // TODO: this method should also search for apps activitties.
    // we are including deleted workspaces (so user can see deletion activity).
    async getRecentActivities(limit = 10, userId) {

        // search for wksps
        // true flag to get deleted ones
        const wks = await this.listWorkspaces(userId, true);
        const wksIds = wks.map(wk => wk.id);
        const activities = await activityService.listActivitiesByWorkspaces(wksIds, true, limit);

        const updateAll = [];
        activities.forEach(activity => updateAll.push(activityService.populateActivity(activity)));

        await Promise.all(updateAll);

        return activities;

        // add activity of Apps later
    }

    // all user's workspace activity, grouped by workpsace
    getRecentWorkspacesActivity(limit = 10, userId) {
        // search for wksps
        return this.listWorkspaces(userId)
            .then(wks => {
                const wksIds = wks.map(wk => wk.id);
                return activityService.listEachLastWorkspaceActivity(wksIds, limit);
            }
            );
    }

    addComment(userId, text, workspaceId) {
        // checks if user is allowed to add a comment to this workspace
        return this.getWorkspace(workspaceId, userId)
            .then(() => {
                return discussionService.addComment(userId, text, workspaceId, null, null)
                    .then(comment => {
                        activityBus.emit(ActivityEventType.WORKSPACE_DATA, userId, ActivityType.COMMENTED_ON_WORKSPACE,
                            { commentId: comment.id }, workspaceId);
                    }
                    );
            });
    }

    getComments(workspaceId, deepMode, limit, userId) {
        // this first call is just to know if the user is allowed to see this workspace info
        return this.getWorkspace(workspaceId, userId)
            .then(() => {
                return discussionService.listCommentsByWorkspace(workspaceId, deepMode, limit)
                    .then(comments => {
                        const updateAll = [];
                        comments.forEach(comment => updateAll.push(discussionService.populateComment(comment)));
                        return Promise.all(updateAll);
                    });
            });
    }

    // TODO: this method should also search for apps comments.
    // we are including deleted workspaces (so user can see comments of deleted workspaces).
    getRecentCommentsByUser(limit = 10, userId) {
        // search for wksps
        // true flag to get deleted ones
        return this.listWorkspaces(userId, true)
            .then(wks => {
                const wksIds = wks.map(wk => wk.id);
                return discussionService.listCommentsByWorkspaces(wksIds, true, limit)
                    .then(comments => {
                        const updateAll = [];
                        comments.forEach(comment => updateAll.push(discussionService.populateComment(comment)));
                        return Promise.all(updateAll);
                    });
            });

        // add activity of Apps later
    }

}

module.exports = WorkspaceService;