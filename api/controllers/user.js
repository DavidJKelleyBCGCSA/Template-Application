const UserService = require('../services/user/userService');
const WorkspaceService = require('../services/workspace/workspaceService');

function listUserEmails (req, res) {
    const { prefix, top } = req.query;
    if (!prefix) {
        res.status(500).send('Required field(s) not provided');
    }

    if (top && isNaN(top)) {
        res.status(500).send('Top parameter has to be a valid number between 0 and 10');
    }

    else {
        const userService = new UserService();
        userService.getUserEmailsByPrefix(prefix, top)
            .then(
                result =>
                res.status(200).json(result));
    }
}

function getRecentActivities (req, res) {
    const { limit } = req.query;

    const workspaceService = new WorkspaceService();
    workspaceService.getRecentActivities(limit, req.user.id)
        .then(wrksp => res.status(200).json(wrksp))
        .catch(error => res.status(error.status || 500).send(error.message));
}

function getRecentWorkspacesActivity (req, res) {
    const { limit } = req.query;

    const workspaceService = new WorkspaceService();
    workspaceService.getRecentWorkspacesActivity(limit, req.user.id)
        .then(wrksp => res.status(200).json(wrksp))
        .catch(error => res.status(error.status || 500).send(error.message));
}


function getRecentComments (req, res) {
    const { limit } = req.query;

    const workspaceService = new WorkspaceService();
    workspaceService.getRecentCommentsByUser(limit, req.user.id)
        .then(wrksp => res.status(200).json(wrksp))
        .catch(error => res.status(error.status || 500).send(error.message));
}

function listUsersByFullName (req, res) {
    const { prefix, top } = req.query;
    if (!prefix) {
        res.status(500).send('Required field(s) not provided');
    }

    if (top && isNaN(top)) {
        res.status(500).send('Top parameter has to be a valid number between 0 and 10');
    }

    else {
        const userService = new UserService();
        userService.getUserByNamePrefix(prefix, top)
            .then(
                result =>
                res.status(200).json(result));
    }
}

module.exports = { listUserEmails, getRecentActivities, getRecentWorkspacesActivity, getRecentComments,
    listUsersByFullName };