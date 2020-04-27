const {DataTypes} = require('sequelize');

module.exports = {
  up: async (queryInterface) => {

    await queryInterface.addColumn(
      'workspace',
      'parameters',
      {type: DataTypes.JSONB, allowNull: true, defaultValue: {}, comment: 'additional data for this workspace'}
    );
  },

  down: async (queryInterface,) => {
    await queryInterface.removeColumn('workspace', 'parameters');
  }
};