const { config } = require('../config');

const SNOWFLAKE_ACCOUNT_KEY = 'SNOWFLAKE_ACCOUNT';
const SNOWFLAKE_USERNAME_KEY = 'SNOWFLAKE_USERNAME';
const SNOWFLAKE_PASSWORD_KEY = 'SNOWFLAKE_PASSWORD';

module.exports = {
  up: async (queryInterface) => {
    if (!config.hasAll([SNOWFLAKE_ACCOUNT_KEY, SNOWFLAKE_USERNAME_KEY, SNOWFLAKE_PASSWORD_KEY])) {
      throw new Error('Config must have SNOWFLAKE_ACCOUNT, SNOWFLAKE_USERNAME and SNOWFLAKE_PASSWORD');
    }

    await queryInterface.bulkInsert('warehouse_account', [{
      account: config.get(SNOWFLAKE_ACCOUNT_KEY),
      username: config.get(SNOWFLAKE_USERNAME_KEY),
      password: config.get(SNOWFLAKE_PASSWORD_KEY),
      created_at: new Date(),
      updated_at: new Date(),
    }]);
  },

  down: async (queryInterface) => {
    await queryInterface.bulkDelete('warehouse_account', {
      id: 1,
    });
  }
};
