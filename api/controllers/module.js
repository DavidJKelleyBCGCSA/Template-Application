const ModuleService = require('../services/workspace/moduleService');

function listModules (req, res) {
    const workspaceId = req.query.workspaceId;

    if (!workspaceId) {
        res.status(500).send('Required workspaceId not provided');
    }
    else {
        const moduleService = new ModuleService();
        moduleService.listModules(workspaceId, req.user.id)
            .then(modules => res.status(200).json(modules))
            .catch(error => res.status(error.status || 400).send(error.message));
    }
}

function createModule (req, res) {
    const { name, description, workspaceId } = req.body;
    if (!name || !workspaceId) {
        res.status(500).send('Required field(s) not supplied');
    }
    else {
        const moduleService = new ModuleService();
        moduleService.createModule(name, description, workspaceId, req.user.id)
            .then(result => res.status(200).json(result))
            .catch(error => res.status(error.status || 400).send(error.message));
    }
}

function getModule (req, res) {
    const moduleId = req.query.moduleId;

    if (!moduleId) {
        res.status(500).send('Required moduleId not provided');
    }
    else {
        const moduleService = new ModuleService();
        moduleService.getModule(moduleId, req.user.id)
            .then(amodule => res.status(200).json(amodule))
            .catch(error => res.status(error.status || 400).send(error.message));
    }
}

function updateModule (req, res) {
    const { name, description, moduleInstanceId } = req.body;
    if (!name || !moduleInstanceId) {
        res.status(500).send('Required field(s) not supplied');
    }
    else {
        const moduleService = new ModuleService();
        moduleService.updateModule(name, description, moduleInstanceId, req.user.id)
            .then(result => res.status(200).json(result))
            .catch(error => res.status(error.status || 400).send(error.message));
    }
}

function deleteModule (req, res) {
    const { moduleInstanceId } = req.body;
    if (!moduleInstanceId) {
        res.status(500).send('Required field(s) not supplied');
    }
    else {
        const moduleService = new ModuleService();
        moduleService.deleteModule(moduleInstanceId, req.user.id)
            .then(result => res.status(200).json(result))
            .catch(error => res.status(error.status || 400).send(error.message));
    }
}

function getActivities (req, res) {
    const { moduleInstanceId, deepMode } = req.query;

    if (!moduleInstanceId) {
        res.status(404).send('moduleInstanceId not supplied');
    }
    const moduleService = new ModuleService();
    moduleService.getActivities(moduleInstanceId, deepMode === 'true' || deepMode === true, req.user.id)
        .then(result => res.status(200).json(result))
        .catch(error => res.status(error.status || 400).send(error.message));
}

function addComment (req, res) {
    const { moduleInstanceId, comment } = req.body;

    if (!moduleInstanceId || !comment) {
        res.status(404).send('moduleInstanceId or comment not supplied');
    }
    const moduleService = new ModuleService();
    moduleService.addComment(req.user.id, comment, moduleInstanceId)
        .then(result => res.status(200).json(result))
        .catch(error => res.status(error.status || 400).send(error.message));
}

function getComments (req, res) {
    const { moduleInstanceId, deepMode, limit } = req.query;

    if (!moduleInstanceId) {
        res.status(404).send('moduleInstanceId not supplied');
    }
    const moduleService = new ModuleService();
    moduleService.getComments(moduleInstanceId, deepMode === 'true' || deepMode === true, limit, req.user.id)
        .then(result => res.status(200).json(result))
        .catch(error => res.status(error.status || 400).send(error.message));
}

module.exports = { getModule, createModule, listModules, updateModule, deleteModule, getActivities, addComment,
    getComments };