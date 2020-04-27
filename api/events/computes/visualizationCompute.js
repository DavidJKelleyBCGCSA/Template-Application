const { WidgetComputeComponent } = require('consultant-ux-client');
const VizService = require('../../services/widget/visualizationService');
const IdentityService = require('../../services/user/identityService');
const log = require('../../util/log');
const identityService = new IdentityService();
class DataPrepCompute extends WidgetComputeComponent {

    onExecuteEvent() {
        console.log('==============================================================');
        console.log("Primitive Compute called ==> Visualization - w="+this.widgetInstanceId);
        console.log('==============================================================');
        identityService.identify(this.token)
            .then(user => {
                const vizService = new VizService(user.id);
                return vizService.updateDataSourcesToLastVersion(this.widgetInstanceId);
            })
            .then(() => Promise.resolve())
            .catch(e => {
                log.error('Error on Visualize Compute: ', {widgetInstanceId: this.widgetInstanceId, error: e});
                return Promise.reject(e);
            });
    }
}

module.exports = DataPrepCompute;