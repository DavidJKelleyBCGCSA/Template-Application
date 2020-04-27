const { WidgetComputeComponent } = require('consultant-ux-client');
const DataPrepRecipeService = require('../../services/widget/dataPrepRecipeService');
const WidgetService = require('../../services/widget/widgetService');
const IdentityService = require('../../services/user/identityService');
const log = require('../../util/log');
const identityService = new IdentityService();
class DataPrepCompute extends WidgetComputeComponent {

    onExecuteEvent() {
        console.log('==============================================================');
        console.log("Primite Compute called ==> DataPrep - w="+this.widgetInstanceId);
        console.log('==============================================================');
        identityService.identify(this.token)
            .then(user => {
                const widgetService = new WidgetService(user.id);
                return Promise.all([user, widgetService.getWidget(this.widgetInstanceId)]);
            })
            .then(([user, widget]) => {
                const dataPrepRecipeService = new DataPrepRecipeService(widget.moduleInstance.workspaceId,
                    this.widgetInstanceId, user.id);
                    return dataPrepRecipeService.runRecipe();
            })
            .then(() => Promise.resolve())
            .catch(e => {
                log.error('Error on DataPrep Compute: ', {widgetInstanceId: this.widgetInstanceId, error: e});
                return Promise.reject(e);
            });

    }
}

module.exports = DataPrepCompute;