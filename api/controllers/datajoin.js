const DataJoinService = require('../services/widget/dataJoinService');

function joinWidgets (req, res) {
    const workspaceId = parseInt(req.body.workspaceId, 10);
    const widgetInstanceId = parseInt(req.body.widgetInstanceId, 10);

    if (!workspaceId || !widgetInstanceId) {
        res.status(404).send('Required fields not supplied');
    }
    else {
        const dataJoinService = new DataJoinService(workspaceId, widgetInstanceId, req.user.id);
        dataJoinService.joinWidgets()
            .then(() => res.status(200).send())
            .catch(error => res.status(500).send(error.message));
    }
}

module.exports = { joinWidgets };