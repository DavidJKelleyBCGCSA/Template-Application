const DataPrepService = require('../services/widget/dataprepService');
const DataPrepRecipeService = require('../services/widget/dataPrepRecipeService');
const { noData } = require('../util/errors');

const { pipeline } = require('stream');
const NdJsonTransform = require('../util/ndJsonTransform');

function addSort (req, res) {
    const workspaceId = parseInt(req.body.workspaceId, 10);
    const widgetInstanceId = parseInt(req.body.widgetInstanceId, 10);
    const params = req.body.params;

    if (!workspaceId || !widgetInstanceId || !params) {
        res.status(404).send('Required fields not supplied');
    }
    else {
        const appCatalogService = new DataPrepService(workspaceId, widgetInstanceId);
        appCatalogService.addSort(params)
            .then(() => res.status(200).send());
    }
}

function removeSort (req, res) {
    const workspaceId = parseInt(req.body.workspaceId, 10);
    const widgetInstanceId = parseInt(req.body.widgetInstanceId, 10);
    const stepIndex = parseInt(req.body.stepIndex, 10);

    if (!workspaceId || !widgetInstanceId || isNaN(stepIndex)) {
        res.status(404).send('Required fields not supplied');
    }
    else {
        const appCatalogService = new DataPrepService(workspaceId, widgetInstanceId);
        appCatalogService.removeSort(stepIndex)
            .then(() => res.status(200).send());
    }
}

function addRangeFilter(req, res) {
    const workspaceId = parseInt(req.body.workspaceId, 10);
    const widgetInstanceId = parseInt(req.body.widgetInstanceId, 10);
    const params = req.body.params;
    const index = req.body.index;

    if (!workspaceId || !widgetInstanceId || !params) {
        res.status(404).send('Required fields not supplied');
    }
    else {
        const appCatalogService = new DataPrepService(workspaceId, widgetInstanceId);
        appCatalogService.addRangeFilter(params, index)
            .then(() => res.status(200).send());
    }
}

function addCategoryFilter(req, res) {
    const workspaceId = parseInt(req.body.workspaceId, 10);
    const widgetInstanceId = parseInt(req.body.widgetInstanceId, 10);
    const params = req.body.params;
    const index = req.body.index;

    if (!workspaceId || !widgetInstanceId || !params) {
        res.status(404).send('Required fields not supplied');
    }
    else {
        const appCatalogService = new DataPrepService(workspaceId, widgetInstanceId);
        appCatalogService.addCategoryFilter(params, index)
            .then(() => res.status(200).send());
    }
}

function select (req, res) {
    const workspaceId = parseInt(req.query.workspaceId, 10);
    const widgetInstanceId = parseInt(req.query.widgetInstanceId, 10);
    const offset = parseInt(req.query.offset, 10) || 0;
    const limit = parseInt(req.query.limit, 10) || null;

    if (!workspaceId || !widgetInstanceId) {
        res.status(404).send('Required fields not supplied');
    }
    else {
        const appCatalogService = new DataPrepService(workspaceId, widgetInstanceId);
        appCatalogService.select(offset, limit)
            .then(stream => {
                if (stream) {
                    const ndJsonTransform = new NdJsonTransform();
                    pipeline(stream, ndJsonTransform, res, err => res.status(500).send(err));
                } else {
                    return Promise.reject(noData());
                }
            }).catch(error => res.status(error.status || 500).send(error.message));
    }
}


function inputInfo (req, res) {
    const workspaceId = parseInt(req.query.workspaceId, 10);
    const widgetInstanceId = parseInt(req.query.widgetInstanceId, 10);

    if (!workspaceId || !widgetInstanceId) {
        res.status(404).send('Required fields not supplied');
    }

    else {
        const appCatalogService = new DataPrepService(workspaceId, widgetInstanceId);
        appCatalogService.inputInfo().then((data) => res.status(200).send(data))
        .catch(error => res.status(error.status || 500).send(error.message));
    }
}

function addStep (req, res) {
    const workspaceId = parseInt(req.body.workspaceId, 10);
    const widgetInstanceId = parseInt(req.body.widgetInstanceId, 10);
    const params = req.body.params;
    const index = req.body.index;

    if (!workspaceId || !widgetInstanceId || !params) {
        res.status(404).send('Required fields not supplied');
    }

    else {
        const appCatalogService = new DataPrepService(workspaceId, widgetInstanceId);
        appCatalogService.addStep(params, index).then((data) => res.status(200).send(data));
    }
}

function removeStep (req, res) {
    const workspaceId = parseInt(req.body.workspaceId, 10);
    const widgetInstanceId = parseInt(req.body.widgetInstanceId, 10);
    const stepIndex = parseInt(req.body.stepIndex, 10);

    if (!workspaceId || !widgetInstanceId || isNaN(stepIndex)) {
        res.status(404).send('Required fields not supplied');
    }

    else {
        const appCatalogService = new DataPrepService(workspaceId, widgetInstanceId);
        appCatalogService.removeStep(stepIndex).then((data) => res.status(200).send(data));
    }
}

function removeRangeFilter (req, res) {
    const workspaceId = parseInt(req.body.workspaceId, 10);
    const widgetInstanceId = parseInt(req.body.widgetInstanceId, 10);
    const stepIndex = parseInt(req.body.stepIndex, 10);

    if (!workspaceId || !widgetInstanceId || isNaN(stepIndex)) {
        res.status(404).send('Required fields not supplied');
    }

    else {
        const appCatalogService = new DataPrepService(workspaceId, widgetInstanceId);
        appCatalogService.removeRangeFilter(stepIndex).then((data) => res.status(200).send(data));
    }
}

function removeCategoryFilter (req, res) {
    const workspaceId = parseInt(req.body.workspaceId, 10);
    const widgetInstanceId = parseInt(req.body.widgetInstanceId, 10);
    const stepIndex = parseInt(req.body.stepIndex, 10);

    if (!workspaceId || !widgetInstanceId || isNaN(stepIndex)) {
        res.status(404).send('Required fields not supplied');
    }

    else {
        const appCatalogService = new DataPrepService(workspaceId, widgetInstanceId);
        appCatalogService.removeCategoryFilter(stepIndex)
            .then((data) => res.status(200).send(data));
    }
}

function addFilter(req, res) {
    const workspaceId = parseInt(req.body.workspaceId, 10);
    const widgetInstanceId = parseInt(req.body.widgetInstanceId, 10);
    const params = req.body.params;
    const index = req.body.index;


    if (!workspaceId || !widgetInstanceId || !params) {
        res.status(404).send('Required fields not supplied');
    }

    else {
        const appCatalogService = new DataPrepService(workspaceId, widgetInstanceId);
        appCatalogService.addFilter(params, index)
            .then(() => res.status(200).send());
    }
}

function removeFilter (req, res) {
    const workspaceId = parseInt(req.body.workspaceId, 10);
    const widgetInstanceId = parseInt(req.body.widgetInstanceId, 10);
    const stepIndex = parseInt(req.body.stepIndex, 10);

    if (!workspaceId || !widgetInstanceId || isNaN(stepIndex)) {
        res.status(404).send('Required fields not supplied');
    }

    else {
        const appCatalogService = new DataPrepService(workspaceId, widgetInstanceId);
        appCatalogService.removeFilter(stepIndex)
            .then((data) => res.status(200).send(data));
    }
}


/**
 * Saves FS data after applying the recipe
 */
function runRecipe(req, res) {
    const runDataQualityProcess = req.body.runDataQualityProcess || false;
    const { workspaceId, widgetInstanceId} = req.body;
    if (!workspaceId || !widgetInstanceId) return res.status(404).send('Upload token required');

    const dataPrepRecipeService = new DataPrepRecipeService(workspaceId, widgetInstanceId, req.user.id);
    dataPrepRecipeService.runRecipe(runDataQualityProcess)
        .then(() => res.status(200).send())
        .catch(error => res.status(error.status || 500).send(error.message));
}


function preview(req, res) {
    const { workspaceId, widgetInstanceId } = req.query;

    const appCatalogService = new DataPrepService(workspaceId, widgetInstanceId, req.user.id);
    appCatalogService.preview()
    .then(stream => {
        const ndJsonTransform = new NdJsonTransform();
        pipeline(stream, ndJsonTransform, res, err => res.status(500).send(err));
    }).catch(error => res.status(error.status || 500).send(error.message));
}


// TODO: Ariel. this whole method maybe changed later when using stream correctly.
// I did not wanted to spend to much time with it right now
function download(req, res) {
    const { workspaceId, widgetInstanceId, version } = req.query;

    if (!version || !workspaceId || !widgetInstanceId) return res.status(404).send('Missing required fields');

    const appCatalogService = new DataPrepService(workspaceId, widgetInstanceId, req.user.id);
    const versionInt = parseInt(version, 10);

    appCatalogService.download(versionInt)
    .then(({stream, filename}) => {
        const { Parser } = require('json2csv');
        let headers = null;
        const data = [];
        stream.on('data', function(row) {
            delete row['_']; // eslint-disable-line
            delete row['row_errors']; // eslint-disable-line

            if (!headers) {
                headers = Object.keys(row);
            }

            data.push(row);
        });

        stream.on('end',function() {
            const parser = new Parser({fields: headers});
            const csv = parser.parse(data);
            res.setHeader('Content-disposition', `attachment; filename=${filename}`);
            res.set('Content-Type', 'text/csv');
            res.status(200).send(csv);
        });

    }).catch(error => res.status(error.status || 500).send(error.message));
}

function listVersions(req, res) {
    const { workspaceId, widgetInstanceId } = req.query;
    const appCatalogService = new DataPrepService(workspaceId, widgetInstanceId, req.user.id);
    appCatalogService.listVersions()
        .then(versions => res.status(200).json(versions));
}

function setVersion(req, res) {
    const { workspaceId, widgetInstanceId, version } = req.body;
    const appCatalogService = new DataPrepService(workspaceId, widgetInstanceId, req.user.id);
    appCatalogService.setVersion(version, req.user.id)
        .then(() => res.status(200).send());
}

module.exports = {
    addSort,
    select,
    addRangeFilter,
    addCategoryFilter,
    inputInfo,
    removeSort,
    addStep,
    removeStep,
    removeRangeFilter,
    removeCategoryFilter,
    addFilter,
    removeFilter,
    runRecipe,
    preview,
    download,
    listVersions,
    setVersion
};