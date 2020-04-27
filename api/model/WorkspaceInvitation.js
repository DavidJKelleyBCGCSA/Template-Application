const {DataTypes} = require("sequelize");

const { BaseModel } = require('./BaseModel');

const MODEL_NAME = 'workspaceInvitation';
const TABLE_NAME = 'workspace_invitation';

/**
 * Represents an unregistered member invited to join a workspace
 */
class WorkspaceInvitation extends BaseModel {
    static initialize(sequelize) {
        WorkspaceInvitation.init({
            id: {type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true},
            invitationId: {type: DataTypes.INTEGER, allowNull: false},
            workspaceId: {type: DataTypes.INTEGER, allowNull: false},
        }, {
            indexes: [
                { unique: true, fields: ['invitationId', 'workspaceId'] },
            ],
            sequelize,
            modelName: MODEL_NAME,
            tableName: TABLE_NAME,
        });
    }

    static associate(models) {
        WorkspaceInvitation.belongsTo(models.Workspace);
        WorkspaceInvitation.belongsTo(models.Invitation);
    }
}

module.exports = {
    WorkspaceInvitation,
    TABLE_NAME,
};
