const {Comment, User} = require('../../model');
const {userLight, widgetLight, moduleLight, workspaceLight} = require('../util/includes');

class DiscussionService {

    addComment(userId, text, workspaceId, moduleInstanceId, widgetInstanceId) {

            // get now the mentions so we make easier the queries later
            // reg expression that looks for $user_id$ which represents the user ids (i.e Hey $34$, nice to meet you !)
            const regExpression = /\B\$\w+\$/gu;
            const matches = text.match(regExpression);
            const mentions = [];
            if (matches && matches.length > 0) {
            matches.forEach(match => {
                // remove $ prefix and $ suffix
                mentions.push(match.slice(1, -1));
            });
            }

            return Comment.create({userId, text, mentions, workspaceId, moduleInstanceId, widgetInstanceId});
    }


    listCommentsByWidget(widgetInstanceId, limit) {
        const conditionalData = limit ? {limit} : {};
        return Comment.findAll({
            where: {widgetInstanceId},
            include: [userLight, widgetLight],
            order: [['createdAt', 'DESC']],
            ...conditionalData
        });
    }

    listCommentsByModule(moduleInstanceId, deepMode = true, limit) {
        const conditionalData = limit ? {limit} : {};
        return Comment.findAll({
            where: deepMode ? {moduleInstanceId} : {moduleInstanceId, widgetInstanceId: null},
            include: [userLight, widgetLight, moduleLight],
            order: [['createdAt', 'DESC']],
            ...conditionalData
        });
    }

    listCommentsByWorkspace(workspaceId, deepMode = true, limit) {
        const conditionalData = limit ? {limit} : {};
        return Comment.findAll({
            where: deepMode ? {workspaceId} : {workspaceId, moduleInstanceId: null, widgetInstanceId: null},
            include: [userLight, widgetLight, moduleLight, workspaceLight],
            order: [['createdAt', 'DESC']],
            ...conditionalData
        });
    }

    listCommentsByWorkspaces(workspaceIds, deepMode = true, limit = 10) {
        const conditionalData = {};
        if (limit) conditionalData.limit = limit > 10 ? 10 : limit;

        return Comment.findAll({
            where: deepMode ? {workspaceId: workspaceIds} : {workspaceId: workspaceIds,
                moduleInstanceId: null, widgetInstanceId: null},
            include: [userLight, widgetLight, moduleLight, workspaceLight],
            order: [['createdAt', 'DESC']],
            ...conditionalData
        });
    }

    populateComment(comment) {
        if (comment.mentions && comment.mentions.length > 0) {
             return User.findAll({
                attributes: userLight.attributes,
                where: {id: comment.mentions}
            })
            .then(users => {
                comment.mentions = users;
                return Promise.resolve(comment);
            });
        }
        return Promise.resolve(comment);
    }
}

module.exports = DiscussionService;