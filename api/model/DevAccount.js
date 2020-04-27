const {DataTypes} = require("sequelize");

const { BaseModel } = require('./BaseModel');

const MODEL_NAME = 'devAccount';
const TABLE_NAME = 'dev_account';

/**
 * Dev account
 */
class DevAccount extends BaseModel {
    static initialize(sequelize) {
        DevAccount.init({
            id: {type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true},
            handle: {type: DataTypes.STRING, allowNull: false},
            key: {type: DataTypes.STRING, allowNull: false},
            allowCreatePrimitives: {type: DataTypes.BOOLEAN, allowNull: true, comment: 'This dev can create primitives?'},
        }, {
            sequelize,
            modelName: MODEL_NAME,
            tableName: TABLE_NAME,
        });
    }

    static associate(models) {
        DevAccount.hasMany(models.App);
    }
}

module.exports = {
    DevAccount,
    TABLE_NAME,
};
