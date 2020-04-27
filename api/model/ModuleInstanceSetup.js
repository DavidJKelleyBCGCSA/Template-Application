const {DataTypes} = require("sequelize");

const { BaseModel } = require('./BaseModel');

const MODEL_NAME = 'moduleInstanceSetup';
const TABLE_NAME = 'module_instance_setup';

/**
 * Setup component for a module instance
 */
class ModuleInstanceSetup extends BaseModel {
    static initialize(sequelize) {
        ModuleInstanceSetup.init({
            id: {type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true},
            appId: {type: DataTypes.INTEGER, allowNull: true, comment: 'App id where this Setup tabs are hosted'},
            moduleInstanceId: {type: DataTypes.INTEGER, allowNull: false},
            version: {type: DataTypes.INTEGER, allowNull: false, default: 1},
            isCompleted: {type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, comment: "the setup compute was run?"},
            parameters: {type: DataTypes.JSONB, allowNull: false, defaultValue: {}, comment: 'Setup parameters'},
            config: {type: DataTypes.JSONB, allowNull: false, defaultValue: {}, comment: 'Setup configuration'},
            tabs: {type: DataTypes.JSONB, allowNull: false, defaultValue: [],
                comment: 'JSON array of SetupTabs contained in this setup'},
            progress: {type: DataTypes.INTEGER, defaultValue: 0, allowNull: false, comment: 'The progress of this setup'},
        }, {
            indexes: [
                { unique: true, fields: ['moduleInstanceId'] }
            ],
            sequelize,
            modelName: MODEL_NAME,
            tableName: TABLE_NAME,
        });
    }

    static associate(models) {
        ModuleInstanceSetup.belongsTo(models.ModuleInstance);
        ModuleInstanceSetup.belongsTo(models.App);
    }
}

module.exports = {
    ModuleInstanceSetup,
    TABLE_NAME,
};
