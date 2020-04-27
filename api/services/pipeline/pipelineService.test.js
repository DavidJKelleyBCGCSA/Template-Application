const pipelineService = require('./pipelineService');
const { ActivityType } = require('../../util/enums');
const { initDb } = require('../../../test/init');

describe('PipelineService', function() {
    before(function(done) {
        initDb()
            .then(() => done())
            .catch(e => done(e));
    });

    it('should raise an event on pipeline eventBus for single widget', function(done) {
        const userId = 1;
        const activityType = ActivityType.INPUT_CHANGED;
        const widgetInstanceId = 1;

        pipelineService.publishPipelineWidgetEvent(userId, activityType, widgetInstanceId)
            .then(() => done())
            .catch(e => done(e));
    });

    it('should raise an event on pipeline eventBus for downstream widgets', function(done) {
        const userId = 1;
        const activityType = ActivityType.OUTPUT_CHANGED;
        const widgetInstanceId = 1;

        pipelineService.publishPipelineWidgetEvent(userId, activityType, widgetInstanceId)
            .then(() => done())
            .catch(e => done(e));
    });
});