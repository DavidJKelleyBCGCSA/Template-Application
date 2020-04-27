const WorkspaceService = require('../services/workspace/workspaceService');

function listWorkspaces (req, res) {
    const workspaceService = new WorkspaceService();
    workspaceService.listWorkspaces(req.user.id)
        .then(cards => res.status(200).json(cards))
        .catch(error => res.status(error.status || 500).send(error.message));
}

function createWorkspace (req, res) {
    const { title, number, description, environment, emails } = req.body;
    if (!title || !environment) {
        res.status(400).send('Required field(s) not provided');
    }
    else {
        const workspaceService = new WorkspaceService();
        workspaceService.createWorkspace(title, number, req.user.id, description, environment, emails)
            .then(result => res.status(200).json(result))
            .catch(error => res.status(error.status || 500).send(error.message));
    }
}

function updateWorkspace (req, res) {
    const { workspaceId, title, description } = req.body;
    if (!workspaceId) {
        res.status(400).send('Required field workspaceId not provided');
    }
    else {
        const workspaceService = new WorkspaceService();
        workspaceService.updateWorkspace(workspaceId, title, description, req.user.id)
            .then(result => res.status(200).json(result))
            .catch(error => res.status(error.status || 500).send(error.message));
    }
}

function updateStatus (req, res) {
    const { workspaceId, status } = req.body;
    if (!workspaceId || !status) {
        res.status(400).send('Required fields not provided');
    }
    else {
        const workspaceService = new WorkspaceService();
        workspaceService.updateStatus(workspaceId, status, req.user.id)
            .then(result => res.status(200).json(result))
            .catch(error => res.status(error.status || 500).send(error.message));
    }
}

function deleteWorkspace (req, res) {
    const { workspaceId } = req.body;
    if (!workspaceId) {
        res.status(400).send('Required field(s) not provided');
    }
    else {
        const workspaceService = new WorkspaceService();
        workspaceService.deleteWorkspace(workspaceId, req.user.id)
            .then(result => res.status(200).json(result))
            .catch(error => res.status(error.status || 500).send(error.message));
    }
}

function getWorkspace (req, res) {
    const workspaceId = req.query.workspaceId;

    if (!workspaceId) {
        res.status(400).send('Required workspaceId not provided');
    }
    else {
        const workspaceService = new WorkspaceService();
        workspaceService.getWorkspace(workspaceId, req.user.id)
            .then(wrksp => res.status(200).json(wrksp))
            .catch(error => res.status(error.status || 500).send(error.message));
    }
}

function inviteMembers (req, res) {
    const {workspaceId, emails} = req.body;

    if (!workspaceId) {
        res.status(400).send('Required workspaceId not provided');
    }
    else {
        const workspaceService = new WorkspaceService();
        workspaceService.inviteMembers(workspaceId, emails, req.user.id)
            .then(wrksp => res.status(200).json(wrksp))
            .catch(error => res.status(error.status || 500).send(error.message));
    }
}

function getActivities (req, res) {
    const { workspaceId, deepMode, limit } = req.query;

    if (!workspaceId) {
        res.status(404).send('workspaceId not supplied');
    }
    const workspaceService = new WorkspaceService();
    workspaceService.getActivities(workspaceId, deepMode === 'true' || deepMode === true, limit, req.user.id)
        .then(wrksp => res.status(200).json(wrksp))
        .catch(error => res.status(error.status || 500).send(error.message));
}

function getAllRecentWorkspacesActivities (req, res) {
    const { workspaceId, limit } = req.query;

    if (!workspaceId) {
        res.status(404).send('workspaceId not supplied');
    }
    const workspaceService = new WorkspaceService();
    workspaceService.getRecentWorkspacesActivity(limit, req.user.id)
        .then(wrksps => res.status(200).json(wrksps))
        .catch(error => res.status(error.status || 500).send(error.message));
}

function addComment (req, res) {
    const { workspaceId, comment } = req.body;

    if (!workspaceId || !comment) {
        res.status(404).send('workspaceId or comment not supplied');
    }
    const workspaceService = new WorkspaceService();
    workspaceService.addComment(req.user.id, comment, workspaceId)
        .then(result => res.status(200).json(result))
        .catch(error => res.status(error.status || 500).send(error.message));
}

function getComments (req, res) {
    const { workspaceId, deepMode, limit } = req.query;

    if (!workspaceId) {
        res.status(404).send('workspaceId not supplied');
    }
    const workspaceService = new WorkspaceService();
    workspaceService.getComments(workspaceId, deepMode === 'true' || deepMode === true, limit, req.user.id)
        .then(result => res.status(200).json(result))
        .catch(error => res.status(error.status || 500).send(error.message));
}

module.exports = { listWorkspaces, createWorkspace, getWorkspace, updateWorkspace, inviteMembers, deleteWorkspace,
    updateStatus, getActivities, getAllRecentWorkspacesActivities, addComment, getComments};