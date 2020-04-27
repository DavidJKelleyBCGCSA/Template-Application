const {ActivityEmitter} = require('./eventEmitters');
const {ActivityEventType, isPipelineEvent, ActivityType} = require('../util/enums');
const ActivityService = require('../services/activity/activityService');
const pipelineService = require('../services/pipeline/pipelineService');
const log = require('../util/log');

const activityEventBus = new ActivityEmitter();
const activityService = new ActivityService();

activityEventBus.on('uncaughtException', function (err) {
    log.error(err);
});

activityEventBus.on(ActivityEventType.WIDGET_DATA, (userId, activityType, additionalData, widgetInstanceId) => {
    log.info('Widget Activity logged -> ', {userId, activityType, additionalData, widgetInstanceId});

    // For now only Widget_Data eventTypes are pushing events onto platform pipelineEventBus
    return new Promise((resolve, reject) => {
        if (isPipelineEvent(activityType)) {
            pipelineService.publishPipelineWidgetEvent(userId, activityType, widgetInstanceId)
                .catch(e => {
                    activityService.addWidgetActivity(userId, ActivityType.ERROR_PUBLISHING_TO_PIPELINE, {},
                        widgetInstanceId);
                });
        }
        return resolve();
    })
        .then(() => {
            return activityService.addWidgetActivity(userId, activityType, additionalData, widgetInstanceId);
        })

        .catch(error => log.error(error));
});

activityEventBus.on(ActivityEventType.MODULE_DATA, function (userId, activityType, additionalData, moduleInstanceId) {
    log.info('Module Activity logged -> ', {userId, activityType, additionalData, moduleInstanceId});

    return activityService.addModuleActivity(userId, activityType, additionalData, moduleInstanceId)
        .catch(error => log.error(error));
});

activityEventBus.on(ActivityEventType.WORKSPACE_DATA, function (userId, activityType, additionalData, workspaceId) {
    log.info('Workspace Activity logged -> ', {userId, activityType, additionalData, workspaceId});

    return activityService.addWorkspaceActivity(userId, activityType, additionalData, workspaceId)
        .catch(error => log.error(error));
});

module.exports = activityEventBus;