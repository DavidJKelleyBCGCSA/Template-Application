const {DataTypes} = require("sequelize");

const { BaseModel } = require('./BaseModel');
const {ActivityType} = require('../util/enums');

const MODEL_NAME = 'activity';
const TABLE_NAME = 'activity';

/**
 * Represents an activity in of a user in a specific widget, module or workspace
 */
class Activity extends BaseModel {
    static initialize(sequelize) {
        Activity.init({
            id: {type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true},
            userId: {type: DataTypes.INTEGER, allowNull: true, comment: 'null for system notifications'},
            data: { type: DataTypes.JSONB, allowNull: true, comment:
                    'This may contain additional data in a key,value format'},
            type: { type: DataTypes.ENUM(Object.values(ActivityType)), allowNull: false, comment:
                    'The activity type'},

            // Next attributes may be changed with just one ID attribute with another objectType attribute of 'widget',
            // 'module' or 'workspace' so we can register activities with different granularities.
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
        Activity.belongsTo(models.User);
        Activity.belongsTo(models.Workspace);
        Activity.belongsTo(models.ModuleInstance);
        Activity.belongsTo(models.WidgetInstance);
    }
}

module.exports = {
    Activity,
};
