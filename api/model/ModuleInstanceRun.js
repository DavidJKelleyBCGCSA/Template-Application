const {DataTypes} = require("sequelize");

const { BaseModel } = require('./BaseModel');

const MODEL_NAME = 'moduleInstanceRun';
const TABLE_NAME = 'module_instance_run';

/**
 * Run component for a module instance
 */
class ModuleInstanceRun extends BaseModel {
    static initialize(sequelize) {
        ModuleInstanceRun.init({
            id: {type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true},
            appId: {type: DataTypes.INTEGER, allowNull: true, comment: 'App id where this Run tabs are hosted'},
            moduleInstanceId: {type: DataTypes.INTEGER, allowNull: false},
            config: {type: DataTypes.JSONB, allowNull: false, defaultValue: {}, comment: 'Run configuration'},
            tabs: {type: DataTypes.JSONB, allowNull: false, defaultValue: [],
                comment: 'JSON array of Run tabs contained'},
            progress: {type: DataTypes.INTEGER, defaultValue: 0, allowNull: false, comment: 'The progress of this Run'},
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
        ModuleInstanceRun.belongsTo(models.ModuleInstance);
        ModuleInstanceRun.belongsTo(models.App);
    }
}

module.exports = {
    ModuleInstanceRun,
    TABLE_NAME,
};
