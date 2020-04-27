const {DataTypes} = require("sequelize");

const { BaseModel } = require('./BaseModel');

const MODEL_NAME = 'invitation';
const TABLE_NAME = 'invitation';

/**
 * Represents an unregistered member invited to join the app
 */
class Invitation extends BaseModel {
    static initialize(sequelize) {
        Invitation.init({
            id: {type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true},
            email: {type: DataTypes.STRING, allowNull: false},
            active: {type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true},
        }, {
            indexes: [
                { unique: true, fields: ['email'] },
            ],
            sequelize,
            modelName: MODEL_NAME,
            tableName: TABLE_NAME,
        });
    }

    static associate(models) {
        Invitation.hasMany(models.WorkspaceInvitation);
    }
}

module.exports = {
    Invitation,
    TABLE_NAME,
};
