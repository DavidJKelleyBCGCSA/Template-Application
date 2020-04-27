const bcrypt = require('bcrypt');

module.exports = {
  up: async (queryInterface) => {
    const key = await bcrypt.hash('0123456789', 10);

    await queryInterface.bulkInsert('dev_account', [{
      handle: 'testing-handle',
      key,
      allow_create_primitives: true,
      created_at: new Date(),
      updated_at: new Date(),
    }]);
  },

  down: async (queryInterface) => {
    await queryInterface.bulkDelete('dev_account', {
      id: 1,
    });
  }
};
