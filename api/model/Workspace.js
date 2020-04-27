const {DataTypes} = require("sequelize");

const { BaseModel } = require('./BaseModel');
const {WorkspaceStatus} = require('../util/enums');

const MODEL_NAME = 'workspace';
const TABLE_NAME = 'workspace';

/**
 * Top-level container aggregating a team and modules aligned to a case
 */
class Workspace extends BaseModel {
    static initialize(sequelize) {
        Workspace.init({
            id: {type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true},
            title: {type: DataTypes.STRING, allowNull: false},
            number: {type: DataTypes.STRING, allowNull: false},
            description: {type: DataTypes.STRING},
            ownerId: {type: DataTypes.INTEGER, allowNull: false},
            environment: {type: DataTypes.STRING, allowNull: false},
            version: {type: DataTypes.INTEGER, allowNull: false, defaultValue: 1},
            status: {type: DataTypes.ENUM(Object.values(WorkspaceStatus)), allowNull: false,
                defaultValue: WorkspaceStatus.OPEN},
            warehouseAccountId: {type: DataTypes.INTEGER, allowNull: false},
            deletedAt: {type: DataTypes.DATE, allowNull: true, defaultValue: null},
            strictEditMode: {type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true,
                comment: 'if this workspace edition should be restricted'},
            parameters: {type: DataTypes.JSONB, allowNull: true, defaultValue: {},
                comment: 'additional data for this workspace'},
        }, {
            getterMethods: {
                warehouseName() {
                    return `${this.id}:${this.number}`;
                }
            },
            sequelize,
            modelName: MODEL_NAME,
            tableName: TABLE_NAME,
        });
    }

    static associate(models) {
        Workspace.hasMany(models.ModuleInstance);
        Workspace.hasMany(models.WorkspaceMember);
        Workspace.belongsTo(models.User, {foreignKey: 'ownerId', targetKey: 'id', as: 'owner'});
        Workspace.hasMany(models.WorkspaceInvitation);
        Workspace.belongsTo(models.WarehouseAccount);
        Workspace.hasMany(models.Activity);
        Workspace.hasMany(models.Comment);

    }
}

module.exports = {
    Workspace,
    TABLE_NAME,
};