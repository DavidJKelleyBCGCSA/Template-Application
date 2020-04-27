const {DataTypes} = require("sequelize");

const { BaseModel } = require('./BaseModel');

const MODEL_NAME = 'workspaceMember';
const TABLE_NAME = 'workspace_member';

/**
 * Associates user members to workspace
 */
class WorkspaceMember extends BaseModel {
    static initialize(sequelize) {
        WorkspaceMember.init({
            id: {type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true},
            workspaceId: {type: DataTypes.INTEGER, allowNull: false},
            userId: {type: DataTypes.INTEGER, allowNull: false},
        }, {
            indexes: [
                { unique: true, fields: ['userId', 'workspaceId'] },
            ],
            sequelize,
            modelName: MODEL_NAME,
            tableName: TABLE_NAME,
        });
    }

    static associate(models) {
        WorkspaceMember.belongsTo(models.Workspace);
        WorkspaceMember.belongsTo(models.User);
    }
}

module.exports = {
    WorkspaceMember,
    TABLE_NAME,
};
