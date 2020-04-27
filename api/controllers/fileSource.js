const FileSourceService = require('../services/widget/fileSourceService');
const { pipeline } = require('stream');
const NdJsonTransform = require('../util/ndJsonTransform');

/**
 * Uploads file to data store; must pass in valid uploadToken
 */
function upload(req, res) {
    const { token, workspaceId, widgetInstanceId } = req.body;
    if (!token || !workspaceId || !widgetInstanceId) return res.status(404).send('Upload token required');

    const fileSourceService = new FileSourceService(workspaceId, widgetInstanceId, req.user.id);
    fileSourceService.upload(token, req.stream);
}

/**
 *  TODO temp endpoint. This will be changed with a Stream based solution.
 */
function uploadSync(req, res) {
    const { token, workspaceId, widgetInstanceId, data } = req.body;
    if (!token || !workspaceId || !widgetInstanceId || !data) return res.status(404).send('Missing required fields');

    const fileSourceService = new FileSourceService(workspaceId, widgetInstanceId, req.user.id);
    fileSourceService.uploadSync(token, data, req.user.id).then(() => res.status(200).send("OK"));
}

/**
 * Call this first to get a fileupload token and starting row number, then call upload
 */
function getUploadToken(req, res) {
    const { workspaceId, widgetInstanceId, tabName, filename, fileIdHash, size, schema } = req.body;
    const fileSourceService = new FileSourceService(workspaceId, widgetInstanceId, req.user.id);
    fileSourceService.getUploadToken(tabName, filename, fileIdHash, size, schema)
        .then(({token, offset}) => res.status(200).send({token, offset}));
}

function listVersions(req, res) {
    const { workspaceId, widgetInstanceId } = req.query;
    const fileSourceService = new FileSourceService(workspaceId, widgetInstanceId, req.user.id);
    fileSourceService.listVersions()
        .then(versions => res.status(200).json(versions));
}

function setVersion(req, res) {
    const { workspaceId, widgetInstanceId, version } = req.body;
    const fileSourceService = new FileSourceService(workspaceId, widgetInstanceId, req.user.id);
    fileSourceService.setVersion(version)
        .then(() => res.status(200).send());
}

function preview(req, res) {
    const { workspaceId, widgetInstanceId } = req.query;

    const fileSourceService = new FileSourceService(workspaceId, widgetInstanceId, req.user.id);
    fileSourceService.preview()
    .then(stream => {
        const ndJsonTransform = new NdJsonTransform();
        pipeline(stream, ndJsonTransform, res, err => res.status(500).send(err));
    }).catch(error => res.status(error.status || 500).send(error.message));
}

// TODO: Pablo. this whole method maybe changed later when using stream correctly.
// I did not wanted to spend to much time with it right now
function download(req, res) {
    const { workspaceId, widgetInstanceId, version } = req.query;

    if (!version || !workspaceId || !widgetInstanceId) return res.status(404).send('Missing required fields');

    const fileSourceService = new FileSourceService(workspaceId, widgetInstanceId, req.user.id);
    const versionInt = parseInt(version, 10);

    fileSourceService.download(versionInt)
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

module.exports = { upload, getUploadToken, listVersions, setVersion, preview, uploadSync, download };