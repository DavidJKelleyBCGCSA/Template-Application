const {Op} = require('sequelize');

const { config } = require('../config');

const ENVIRONMENT_KEY = 'ENVIRONMENT';

module.exports = {
  up: async (queryInterface) => {

    const newWidgetClassTab = (key, name, _class) => ({key, name, _class});

    const newActivityTab = () => newWidgetClassTab('activity', 'Activity', 'ActivityTab');
    const newInputTab = () => newWidgetClassTab('input', 'Input', 'InputTab')
    const newDiscussionTab = () => newWidgetClassTab('discussion', 'Discussion', 'DiscussionTab')
    const newSchemaTab = () => newWidgetClassTab('schema', 'Schema', 'SchemaTab')
    const newTablePreviewTab = () => newWidgetClassTab('preview', 'Preview', 'TablePreviewTab')

    const getPrimitiveWidgetClassTab = (widgetClassTypeId) => {
      switch (widgetClassTypeId) {
        case PrimitiveWidgetClassType.DATA_PREP.id:
          return [
            newInputTab(),
            newSchemaTab(),
            newWidgetClassTab('editor', 'Editor', 'DataPrepEditorTab'),
            newTablePreviewTab(),
            newDiscussionTab(),
            newActivityTab(),
          ];
        case PrimitiveWidgetClassType.FILE_SOURCE.id:
          return [
            newWidgetClassTab('fileSourceInputTab', 'Input', 'FileSourceInputTab'),
            newSchemaTab(),
            newWidgetClassTab('fileSourcePreviewTab', 'Preview', 'FileSourcePreviewTab'),
            newDiscussionTab(),
            newActivityTab(),
          ];
        case PrimitiveWidgetClassType.DATA_REQUEST.id:
          return [
            newWidgetClassTab('fileSourceInputTab', 'Input', 'FileSourceInputTab'),
            newDiscussionTab(),
            newActivityTab(),
            newSchemaTab(),
          ];
        case PrimitiveWidgetClassType.JOIN.id:
          return [
            newWidgetClassTab('joinTab', 'Input', 'joinTab'),
            newSchemaTab(),
            newTablePreviewTab(),
            newDiscussionTab(),
            newActivityTab(),
          ];
        case PrimitiveWidgetClassType.VISUALIZE.id:
          return [
            newInputTab(),
            newSchemaTab(),
            newWidgetClassTab('dataVisualizeChartTab', 'Chart', 'DataVisualizeChartTab'),
            newDiscussionTab(),
            newActivityTab(),
          ];
        case PrimitiveWidgetClassType.MODEL.id:
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
        case PrimitiveWidgetClassType.FILE_SOURCE.id:
          return {hideInheriteSchemaTabs: true};
        case PrimitiveWidgetClassType.JOIN.id:
          return { multipleSchemaTabs: true};
        case PrimitiveWidgetClassType.VISUALIZE.id:
          return {multipleSchemaTabs: true, multipleInputs: true};
        case PrimitiveWidgetClassType.MODEL.id:
          return {multipleSchemaTabs: false, multipleInputs: false};
        default:
          return {multipleSchemaTabs: false, multipleInputs: false, hideInheriteSchemaTabs: false};
      }
    };

    const WidgetClassConnectionType = Object.freeze({
      INPUT: 'INPUT',
      OUTPUT: 'OUTPUT',
      BOTH: 'BOTH'
    });

    const PrimitiveWidgetClassType = Object.freeze({
      FILE_SOURCE: { id: 1, name: 'File Source', type: 'PRIMITIVE_FILE_SOURCE',
        connectionType: WidgetClassConnectionType.INPUT },
      DATA_PREP: { id: 2, name: 'Data Prep', type: 'PRIMITIVE_DATA_PREP',
        connectionType: WidgetClassConnectionType.BOTH },
      JOIN: { id: 3, name: 'Join', type: 'PRIMITIVE_JOIN',
        connectionType: WidgetClassConnectionType.BOTH },
      VISUALIZE: { id: 4, name: 'Visualize', type: 'PRIMITIVE_VISUALIZE',
        connectionType: WidgetClassConnectionType.OUTPUT },
      DATA_REQUEST: { id: 5, name: 'Data Request', type: 'PRIMITIVE_DATA_REQUEST',
        connectionType: WidgetClassConnectionType.OUTPUT },
      MODEL: { id: 6, name: 'Model', type: 'PRIMITIVE_MODEL',
        connectionType: WidgetClassConnectionType.BOTH },
    });

    const widgetClasses = Object.keys(PrimitiveWidgetClassType).map(key => {
      const { id, name, type, connectionType } = PrimitiveWidgetClassType[key];
      return {
        name,
        type,
        connection_type: connectionType,
        description: `Widget Class of type ${name}`,
        version: 1,
        primitive: true,
        environment: config.get(ENVIRONMENT_KEY),
        tabs: JSON.stringify(getPrimitiveWidgetClassTab(id)),
        config: JSON.stringify(getPrimitiveWidgetClassConfig(id)),
        parameters: JSON.stringify({}),
        app_id: 1,
        created_at: new Date(),
        updated_at: new Date(),
      };
    });

    await queryInterface.bulkInsert('widget_class', widgetClasses);
  },

  down: async (queryInterface) => {
    await queryInterface.bulkDelete('widget_class', {
      id: {
        [Op.between]: [1, 6],
      }
    });
  }
};
