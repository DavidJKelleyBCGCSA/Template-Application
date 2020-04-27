const {DataTypes} = require("sequelize");

const { BaseModel } = require('./BaseModel');

const MODEL_NAME = 'user';
const TABLE_NAME = 'user';

/**
 * Represents user in workbench
 */
class User extends BaseModel {
    static initialize(sequelize) {
        User.init({
            id: {type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true},
            username: {type: DataTypes.STRING, allowNull: false},
            firstName: {type: DataTypes.STRING, allowNull: true},
            lastName: {type: DataTypes.STRING, allowNull: true},
            company: {type: DataTypes.STRING, allowNull: true},
            hashedPassword: {type: DataTypes.STRING, allowNull: true},
            token: {type: DataTypes.STRING, allowNull: true},
            activated: {type: DataTypes.BOOLEAN, defaultValue: false},
            avatar: {type: DataTypes.STRING, allowNull: true},
            source: {type: DataTypes.STRING, allowNull: true},
            sourceUserId: {type: DataTypes.STRING, allowNull: true},
        }, {
            indexes: [
                { unique: true, fields: ['username'] },
                { unique: true, fields: ['token'] },
            ],
            sequelize,
            modelName: MODEL_NAME,
            tableName: TABLE_NAME,
        });
    }

    static associate(models) {
        User.hasMany(models.DataSource, {foreignKey: 'uploadedBy'});
        User.hasMany(models.Workspace, {foreignKey: 'ownerId'});
        User.hasMany(models.WorkspaceMember);
        User.hasMany(models.WidgetInstance, {foreignKey: 'ownerId'});
        User.hasMany(models.ModuleInstance, {foreignKey: 'ownerId'});
        User.hasMany(models.Activity);
        User.hasMany(models.Comment);
    }
}

module.exports = {
    User,
    TABLE_NAME,
};
