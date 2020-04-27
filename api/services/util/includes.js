const {WorkspaceMember, WidgetInstance, WorkspaceInvitation, Invitation, User, Activity,
    ModuleInstance, Workspace} = require('../../model');
const {ActivityType} = require('../../util/enums');

const workspaceMemberInclude = {
    model: WorkspaceMember,
    attributes: ['id', 'userId'],
    include: [
        {
            model: User,
            as: 'user',
            attributes: ['id', 'username', 'firstName', 'lastName', 'avatar', 'updatedAt'],
        }
    ]
};

const workspaceInvitationInclude = {
    model: WorkspaceInvitation,
    attributes: ['id', 'invitationId'],
    include: [
        {
            model: Invitation,
            as: 'invitation',
            attributes: ['id', 'email']
        }
    ]
};

const workspaceLight = {
    model: Workspace,
    attributes: ['id', 'title', 'number']
};

const moduleLight = {
    model: ModuleInstance,
    attributes: ['id', 'name']
};

const widgetLight = {
    model: WidgetInstance,
    attributes: ['id', 'title']
};

const userLight = {
    model: User,
    attributes: ['id', 'firstName', 'lastName', 'username', 'avatar', 'updatedAt'],
};

const workspaceOwnerInclude = {
    model: User,
    as: 'owner',
    attributes: ['id', 'firstName', 'lastName', 'username', 'avatar', 'updatedAt'],
};

const moduleWidgetsInclude = {
    model: WidgetInstance,
    required: false,
    where: {deletedAt: null},
};

const workspaceModulesInclude = {
    model: ModuleInstance,
    required: false,
    where: {deletedAt: null},
};

const widgetInputInclude = (inputId) => ({
    model: Activity,
    where: {type: ActivityType.CONNECTED_INPUT_WIDGET, 'data.input': inputId},
    include: [
        {
            model: User,
            as: 'user',
            attributes: ['id', 'username', 'firstName', 'lastName', 'updatedAt']
        }
    ],
    order: [['updatedAt', 'DESC']],
    limit: 1,
});

const widgetOutputInclude = (outputId) => ({
    model: Activity,
    where: {type: ActivityType.CONNECTED_OUTPUT_WIDGET, 'data.output': outputId},
    include: [
        {
            model: User,
            as: 'user',
            attributes: ['id', 'username', 'firstName', 'lastName', 'updatedAt']
        }
    ],
    order: [['updatedAt', 'DESC']],
    limit: 1,
});

module.exports = {workspaceMemberInclude, workspaceInvitationInclude, workspaceOwnerInclude, moduleWidgetsInclude,
    widgetOutputInclude, widgetInputInclude, workspaceModulesInclude, workspaceLight, moduleLight, widgetLight,
    userLight};