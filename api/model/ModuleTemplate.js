const {DataTypes} = require("sequelize");

const { BaseModel } = require('./BaseModel');

const MODEL_NAME = 'moduleTemplate';
const TABLE_NAME = 'module_template';

/**
 * Reusable template to instantiate a module
 */
class ModuleTemplate extends BaseModel {
    static initialize(sequelize) {
        ModuleTemplate.init({
            id: {type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true},
            type: {type: DataTypes.STRING, allowNull: false, defaultValue: 'USER'},
            name: {type: DataTypes.STRING, allowNull: false},
            description: {type: DataTypes.STRING},
            widgets: {
                type: DataTypes.JSONB,
                comment: 'JSON array of widgetClasses contained in this template'
            },
            setup: {
                type: DataTypes.JSONB,
                comment: 'JSON with setup information {active, version, tabs, config, parameters}',
                defaultValue: {active: false}
            },
            run: {
                type: DataTypes.JSONB,
                comment: 'JSON with run information {active, version, tabs}',
                defaultValue: {active: false}
            },
            config: {type: DataTypes.JSONB, comment: 'Specification for component UI and connections'},
        }, {
            sequelize,
            modelName: MODEL_NAME,
            tableName: TABLE_NAME,
        });
    }

    static associate(models) {

    }
}

module.exports = {
    ModuleTemplate,
    TABLE_NAME,
};
