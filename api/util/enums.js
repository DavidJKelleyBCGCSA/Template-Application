const App = Object.freeze({
  THANOS: { name: 'Thanos Core', id: 1, slug: 'Thanos' },
});


const DataSourceType = Object.freeze({
  FILE_UPLOAD: 'FILE_UPLOAD',
});

// the widget can be used as the class type below
const WidgetClassConnectionType = Object.freeze({
  INPUT: 'INPUT',
  OUTPUT: 'OUTPUT',
  BOTH: 'BOTH'
});


const filterConectionTypeMap = {
  "INPUT": [],
  "OUTPUT": ["INPUT", "BOTH"],
  "BOTH": ["INPUT", "BOTH"]
};

// The order of the classes here is important. They must much its id with its index.
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


const WorkspaceStatus = Object.freeze({
  OPEN: 'OPEN',
  ARCHIVED: 'ARCHIVED',
});

const ActivityEventType = Object.freeze({
  WIDGET_DATA: 'WIDGET_DATA',
  MODULE_DATA: 'MODULE_DATA',
  WORKSPACE_DATA: 'WORKSPACE_DATA',
});

// when a new value is added they must also be added to the
// postgres enum with a new migration, e.g.: 20200415183554-added-activity-type-enum.js
const ActivityType = Object.freeze({
  FILE_UPLOADED: 'FILE_UPLOADED',
  FILE_CREATED: 'FILE_CREATED',
  CURRENT_VERSION_CHANGED: 'CURRENT_VERSION_CHANGED',
  COMMENTED_ON_WIDGET: 'COMMENTED_ON_WIDGET',
  COMMENTED_ON_MODULE: 'COMMENTED_ON_MODULE',
  COMMENTED_ON_WORKSPACE: 'COMMENTED_ON_WORKSPACE',
  CONNECTED_INPUT_WIDGET: 'CONNECTED_INPUT_WIDGET',
  CONNECTED_OUTPUT_WIDGET: 'CONNECTED_OUTPUT_WIDGET',
  DISCONNECTED_INPUT_WIDGET: 'DISCONNECTED_INPUT_WIDGET',
  DISCONNECTED_OUTPUT_WIDGET: 'DISCONNECTED_OUTPUT_WIDGET',
  WORKSPACE_CREATED: 'WORKSPACE_CREATED',
  MODULE_CREATED: 'MODULE_CREATED',
  WIDGET_CREATED: 'WIDGET_CREATED',
  WORKSPACE_UPDATED: 'WORKSPACE_UPDATED',
  WORKSPACE_STATUS_CHANGED: 'WORKSPACE_STATUS_CHANGED',
  MODULE_UPDATED: 'MODULE_UPDATED',
  WIDGET_UPDATED: 'WIDGET_UPDATED',
  WORKSPACE_DELETED: 'WORKSPACE_DELETED',
  MODULE_DELETED: 'MODULE_DELETED',
  WIDGET_DELETED: 'WIDGET_DELETED',
  WORKSPACE_USERS_INVITED: 'WORKSPACE_USERS_INVITED',
  CHART_CREATED: 'CHART_CREATED',
  CHART_UPDATED: 'CHART_UPDATED',
  CHART_DELETED: 'CHART_DELETED',
  CHART_PDF_DOWNLOADED: 'CHART_PDF_DOWNLOADED',
  ERROR_PUBLISHING_TO_PIPELINE: 'ERROR_PUBLISHING_TO_PIPELINE',
  DATA_QUALITY_UPDATED: 'DATA_QUALITY_UPDATED',
  RECIPE_RUNNED: 'RECIPE_RUNNED',
  JOIN_RUNNED: 'JOIN_RUNNED',
  WIDGET_INPUT_SCHEMA_CHANGED: 'WIDGET_INPUT_SCHEMA_CHANGED',
  // Events that trigger pipeline jobs:
  INPUT_CHANGED: 'INPUT_CHANGED',
  PARAMETERS_CHANGED: 'PARAMETERS_CHANGED',
  MANUAL_TRIGGER: 'MANUAL_TRIGGER',
  OUTPUT_CHANGED: 'OUTPUT_CHANGED',
  SETUP_FINISHED: 'SETUP_FINISHED',
  // Events updating pipeline job status:
  JOB_RUNNING: 'JOB_RUNNING',
  JOB_COMPLETE: 'JOB_COMPLETE',
});

const isPipelineEvent = (event) => {
    switch (event) {
        case ActivityType.INPUT_CHANGED:
        case ActivityType.PARAMETERS_CHANGED:
        case ActivityType.INPUT_CMANUAL_TRIGGERHANGED:
        case ActivityType.OUTPUT_CHANGED:
        case ActivityType.SETUP_FINISHED:
            return true;
        default:
            return false;
    }
};

const DataPrepStepTypes = Object.freeze({
  REMOVE_ROWS: 'REMOVE_ROWS',
  ADD_COLUMN: 'ADD_COLUMN',
  SORT_A_Z: 'SORT_A_Z',
  SORT_Z_A: 'SORT_Z_A',
  RENAME_COLUMN: 'RENAME_COLUMN',
  REMOVE_COLUMN: 'REMOVE_COLUMN',
  CHANGE_TYPE: 'CHANGE_TYPE',
  FILTER_BY: 'FILTER_BY',
  STANDARDIZE: 'STANDARDIZE',
  REPLACE: 'REPLACE',
  SPLIT_COLUMN: 'SPLIT_COLUMN',
  FORMAT: 'FORMAT',
});

module.exports = {
  PrimitiveWidgetClassType,
  WidgetClassConnectionType,
  DataPrepStepTypes,
  ActivityEventType,
  ActivityType,
  WorkspaceStatus,
  DataSourceType,
  App,
  filterConectionTypeMap,
  isPipelineEvent
};