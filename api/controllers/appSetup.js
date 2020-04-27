const AppSetupService = require('../services/appStore/appSetupService');

function listSetupTabs (req, res) {
    const { moduleInstanceId } = req.body;

    if (!moduleInstanceId) {
        res.status(500).send("Required field 'moduleInstanceId' not provided");
        return;
    }

    const appSetup = new AppSetupService(req.user.id);
    appSetup.listSetupTabs(moduleInstanceId)
        .then(result => res.status(200).json(result))
        .catch(error => res.status(400).send(error.message));
}

function markAsCompleted (req, res) {
    const { moduleInstanceId } = req.body;

    if (!moduleInstanceId) {
        res.status(500).send("Required field 'moduleInstanceId' not provided");
        return;
    }

    const appSetup = new AppSetupService(req.user.id);
    appSetup.markSetupAsCompleted(moduleInstanceId)
        .then(result => res.status(200).json(result))
        .catch(error => res.status(400).send(error.message));
}

function markTabAsGood (req, res) {
    const { moduleInstanceId, key, good } = req.body;

    if (!moduleInstanceId || !key) {
        res.status(500).send("Required fields not provided");
        return;
    }

    const appSetup = new AppSetupService(req.user.id);
    appSetup.markTabAsGood(moduleInstanceId, key, !!good)
        .then(result => res.status(200).json(result))
        .catch(error => res.status(400).send(error.message));
}

function getParameters (req, res) {
    const { moduleInstanceId } = req.query;

    if (!moduleInstanceId) {
        res.status(500).send("Required field not provided");
        return;
    }

    const appSetup = new AppSetupService(req.user.id);
    appSetup.getParameters(moduleInstanceId)
        .then(result => res.status(200).json(result))
        .catch(error => res.status(400).send(error.message));
}


function setParameters (req, res) {
    const { moduleInstanceId, parameters } = req.body;

    if (!moduleInstanceId || !parameters) {
        res.status(500).send("Required fields not provided");
        return;
    }

    const appSetup = new AppSetupService(req.user.id);
    appSetup.setParameters(moduleInstanceId, parameters)
        .then(result => res.status(200).json(result))
        .catch(error => res.status(400).send(error.message));
}



module.exports = { markTabAsGood, listSetupTabs, markAsCompleted, setParameters, getParameters};