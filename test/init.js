const { seedDb } = require('./seedDb');
const { Database } = require('../api/db/Database');

const initDb = async () => {
    const database = new Database();
    await database.getConnection().getQueryInterface().dropAllTables();
    await database.getConnection().getQueryInterface().dropAllEnums();
    await database.migrate();
    database.initializeModels();

    await seedDb();
};

module.exports = {
    initDb,
};
