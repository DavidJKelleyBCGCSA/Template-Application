const {DataTypes} = require("sequelize");

const { BaseModel } = require('./BaseModel');

const MODEL_NAME = 'moduleInstance';
const TABLE_NAME = 'module_instance';

/**
 * Group of components aligned a module of work
 */
class ModuleInstance extends BaseModel {
    static initialize(sequelize) {
        ModuleInstance.init({
            id: {type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true},
            name: {type: DataTypes.STRING, allowNull: false, comment: 'Display name of Module'},
            description: {type: DataTypes.STRING},
            ownerId: {type: DataTypes.INTEGER, allowNull: false, comment: 'Module owner id'},
            workspaceId: {type: DataTypes.INTEGER, allowNull: false, comment: 'FK to workspace'},
            config: {type: DataTypes.JSONB, allowNull: true, comment: 'Configuration copied from moduleTemplate'},
            deletedAt: {type: DataTypes.DATE, allowNull: true, defaultValue: null},
            strictEditMode: {type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true,
                comment: 'if this module edition should be restricted'},
        }, {
            sequelize,
            modelName: MODEL_NAME,
            tableName: TABLE_NAME,
        });
    }

    static associate(models) {
        ModuleInstance.hasMany(models.WidgetInstance);
        ModuleInstance.belongsTo(models.Workspace);
        ModuleInstance.belongsTo(models.User, {foreignKey: 'ownerId', targetKey: 'id', as: 'owner'});
        ModuleInstance.hasMany(models.Activity);
        ModuleInstance.hasMany(models.Comment);
        ModuleInstance.hasOne(models.ModuleInstanceSetup);
        ModuleInstance.hasOne(models.ModuleInstanceRun);
    }
}

module.exports = {
    ModuleInstance,
    TABLE_NAME,
};
