const { ModuleInstance, Activity, Workspace, ModuleInstanceSetup, ModuleInstanceRun } = require('../../model');
const { moduleWidgetsInclude } = require('../util/includes');
const { forbidden } = require('../../util/errors');

const workspaceService = require('./workspaceService');
const workspaceManager = new workspaceService();

const activityBus = require('../../events/activityEventBus');
const { ActivityEventType, ActivityType } = require('../../util/enums');

const ActivityService = require('../activity/activityService');
const activityService = new ActivityService();

const DiscussionService = require('../discussion/discussionService');
const discussionService = new DiscussionService();

class ModuleService {
    listModules(workspaceId, userId) {
        return workspaceManager.getWorkspace(workspaceId, userId)
            .then(() => ModuleInstance.findAll({
                where: { workspaceId, deletedAt: null },
                include: [
                    moduleWidgetsInclude,
                    {
                        model: ModuleInstanceSetup,
                        attributes: ["progress", "tabs", "isCompleted"]
                    },
                    {
                        model: ModuleInstanceRun,
                        attributes: ["progress", "tabs"]
                    }
                ]
            }));
    }

    getModule(moduleId, userId) {
        return ModuleInstance.findOne({
            where: { id: moduleId, deletedAt: null },
            include: [
                moduleWidgetsInclude,
                {
                    model: ModuleInstanceSetup,
                    attributes: ["progress", "tabs"]
                },
                {
                    model: ModuleInstanceRun,
                    attributes: ["progress", "tabs"]
                }
            ]
        })
            .then(aModule => {
                if (aModule) {
                    return workspaceManager.getWorkspace(aModule.workspaceId, userId)
                        .then(() => aModule);
                }
                throw forbidden('The module was not found.');
            });
    }

    createModule(name, description, workspaceId, userId) {
        return workspaceManager.getWorkspace(workspaceId, userId)
            .then(() => ModuleInstance.create({ name, description, workspaceId, ownerId: userId }))
            .then(amodule => {
                activityBus.emit(ActivityEventType.MODULE_DATA, userId, ActivityType.MODULE_CREATED, {},
                    amodule.id);
                return amodule;
            });
    }

    updateModule(name = null, description = null, moduleInstanceId, userId, strictEditMode = null) {
        return this.getModule(moduleInstanceId, userId).then(async aModule => {
            if (aModule) {
                let canEdit = !aModule.strictEditMode ||
                    await Workspace.count({ where: { id: aModule.workspaceId, ownerId: userId, deletedAt: null } }) === 1 ||
                    await ModuleInstance.count({ where: { id: aModule.id, ownerId: userId } });

                // if any member can edit or this user is the worksapce owner or this user is the module creator
                if (canEdit) {
                    const data = {};

                    if (name !== null) {
                        data.name = name;
                    }
                    if (description !== null) {
                        data.description = description;
                    }
                    if (strictEditMode !== null) {
                        data.strictEditMode = strictEditMode;
                    }

                    const result = await ModuleInstance.update(data, { where: { id: moduleInstanceId } });

                    activityBus.emit(ActivityEventType.MODULE_DATA, userId, ActivityType.MODULE_UPDATED,
                        { name, description }, moduleInstanceId);

                    return result;
                }
                throw forbidden('You do not have enough permissions to edit this module.');
            }
            throw forbidden('The module to be updated was not found.');
        });
    }

    deleteModule(moduleInstanceId, userId) {
        return this.getModule(moduleInstanceId, userId).then(async aModule => {
            if (aModule) {
                // check if this module has no widgets
                if (aModule.widgetInstances.length === 0) {
                    let canDelete = !aModule.strictEditMode ||
                        await Workspace.count({ where: { id: aModule.workspaceId, ownerId: userId, deletedAt: null } }) === 1 ||
                        await ModuleInstance.count({ where: { id: aModule.id, ownerId: userId } });

                    // if any member can edit or this user is the worksapce owner or this user is the module creator
                    if (canDelete) {
                        const data = {};
                        data.deletedAt = new Date();
                        const result = await ModuleInstance.update(data, { where: { id: moduleInstanceId } });

                        activityBus.send(ActivityEventType.MODULE_DATA, userId, ActivityType.MODULE_DELETED, {},
                            moduleInstanceId);

                        return result;
                    }
                    throw forbidden('You do not have enough permissions to delete this module.');
                }
                throw new Error('The Module has Widgets. Please delete them first.');
            }
            throw forbidden('The module to be deleted was not found.');
        });

    }

    getActivities(moduleId, deepMode, userId) {
        // this first call is just to know if the user is allowed to see this workspace info
        return this.getModule(moduleId, userId)
            .then(async () => {
                const activities = await activityService.listActivitiesByModule(moduleId, deepMode);
                const updateAll = [];
                activities.forEach(activity => updateAll.push(activityService.populateActivity(activity)));

                await Promise.all(updateAll);

                return activities;
            });
    }

    addComment(userId, text, moduleInstanceId) {
        // checks if user is allowed to add a comment to this module
        return this.getModule(moduleInstanceId, userId)
            .then(moduleInstance => {
                return discussionService.addComment(userId, text, moduleInstance.workspaceId, moduleInstanceId, null)
                    .then(comment => {
                        activityBus.emit(ActivityEventType.MODULE_DATA, userId, ActivityType.COMMENTED_ON_MODULE,
                            { commentId: comment.id }, moduleInstanceId);
                    }
                    );
            });
    }

    getComments(moduleInstanceId, deepMode, limit, userId) {
        // this first call is just to know if the user is allowed to see this workspace info
        return this.getModule(moduleInstanceId, userId)
            .then(() => {
                return discussionService.listCommentsByModule(moduleInstanceId, deepMode, limit)
                    .then(comments => {
                        const updateAll = [];
                        comments.forEach(comment => updateAll.push(discussionService.populateComment(comment)));
                        return Promise.all(updateAll);
                    });
            });
    }

}

module.exports = ModuleService;