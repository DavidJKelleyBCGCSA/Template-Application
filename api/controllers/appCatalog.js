const AppCatalogService = require('../services/appStore/appCatalogService');

function listApps (req, res) {
    const offset = req.query.offset || 0;
    const limit = req.query.limit || null;

    const appCatalog = new AppCatalogService();

    appCatalog.listApps(offset, limit).then(result => res.status(200).json(result));
}

function registerApp (req, res) {
    const manifest = req.body.manifest;

    if (!manifest|| !manifest.app || !manifest.app.name || !manifest.app.version || !manifest.app.environment) {
        res.status(500).send("Required field not provided");
        return;
    }

    const appCatalog = new AppCatalogService();
    appCatalog.registerApp(manifest)
        .then(result => res.status(200).json(result))
        .catch(error => res.status(400).send(error.message));
}

function installApp (req, res) {
    const appId = req.body.appId;
    const workspaceId = req.body.workspaceId;

    if (!appId || !workspaceId) {
        res.status(500).send('Required fields not provided');
        return;
    }

    const appCatalog = new AppCatalogService();
    appCatalog.installApp(appId, workspaceId, req.user.id).then(result => res.status(200).json(result));
}

module.exports = { listApps, registerApp, installApp };