const { WidgetComputeComponent } = require('consultant-ux-client');
const WidgetService = require('../../services/widget/widgetService');
const ModelService = require('../../services/widget/modelWidgetService');
const IdentityService = require('../../services/user/identityService');
const log = require('../../util/log');
const identityService = new IdentityService();
class DataPrepCompute extends WidgetComputeComponent {

    onExecuteEvent() {
        console.log('==============================================================');
        console.log("Primite Compute called ==> Model - w="+this.widgetInstanceId);
        console.log('==============================================================');
        identityService.identify(this.token)
            .then(user => {
                const widgetService = new WidgetService(user.id);
                return Promise.all([user, widgetService.getWidget(this.widgetInstanceId)]);
            })
            .then(([user, widget]) => {
                const modelService = new ModelService(this.widgetInstanceId, widget.moduleInstance.workspaceId,
                    user.id);
                return modelService.updateInputData()
                        .then(() => modelService.runNotebook())
                        .catch(e => Promise.reject(e));
            })
            .then(() => Promise.resolve())
            .catch(e => {
                log.error('Error on Model Compute: ', {widgetInstanceId: this.widgetInstanceId, error: e});
                return Promise.reject(e);
            });
    }
}

module.exports = DataPrepCompute;