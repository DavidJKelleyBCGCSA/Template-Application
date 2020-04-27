const {Sequelize} = require('sequelize');
const {Activity, WidgetInstance, ModuleInstance } = require('../../model');
const {ActivityType} = require('../../util/enums');
const {userLight, widgetLight, moduleLight, workspaceLight} = require('../util/includes');

class ActivityService {

    addActivity(userId, activityType, data, widgetInstanceId, moduleInstanceId, workspaceId) {
        return Activity.create({
                userId,
                data,
                type: activityType,
                widgetInstanceId,
                moduleInstanceId,
                workspaceId
        });
    }

    addWidgetActivity(userId, activityType, data, widgetInstanceId) {
        return WidgetInstance.findOne({
            where: {id: widgetInstanceId},
            include: [ModuleInstance]
        }).then(widget => {
            this.addActivity(userId, activityType, data, widgetInstanceId, widget.moduleInstanceId,
                widget.moduleInstance.workspaceId);
        });
    }

    addModuleActivity(userId, activityType, data, moduleInstanceId) {
        return ModuleInstance.findOne({where: {id: moduleInstanceId}})
        .then(aModule => {
            this.addActivity(userId, activityType, data, null, moduleInstanceId,
                aModule.workspaceId);
        });
    }

    addWorkspaceActivity(userId, activityType, data, workspaceId) {
        return this.addActivity(userId, activityType, data, null, null, workspaceId);
    }

    listActivitiesByWidget(widgetInstanceId) {
        return Activity.findAll({
            where: {widgetInstanceId},
            include: [userLight, widgetLight],
            order: [['createdAt', 'DESC']],
        });
    }

    listActivitiesByModule(moduleInstanceId, deepMode = true) {
        return Activity.findAll({
            where: deepMode ? {moduleInstanceId} : {moduleInstanceId, widgetInstanceId: null},
            include: [userLight, widgetLight, moduleLight],
            order: [['createdAt', 'DESC']],
        });
    }

    listActivitiesByWorkspace(workspaceId, deepMode = true, limit) {
        const conditionalData = limit ? {limit} : {};
        return Activity.findAll({
            where: deepMode ? {workspaceId} : {workspaceId, moduleInstanceId: null, widgetInstanceId: null},
            include: [userLight, widgetLight, moduleLight, workspaceLight],
            order: [['createdAt', 'DESC']],
            ...conditionalData
        });
    }

    listActivitiesByWorkspaces(workspaceIds, deepMode = true, limit = 10) {
        const conditionalData = {};
        if (limit) conditionalData.limit = limit > 10 ? 10 : limit;

        return Activity.findAll({
            where: deepMode ? {workspaceId: workspaceIds} : {workspaceId: workspaceIds,
                moduleInstanceId: null, widgetInstanceId: null},
            include: [userLight, widgetLight, moduleLight, workspaceLight],
            order: [['createdAt', 'DESC']],
            ...conditionalData
        });
    }

    // list recent workspace activity (grouped by workspace so no workspace repeats).

    listEachLastWorkspaceActivity(workspaceIds, limit = 10) {
        return Activity.findAll({
            attributes: ['workspaceId', 'workspace.id',
                [Sequelize.fn('MAX', Sequelize.col('activity.created_at')), 'lastUpdate']],
            where: {workspaceId: workspaceIds},
            include: [workspaceLight],
            order: [[Sequelize.fn('MAX', Sequelize.col('activity.created_at')), 'DESC']],
            limit: limit > 10 ? 10 : limit,
            group: ['workspaceId', 'workspace.id'],
        });
    }

    async populateActivity(activity) {
        const activityType = activity.type;
        const data = activity.data;
        switch (activityType) {
            case ActivityType.CONNECTED_INPUT_WIDGET:
            case ActivityType.DISCONNECTED_INPUT_WIDGET:
                data.widget = await WidgetInstance.findOne({attributes: ['id', 'title'], where: {id: data.input}});
                break;
            case ActivityType.CONNECTED_OUTPUT_WIDGET:
            case ActivityType.DISCONNECTED_OUTPUT_WIDGET:
                data.widget = await WidgetInstance.findOne({attributes: ['id', 'title'], where: {id: data.output}});
                break;
            default:
                break;
        }

        return Promise.resolve();
    }
}

module.exports = ActivityService;