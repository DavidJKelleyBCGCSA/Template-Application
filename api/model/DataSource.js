const {DataTypes} = require("sequelize");

const { BaseModel } = require('./BaseModel');
const { DataSourceType } = require('../util/enums');

const MODEL_NAME = 'dataSource';
const TABLE_NAME = 'data_source';

/**
 * Maintains record of all external datasources added to platform (including files, db connections, twitter feeds, etc.)
 */
class DataSource extends BaseModel {
    static initialize(sequelize) {
        DataSource.init({
            id: {type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true},
            widgetInstanceId: {type: DataTypes.INTEGER, allowNull: false},
            version: {type: DataTypes.INTEGER, allowNull: false},
            type: {type: DataTypes.ENUM(Object.values(DataSourceType)), allowNull: false},
            schema: {type: DataTypes.JSONB, defaultValue: {}},
            metadata: {type: DataTypes.JSONB, defaultValue: {}},
            sourceLocation: {type: DataTypes.STRING, allowNull: false},
            filename: {type: DataTypes.STRING, allowNull: false},
            tabName: {type: DataTypes.STRING, allowNull: true},
            fileIdHash: {type: DataTypes.STRING, allowNull: false},
            size: {type: DataTypes.INTEGER, allowNull: true},
            status: {type: DataTypes.ENUM('PENDING', 'READY', 'ERROR'), allowNull: false},
            uploadedBy: {type: DataTypes.INTEGER, allowNull: false},
        }, {
            indexes: [
                {unique: true, fields: ['widgetInstanceId', 'version']},
                {unique: false, fields: ['widgetInstanceId']},
            ],
            sequelize,
            modelName: MODEL_NAME,
            tableName: TABLE_NAME,
        });
    }

    static associate(models) {
        DataSource.belongsTo(models.WidgetInstance, {onDelete: 'CASCADE'});
        DataSource.belongsTo(models.User, {foreignKey: 'uploadedBy', targetKey: 'id', onDelete: 'SET NULL'});
    }
}

module.exports = {
    DataSource,
    TABLE_NAME,
};
