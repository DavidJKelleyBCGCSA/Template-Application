const { Model } = require('sequelize');

class BaseModel extends Model {
    static initialize(sequelize) {
        // TODO: Implement in subclass
    }

    static associate(models) {
        // TODO: Implement in subclass
    }
}

module.exports = {
    BaseModel,
};
