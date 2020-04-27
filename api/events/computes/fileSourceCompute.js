const { WidgetComputeComponent } = require('consultant-ux-client');
class FileSourceCompute extends WidgetComputeComponent {

    onExecuteEvent() {
        // nothing to do here.
        // output_changed event is being executed by the file upload itself.
        return Promise.resolve();
    }
}

module.exports = FileSourceCompute;