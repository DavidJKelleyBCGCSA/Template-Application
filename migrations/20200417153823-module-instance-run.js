const {DataTypes} = require('sequelize');

module.exports = {
  up: async (queryInterface) => {

    await queryInterface.createTable('module_instance_run', {
      id: {type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true},
      app_id: {
          type: DataTypes.INTEGER,
          allowNull: true,
          references: {
              model: 'app',
              key: 'id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
          comment: 'App id where this Run tabs are hosted'
      },
      module_instance_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: {
              model: 'module_instance',
              key: 'id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
      },
      config: {type: DataTypes.JSONB, allowNull: false, defaultValue: {}, comment: 'Run configuration'},
      tabs: {
          type: DataTypes.JSONB, allowNull: false, defaultValue: [],
          comment: 'JSON array of Run tabs contained'
      },
      progress: {
          type: DataTypes.INTEGER,
          defaultValue: 0,
          allowNull: false,
          comment: 'The progress of this Run'
      },
      created_at: {type: DataTypes.DATE, allowNull: false},
      updated_at: {type: DataTypes.DATE, allowNull: false},
    });

    queryInterface.addColumn('module_template', 'run', {
      type: DataTypes.JSONB,
      comment: 'JSON with run information {active, version, tabs}',
      defaultValue: {active: false}
    });

  },

  down: async (queryInterface) => {
    
    await queryInterface.dropTable('module_instance_run', { force: true });

  }
};
