module.exports = {
  up: async (queryInterface) => {
    await queryInterface.sequelize.query("ALTER TYPE enum_activity_type ADD VALUE 'WIDGET_INPUT_SCHEMA_CHANGED';");

  },
  down: async (queryInterface) => {
    await queryInterface.sequelize.query(`
      DELETE FROM pg_enum
      WHERE enumlabel = 'WIDGET_INPUT_SCHEMA_CHANGED'
      AND enumtypid = ( SELECT pid FROM pg_type WHERE typname = 'enum_activity_type');
    `);
  }
};