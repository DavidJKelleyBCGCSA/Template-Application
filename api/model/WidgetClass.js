const {DataTypes} = require("sequelize");

const { BaseModel } = require('./BaseModel');

const MODEL_NAME = 'widgetClass';
const TABLE_NAME = 'widget_class';

/**
 * Uninstantiated template for a component
 */
class WidgetClass extends BaseModel {
    static initialize(sequelize) {
        WidgetClass.init({
            id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
            appId: { type: DataTypes.INTEGER, allowNull: true, comment: 'WidgetClass id where this widget class belongs to' },
            name: { type: DataTypes.STRING, allowNull: false, comment: 'User friendly widget name' },
            type: { type: DataTypes.STRING, allowNull: false, comment: 'Canonical type of widget' },
            connectionType: {type: DataTypes.ENUM('INPUT', 'OUTPUT', 'BOTH'), allowNull: false, defaultValue: 'BOTH',
                comment: 'This Widget can be connected as input, output or both?'},
            description: { type: DataTypes.STRING, allowNull: true },
            version: { type: DataTypes.INTEGER, allowNull: false, comment: 'Incrementing version number' },
            environment: {
                type: DataTypes.STRING,
                allowNull: false,
                comment: 'Target environment'
            },
            primitive: { type: DataTypes.BOOLEAN, allowNull: true, comment: 'Is this a core Widget Class ?' },
            tabs: { type: DataTypes.JSONB, allowNull: false, comment: 'Specification for subnav tabs to show on widget' },
            config: { type: DataTypes.JSONB, allowNull: false, comment: 'Specification for component UI and connections' },
            parameters: { type: DataTypes.JSONB, allowNull: false, comment: 'Array of parameters used in widgetClass' },
        }, {
            sequelize,
            modelName: MODEL_NAME,
            tableName: TABLE_NAME,
        });
    }

    static associate(models) {
        WidgetClass.hasMany(models.WidgetInstance);
        WidgetClass.belongsTo(models.App);
    }
}

module.exports = {
    WidgetClass,
    TABLE_NAME,
};
