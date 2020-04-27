const enums = require('./enums');

const newWidgetClassTab = (key, name, _class) => {
    return {key, name, _class};
};

const newActivityTab = () => {
    return newWidgetClassTab('activity', 'Activity', 'ActivityTab');
};

const newInputTab = () => {
    return newWidgetClassTab('input', 'Input', 'InputTab');
};

const newDiscussionTab = () => {
    return newWidgetClassTab('discussion', 'Discussion', 'DiscussionTab');
};

const newSchemaTab = () => {
    return newWidgetClassTab('schema', 'Schema', 'SchemaTab');
};

const newTablePreviewTab = () => {
    return newWidgetClassTab('preview', 'Preview', 'TablePreviewTab');
};

const getPrimitiveWidgetClassTab = (widgetClassTypeId) => {
    switch (widgetClassTypeId) {
        case enums.PrimitiveWidgetClassType.DATA_PREP.id:
            return [
                newInputTab(),
                newSchemaTab(),
                newWidgetClassTab('editor', 'Editor', 'DataPrepEditorTab'),
                newTablePreviewTab(),
                newDiscussionTab(),
                newActivityTab(),
            ];
        case enums.PrimitiveWidgetClassType.FILE_SOURCE.id:
            return [
                newWidgetClassTab('fileSourceInputTab', 'Input', 'FileSourceInputTab'),
                newSchemaTab(),
                newWidgetClassTab('fileSourcePreviewTab', 'Preview', 'FileSourcePreviewTab'),
                newDiscussionTab(),
                newActivityTab(),
            ];
        case enums.PrimitiveWidgetClassType.DATA_REQUEST.id:
        // TODO
            return [
                newWidgetClassTab('fileSourceInputTab', 'Input', 'FileSourceInputTab'),
                newDiscussionTab(),
                newActivityTab(),
                newSchemaTab(),
            ];
        case enums.PrimitiveWidgetClassType.JOIN.id:
            return [
                newWidgetClassTab('joinTab', 'Input', 'joinTab'),
                newSchemaTab(),
                newTablePreviewTab(),
                newDiscussionTab(),
                newActivityTab(),
            ];
        case enums.PrimitiveWidgetClassType.VISUALIZE.id:
            return [
                newInputTab(),
                newSchemaTab(),
                newWidgetClassTab('dataVisualizeChartTab', 'Chart', 'DataVisualizeChartTab'),
                newDiscussionTab(),
                newActivityTab(),
            ];
        case enums.PrimitiveWidgetClassType.MODEL.id:
            return [
                newInputTab(),
                newSchemaTab(),
                newWidgetClassTab('modelNotebookTab', 'Notebook', 'ModelNotebookTab'),
                newDiscussionTab(),
                newActivityTab(),
            ];
        default:
            return {};
    }
};

const getPrimitiveWidgetClassConfig = (widgetClassTypeId) => {
    switch (widgetClassTypeId) {
        case enums.PrimitiveWidgetClassType.FILE_SOURCE.id:
            return {hideInheriteSchemaTabs: true};
        case enums.PrimitiveWidgetClassType.JOIN.id:
            return { multipleSchemaTabs: true};
        case enums.PrimitiveWidgetClassType.VISUALIZE.id:
            return {multipleSchemaTabs: true, multipleInputs: true};
        case enums.PrimitiveWidgetClassType.MODEL.id:
            return {multipleSchemaTabs: false, multipleInputs: false};
        default:
            return {multipleSchemaTabs: false, multipleInputs: false, hideInheriteSchemaTabs: false};
    }
};

module.exports = { getPrimitiveWidgetClassTab, getPrimitiveWidgetClassConfig };