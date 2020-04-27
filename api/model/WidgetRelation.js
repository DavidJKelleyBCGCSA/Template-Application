const {DataTypes} = require("sequelize");

const { BaseModel } = require('./BaseModel');

const MODEL_NAME = 'widgetRelation';
const TABLE_NAME = 'widget_relation';

/**
 * Specifies input/output link between widgets
 */
class WidgetRelation extends BaseModel {
    static initialize(sequelize) {
        WidgetRelation.init({
            id: {type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true},
            fromWidgetInstanceId: {type: DataTypes.INTEGER, allowNull: false},
            toWidgetInstanceId: {type: DataTypes.INTEGER, allowNull: false},
        }, {
            indexes: [
                {unique: true, fields: ['fromWidgetInstanceId','toWidgetInstanceId']},
            ],
            sequelize,
            modelName: MODEL_NAME,
            tableName: TABLE_NAME,
        });
    }

    static associate(models) {
        WidgetRelation.belongsTo(models.WidgetInstance, {foreignKey: 'fromWidgetInstanceId', as: 'fromInstance'});
        WidgetRelation.belongsTo(models.WidgetInstance, {foreignKey: 'toWidgetInstanceId', as: 'toInstance'});
    }
}

module.exports = {
    WidgetRelation,
    TABLE_NAME,
};
