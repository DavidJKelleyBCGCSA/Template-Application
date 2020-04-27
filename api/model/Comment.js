const {DataTypes} = require("sequelize");

const { BaseModel } = require('./BaseModel');

const MODEL_NAME = 'comment';
const TABLE_NAME = 'comment';

/**
 * Represents a comment of a discussion in a specific widget, module or workspace.
 */
class Comment extends BaseModel {
    static initialize(sequelize) {
        Comment.init({
            id: {type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true},
            userId: {type: DataTypes.INTEGER, allowNull: false, comment: 'null for system notifications'},
            text: {type: DataTypes.STRING(1028), allowNull: false, comment: 'the message of this comment'},
            mentions: { type: DataTypes.JSONB, allowNull: true, comment: 'ids of users mentioned in this comment',
                default: []},

            // 'widget', 'module' or 'workspace' give us different granularities.
            // This current way is more easier for making queries.
            widgetInstanceId: {type: DataTypes.INTEGER, allowNull: true},
            moduleInstanceId: {type: DataTypes.INTEGER, allowNull: true},
            workspaceId: {type: DataTypes.INTEGER, allowNull: true},
        }, {
            sequelize,
            modelName: MODEL_NAME,
            tableName: TABLE_NAME,
        });
    }

    static associate(models) {
        Comment.belongsTo(models.User);
        Comment.belongsTo(models.Workspace);
        Comment.belongsTo(models.ModuleInstance);
        Comment.belongsTo(models.WidgetInstance);
    }
}

module.exports = {
    Comment,
    TABLE_NAME,
};
