const { WidgetComputeComponent } = require('consultant-ux-client');
const DataJoinService = require('../../services/widget/dataJoinService');
const WidgetService = require('../../services/widget/widgetService');
const IdentityService = require('../../services/user/identityService');
const log = require('../../util/log');
const identityService = new IdentityService();
class JoinCompute extends WidgetComputeComponent {

    onExecuteEvent() {
        console.log('==============================================================');
        console.log("Primite Compute called ==> Join - w="+this.widgetInstanceId);
        console.log('==============================================================');
        identityService.identify(this.token)
            .then(user => {
                const widgetService = new WidgetService(user.id);
                return Promise.all([user, widgetService.getWidget(this.widgetInstanceId)]);
            })
            .then(([user, widget]) => {
                const joinService = new DataJoinService(widget.moduleInstance.workspaceId,
                    this.widgetInstanceId, user.id);
                    return joinService.joinWidgets();
            })
            .then(() => Promise.resolve())
            .catch(e => {
                log.error('Error on Join Compute: ', {widgetInstanceId: this.widgetInstanceId, error: e});
                return Promise.reject(e);
            });

    }
}

module.exports = JoinCompute;