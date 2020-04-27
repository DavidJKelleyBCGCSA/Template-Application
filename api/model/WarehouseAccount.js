const {DataTypes} = require("sequelize");

const { BaseModel } = require('./BaseModel');

const MODEL_NAME = 'warehouseAccount';
const TABLE_NAME = 'warehouse_account';

/**
 * Encapsulates cloud data warehouse account information (currently for Snowflake)
 */
class WarehouseAccount extends BaseModel {
    static initialize(sequelize) {
        WarehouseAccount.init({
            id: {type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true},
            account: {type: DataTypes.STRING, allowNull: false},
            username: {type: DataTypes.STRING, allowNull: false},
            password: {type: DataTypes.STRING, allowNull: false},
        }, {
            sequelize,
            modelName: MODEL_NAME,
            tableName: TABLE_NAME,
        });
    }

    static associate(models) {
        WarehouseAccount.hasMany(models.Workspace);
    }
}

module.exports = {
    WarehouseAccount,
};
