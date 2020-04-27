const { config } = require('../config');

const ENVIRONMENT_KEY = 'ENVIRONMENT';

module.exports = {
  up: async (queryInterface) => {

    await queryInterface.bulkInsert('app', [{
      slug: 'Thanos',
      name: 'Thanos Core',
      description: 'Thanos Core App',
      environment: config.get(ENVIRONMENT_KEY),
      version: 1,
      primitive: true,
      created_at: new Date(),
      updated_at: new Date(),
    }]);

  },

  down: async (queryInterface) => {
    await queryInterface.bulkDelete('app', {
      id: 1,
    });
  }
};
