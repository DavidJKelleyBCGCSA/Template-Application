const {DataTypes} = require("sequelize");

const { BaseModel } = require('./BaseModel');

const MODEL_NAME = 'app';
const TABLE_NAME = 'app';

/**
 * App displayed in App Store
 */
class App extends BaseModel {
    static initialize(sequelize) {
        App.init({
            id: {type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true},
            slug: {type: DataTypes.STRING, allowNull: false, comment: 'Unique in within account; letters, numbers, dashes'},
            version: {type: DataTypes.INTEGER, allowNull: false},
            name: {type: DataTypes.STRING, allowNull: false},
            environment: {type: DataTypes.STRING, allowNull: false},
            description: {type: DataTypes.STRING},
            moduleTemplateId: {type: DataTypes.INTEGER, allowNull: true},
            parameters: {type: DataTypes.JSONB, allowNull: true},
            primitive: {type: DataTypes.BOOLEAN, allowNull: true, comment: 'Is this a core app?'},
        }, {
            sequelize,
            modelName: MODEL_NAME,
            tableName: TABLE_NAME,
        });
    }

    static associate(models) {
        App.belongsTo(models.ModuleTemplate);
        App.belongsTo(models.DevAccount);
        App.hasMany(models.WidgetClass);
        App.hasMany(models.ModuleInstanceSetup);
    }
}

module.exports = {
    App,
    TABLE_NAME,
};
