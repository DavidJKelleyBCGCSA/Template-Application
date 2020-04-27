const {DataTypes} = require("sequelize");
const crypto = require('crypto');

const { BaseModel } = require('./BaseModel');

const MODEL_NAME = 'widgetInstance';
const TABLE_NAME = 'widget_instance';

/**
 * Instance of a componentClass active in a Module
 */
class WidgetInstance extends BaseModel {
    static initialize(sequelize) {
        WidgetInstance.init({
            id: {type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true},
            widgetClassId: {type: DataTypes.INTEGER, allowNull: false, comment: 'FK to widgetClass'},
            moduleInstanceId: {type: DataTypes.INTEGER, allowNull: false, comment: 'FK to moduleInstance'},
            title: {type: DataTypes.STRING, allowNull: false},
            description: {type: DataTypes.STRING},
            ownerId: {type: DataTypes.INTEGER, allowNull: false},
            parameters: {type: DataTypes.JSONB, allowNull: true},
            operations: {type: DataTypes.JSONB, allowNull: true, defaultValue: {}},
            output: {type: DataTypes.JSONB, allowNull: true, defaultValue: {}},
            config: {type: DataTypes.JSONB, allowNull: true, comment: 'Configuration for this widget instance'},
            schema: {type: DataTypes.JSONB, allowNull: true, defaultValue:
                    {"inputSchema": [{"columns": [], "inheritSchema": true }], "outputSchema": []}},
            deletedAt: {type: DataTypes.DATE, allowNull: true, defaultValue: null},
            strictEditMode: {type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true,
                comment: 'if this widget edition should be restricted'},
            slug: {type: DataTypes.STRING, allowNull: true},
        }, {
            getterMethods: {
                hashId() {
                    const hash = crypto.createHash('sha1');
                    hash.update(`${this.id}:${this.createdAt}`);
                    return hash.digest('hex');
                }
            },
            sequelize,
            modelName: MODEL_NAME,
            tableName: TABLE_NAME,
        });
    }

    static associate(models) {
        WidgetInstance.belongsTo(models.WidgetClass);
        WidgetInstance.belongsTo(models.ModuleInstance);
        WidgetInstance.hasMany(models.WidgetRelation, {foreignKey: 'fromWidgetInstanceId', as: 'fromInstance'});
        WidgetInstance.hasMany(models.WidgetRelation, {foreignKey: 'toWidgetInstanceId', as: 'toInstance'});
        WidgetInstance.hasMany(models.DataSource);
        WidgetInstance.belongsTo(models.User, {foreignKey: 'ownerId', targetKey: 'id', as: 'owner'});
        WidgetInstance.hasMany(models.Activity);
        WidgetInstance.hasMany(models.Comment);
    }
}

module.exports = {
    WidgetInstance,
    TABLE_NAME,
};
