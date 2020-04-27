const { pipeline } = require('stream');
const WidgetService = require('../services/widget/widgetService');
const pipelineService = require('../services/pipeline/pipelineService');
const { ActivityType } = require('../util/enums');
const NdJsonTransform = require('../util/ndJsonTransform');


function listWidgetsClasses(req, res) {
    const moduleInstanceId = req.query.moduleInstanceId
    if (!moduleInstanceId) {
        return res.status(500).send('Required moduleInstanceId not provided');
    }
    const widgetService = new WidgetService(req.user.id);
    widgetService.listWidgetAvailableByModuleInstance(moduleInstanceId)
        .then(widgets => res.status(200).json(widgets))
        .catch(error => res.status(error.status || 400).send(error.message));
}

function listWidgetsAvailableToConnect(req, res) {
    const { moduleInstanceId, widgetInstanceId } = req.query;
    console.log(req.body)

    if (!moduleInstanceId) {
        return res.status(500).send('Required moduleInstanceId not provided');
    }

    if (!widgetInstanceId) {
        return res.status(500).send('Required widgetInstanceId not provided');
    }

    const widgetService = new WidgetService(req.user.id);
    widgetService.listWidgetsAvailableToConnect(moduleInstanceId, widgetInstanceId)
        .then(widgets => res.status(200).json(widgets))
        .catch(error => res.status(error.status || 400).send(error.message));
}

function listWidgetsByModuleInstance(req, res) {
    const moduleInstanceId = req.query.moduleInstanceId;

    if (!moduleInstanceId) {
        res.status(500).send('Required moduleInstanceId not provided');
    }
    else {
        const widgetService = new WidgetService(req.user.id);
        widgetService.listWidgetsByModuleInstance(moduleInstanceId)
            .then(widgets => res.status(200).json(widgets))
            .catch(error => res.status(error.status || 400).send(error.message));
    }
}

function getWidget(req, res) {
    const widgetId = req.query.widgetId;

    if (!widgetId) {
        res.status(500).send('Required widgetId not provided');
    }
    else {
        const widgetService = new WidgetService(req.user.id);
        widgetService.getWidget(widgetId)
            .then(widgets => res.status(200).json(widgets))
            .catch(error => res.status(error.status || 400).send(error.message));
    }
}

function getWidgetInputData(req, res) {
    const widgetId = req.query.widgetId;

    if (!widgetId) {
        res.status(500).send('Required widgetId not provided');
    }
    else {
        const widgetService = new WidgetService(req.user.id);
        widgetService.getWidgetInputData(widgetId, req.user.id)
            .then(widgets => res.status(200).json(widgets))
            .catch(error => res.status(error.status || 400).send(error.message));
    }
}


function listOutputs(req, res) {
    const workspaceId = req.query.workspaceId;

    if (!workspaceId) {
        res.status(500).send('Required workspaceId not provided');
    }
    else {
        const widgetService = new WidgetService(req.user.id);
        widgetService.listOutputs(workspaceId).then(outputs => res.status(200).json(outputs));
    }

}

function listOutputsByWidgetInstance(req, res) {
    const widgetInstanceId = req.query.widgetInstanceId;

    if (!widgetInstanceId) {
        res.status(500).send('Required widgetInstanceId not provided');
    }
    else {
        const widgetService = new WidgetService(req.user.id);
        widgetService.listOutputsByWidgetInstance(widgetInstanceId).then(outputs => res.status(200).json(outputs));
    }

}

function listInputsByWidgetInstance(req, res) {
    const widgetInstanceId = req.query.widgetInstanceId;

    if (!widgetInstanceId) {
        res.status(500).send('Required widgetInstanceId not provided');
    }
    else {
        const widgetService = new WidgetService(req.user.id);
        widgetService.listInputsByWidgetInstance(widgetInstanceId).then(inputs => res.status(200).json(inputs));
    }

}

function createWidget(req, res) {
    const { title, description, parameters, inputs, widgetClassId, moduleInstanceId } = req.body;

    const widgetService = new WidgetService(req.user.id);

    widgetService.createWidget(title, description, parameters, inputs, widgetClassId, moduleInstanceId, req.user.id)
        .then(result => res.status(result.status || 200).json({ id: result.id, warning: result.warning || false }))
        .catch(error => res.status(error.status || 400).send(error.message));
}

function widgetFlow(req, res) {
    const widgetInstanceId = parseInt(req.query.widgetInstanceId, 10);

    if (!widgetInstanceId) {
        res.status(404).send('Required fields not supplied');
    }
    else {
        const widgetService = new WidgetService(req.user.id);
        widgetService.widgetFlow(widgetInstanceId).then((data) => res.status(200).send(data));
    }
}

function setInput(req, res) {
    const replace = req.body.replace || false;
    const widgetInstanceId = parseInt(req.body.widgetInstanceId, 10);
    const inputWidgetInstanceId = parseInt(req.body.inputWidgetInstanceId, 10);

    if (!widgetInstanceId || !inputWidgetInstanceId) {
        res.status(404).send('WidgetInstanceId or inputWidgetInstanceId not supplied');
    }
    else {
        const widgetService = new WidgetService(req.user.id);
        widgetService.setInput(widgetInstanceId, inputWidgetInstanceId, replace)
            .then(() => {
                res.status(200).send();
            }).catch(error => res.status(error.status || 400).send(error.message));
    }
}

function setOutput(req, res) {
    const replace = req.body.replace || false;
    const widgetInstanceId = parseInt(req.body.widgetInstanceId, 10);
    const outputWidgetInstanceId = parseInt(req.body.outputWidgetInstanceId, 10);

    if (!widgetInstanceId || !outputWidgetInstanceId) {
        res.status(404).send('widgetInstanceId or outputWidgetInstanceId not supplied');
    }
    else {
        const widgetService = new WidgetService(req.user.id);
        widgetService.setOutput(widgetInstanceId, outputWidgetInstanceId, req.user.id, replace)
            .then(() => {
                res.status(200).send();
            }).catch(error => res.status(error.status || 400).send(error.message));
    }
}

function removeInput(req, res) {
    const widgetInstanceId = parseInt(req.body.widgetInstanceId, 10);
    const inputWidgetInstanceId = parseInt(req.body.inputWidgetInstanceId, 10);

    if (!widgetInstanceId || !inputWidgetInstanceId) {
        res.status(404).send('widgetInstanceId or inputWidgetInstanceId not supplied');
    }
    else {
        const widgetService = new WidgetService(req.user.id);
        widgetService.removeInput(widgetInstanceId, inputWidgetInstanceId, req.user.id)
            .then(() => {
                res.status(200).send();
            }).catch(error => res.status(error.status || 400).send(error.message));
    }
}

function removeOutput(req, res) {
    const widgetInstanceId = parseInt(req.body.widgetInstanceId, 10);
    const outputWidgetInstanceId = parseInt(req.body.outputWidgetInstanceId, 10);

    if (!widgetInstanceId || !outputWidgetInstanceId) {
        res.status(404).send('WidgetInstanceId or outputWidgetInstanceId not supplied');
    }
    else {
        const widgetService = new WidgetService(req.user.id);
        widgetService.removeInput(outputWidgetInstanceId, widgetInstanceId, req.user.id)
            .then(() => {
                res.status(200).send();
            }).catch(error => res.status(error.status || 400).send(error.message));
    }
}

function updateWidget(req, res) {
    const { title, description, widgetInstanceId, parameters } = req.body;

    if (!widgetInstanceId) {
        res.status(404).send('widgetInstanceId  not supplied');
        return;
    }

    const widgetService = new WidgetService(req.user.id);

    widgetService.updateWidget(title, description, parameters, widgetInstanceId)
        .then(result => res.status(200).json(result))
        .catch(error => res.status(error.status || 400).send(error.message));
}

function deleteWidget(req, res) {
    const { widgetInstanceId } = req.body;

    if (!widgetInstanceId) {
        res.status(404).send('widgetInstanceId  not supplied');
        return;
    }

    const widgetService = new WidgetService(req.user.id);

    widgetService.deleteWidget(widgetInstanceId, req.user.id)
        .then(result => res.status(200).json(result))
        .catch(error => res.status(error.status || 400).send(error.message));
}

function getActivities(req, res) {
    const { widgetInstanceId } = req.query;

    if (!widgetInstanceId) {
        res.status(404).send('widgetInstanceId not supplied');
        return;
    }

    const widgetService = new WidgetService(req.user.id);

    widgetService.getActivities(widgetInstanceId, req.user.id)
        .then(result => res.status(200).json(result))
        .catch(error => res.status(error.status || 400).send(error.message));
}

function getParameters(req, res) {
    const { widgetInstanceId } = req.query;

    if (!widgetInstanceId) {
        res.status(404).send('widgetInstanceId not supplied');
        return;
    }

    const widgetService = new WidgetService(req.user.id);
    widgetService.getParameters(widgetInstanceId)
        .then(parameters => res.status(200).json(parameters))
        .catch(error => res.status(error.status || 400).send(error.message));
}

function setParameters(req, res) {
    const { widgetInstanceId, parameters } = req.body;

    if (!parameters || !widgetInstanceId) {
        res.status(404).send('Parameters or widgetInstanceId not supplied');
        return;
    }

    const widgetService = new WidgetService(req.user.id);
    widgetService.setParameters(widgetInstanceId, parameters)
        .then(() => res.status(200).send('Success'))
        .catch(error => res.status(error.status || 400).send(error.message));
}

function execute(req, res) {
    const { widgetInstanceId } = req.query;

    if (!widgetInstanceId) {
        res.status(404).send('WidgetInstanceId not supplied');
        return;
    }

    pipelineService.publishPipelineWidgetEvent(req.user.id, ActivityType.MANUAL_TRIGGER, widgetInstanceId)
        .then(() => res.status(200).send());
}

function getOutputStream(req, res) {
    const { widgetInstanceId } = req.query;

    if (!widgetInstanceId) {
        res.status(404).send('WidgetInstanceId not supplied');
        return;
    }

    const widgetService = new WidgetService(req.user.id);
    widgetService.getOutputStream(widgetInstanceId)
        .then(stream => {
            if (!stream) return res.status(404).send(null);
            const ndJsonTransform = new NdJsonTransform();
            pipeline(stream, ndJsonTransform, res, err => res.status(400).send(err));
        });
}

function setOutputSchema(req, res) {
    const { widgetInstanceId, schema } = req.body;
    if (!widgetInstanceId || !schema) {
        res.status(404).send('WidgetInstanceId and schema required');
        return;
    }

    const widgetService = new WidgetService(req.user.id);
    widgetService.setOutputSchema(widgetInstanceId, schema)
        .then(result => res.status(200).send(result))
        .catch(e => res.status(400).send(e));
}

function saveOutput(req, res) {
    const { widgetInstanceId } = req.query;
    if (!widgetInstanceId) {
        res.status(404).send('WidgetInstanceId required');
        return;
    }

    const widgetService = new WidgetService(req.user.id);
    widgetService.saveOutput(widgetInstanceId, req);

    req.on('end', () => res.status(200).send());
}

function addComment(req, res) {
    const { widgetInstanceId, comment } = req.body;

    if (!widgetInstanceId || !comment) {
        res.status(404).send('widgetInstanceId or comment not supplied');
    }

    const widgetService = new WidgetService(req.user.id);

    widgetService.addComment(comment, widgetInstanceId)
        .then(result => res.status(200).json(result))
        .catch(error => res.status(error.status || 400).send(error.message));
}

function getComments(req, res) {
    const { widgetInstanceId, limit } = req.query;

    if (!widgetInstanceId) {
        res.status(404).send('widgetInstanceId not supplied');
    }

    const widgetService = new WidgetService(req.user.id);

    widgetService.getComments(widgetInstanceId, limit)
        .then(result => res.status(200).json(result))
        .catch(error => res.status(error.status || 400).send(error.message));
}

function setDataQuality(req, res) {
    const widgetId = req.query.widgetId;

    if (!widgetId) {
        res.status(500).send('Required widgetId not provided');
    }
    else {
        const widgetService = new WidgetService(req.user.id);
        widgetService.setDataQuality(widgetId)
            .then(widgets => res.status(200).json(widgets))
            .catch(error => res.status(error.status || 400).send(error.message));
    }
}

function setParametersSlug(req, res) {
    const { moduleInstanceId, widgetInstanceSlug, parameters } = req.body;

    if (!parameters || !moduleInstanceId || !widgetInstanceSlug) {
        res.status(400).send('Parameters, moduleInstanceId or widgetInstanceSlug not supplied');
        return;
    }

    const widgetService = new WidgetService(req.user.id);
    widgetService.setParametersSlug(moduleInstanceId, widgetInstanceSlug, parameters)
        .then(() => res.status(200).send('Success'))
        .catch(error => res.status(error.status || 400).send(error.message));
}

function updateInputSchema(req, res) {
    const { inputSchema, widgetInstanceId } = req.body;

    if (!widgetInstanceId || !inputSchema) {
        res.status(404).send('widgetInstanceId or inputSchema not supplied');
        return;
    }

    const widgetService = new WidgetService(req.user.id);

    widgetService.updateInputSchema(widgetInstanceId, inputSchema)
        .then(result => res.status(200).json(result))
        .catch(error => res.status(error.status || 400).send(error.message));
}

module.exports = {
    listOutputs,
    listWidgetsByModuleInstance,
    getWidget,
    listWidgetsClasses,
    createWidget,
    listOutputsByWidgetInstance,
    listInputsByWidgetInstance,
    widgetFlow,
    setInput,
    removeInput,
    removeOutput,
    setOutput,
    updateWidget,
    deleteWidget,
    getActivities,
    setParameters,
    getParameters,
    execute,
    getOutputStream,
    setOutputSchema,
    saveOutput,
    addComment,
    getComments,
    getWidgetInputData,
    setDataQuality,
    setParametersSlug,
    listWidgetsAvailableToConnect,
    updateInputSchema
};