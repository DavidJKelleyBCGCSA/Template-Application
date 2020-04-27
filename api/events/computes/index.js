const {PrimitiveWidgetClassType, App} = require('../../util/enums');

// not using file source compute for the moment
// const FileSourceCompute = [require('./fileSourceCompute'), PrimitiveWidgetClassType.FILE_SOURCE.type];

// primitive widgets computes
// const DataPrepCompute = [require('./dataPrepCompute'), PrimitiveWidgetClassType.DATA_PREP.type];
const dataPrepCompute = require('./dataPrepCompute');
const vizCompute = require('./visualizationCompute');
const modelCompute = require('./modelCompute');
const joinCompute = require('./joinCompute');

const {REDIS_CONNECTION_URI} = require('../../../config');

function listen() {

    dataPrepCompute.listen(App.THANOS.id, PrimitiveWidgetClassType.DATA_PREP.type, REDIS_CONNECTION_URI);
    vizCompute.listen(App.THANOS.id, PrimitiveWidgetClassType.VISUALIZE.type, REDIS_CONNECTION_URI);
    modelCompute.listen(App.THANOS.id, PrimitiveWidgetClassType.MODEL.type, REDIS_CONNECTION_URI);
    joinCompute.listen(App.THANOS.id, PrimitiveWidgetClassType.JOIN.type, REDIS_CONNECTION_URI);
}

module.exports = { listen };