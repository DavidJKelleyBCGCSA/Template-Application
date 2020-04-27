const Redis = require('ioredis');
const { WidgetRelation, WidgetInstance, WidgetClass, ModuleInstance, ModuleInstanceSetup} = require('../../model');
const IdentityService = require('../../services/user/identityService');
const { ActivityType, App } = require('../../util/enums');
const config = require('../../../config');

/**
 * Raises events on Redis Pub/Sub to job-manager-server to start pipeline processing jobs
 */
class PipelineService {
    constructor(connection) {
        this.redis = new Redis(connection);
        this.redisPub = new Redis(connection);
        this.identityService = new IdentityService();
    }

    publishPipelineWidgetEvent (userId, activityType, widgetInstanceId) {
        if (!widgetInstanceId) return Promise.reject(new Error('Event raised with no WidgetId'));

        let isDownstream = false;

        switch (activityType) {
            case ActivityType.INPUT_CHANGED:
            case ActivityType.PARAMETERS_CHANGED:
            case ActivityType.MANUAL_TRIGGER:
                isDownstream = false;
                break;
            case ActivityType.OUTPUT_CHANGED:
                isDownstream = true;
                break;
            case ActivityType.JOB_COMPLETE:
            case ActivityType.JOB_RUNNING:
            default:
                return Promise.resolve();
        }

        const getTargetWidgets = () => {
            if (!isDownstream) {
                return WidgetInstance.findOne({
                    where: {id: widgetInstanceId},
                    include: [{
                        model: WidgetClass
                    }],
                }).then(widget => {
                    if (widget) return Promise.resolve([{widgetInstanceId, appId: widget.widgetClass.appId,
                        widgetType: widget.widgetClass.type}]);

                    return Promise.resolve([]);
                });
            }

            return WidgetRelation.findAll({
                where: {fromWidgetInstanceId: widgetInstanceId},
                include: [{
                    model: WidgetInstance,
                    as: 'toInstance',
                    include: [{
                        model: WidgetClass
                    }]
                }]
            }).then(widgets => {
                const targets = [];
                widgets.map(widget => {
                    const widgetInstanceId = widget.toWidgetInstanceId;
                    const {
                        appId,
                        primitive,
                        type: widgetType,
                    } = widget.toInstance.widgetClass;

                    targets.push({widgetInstanceId, appId, widgetType, primitive});
                });
                return Promise.resolve(targets);
            });
        };

        return getTargetWidgets()
            .then((targets) => {
                const token = this.identityService.generateAPIKey(userId);
                const message = JSON.stringify({token, userId, event: activityType, targets});

                return this.redis.lpush('_mq:JOB_MANAGER', message)
                    .then(() => this.redisPub.publish('_e:JOB_MANAGER', 'PIPELINE_EVENT'));
            });
    }

    publishPipelineModuleEvent (userId, activityType, moduleInstanceId) {
        if (!moduleInstanceId) return Promise.reject(new Error('Event raised with no moduleInstanceId'));

        return ModuleInstance.findOne({
            where: {id: moduleInstanceId},
            include: [ModuleInstanceSetup]
        })
            .then(moduleInstance => {
                const appId = moduleInstance.moduleInstanceSetup.appId;
                const token = this.identityService.generateAPIKey(userId);
                const target = {moduleInstanceId, appId};
                const message = JSON.stringify({token, userId, event: activityType, target});

                return this.redis.lpush('_mq:JOB_MANAGER', message)
                    .then(() => this.redisPub.publish('_e:JOB_MANAGER', 'PIPELINE_EVENT'));
            });

    }
}

// Singleton pattern
const pipelineService = new PipelineService(config.REDIS_CONNECTION_URI);
module.exports = pipelineService;