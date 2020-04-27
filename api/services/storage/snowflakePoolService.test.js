
const assert = require('chai').assert;
const { initDb } = require('../../../test/init');
const snowflakePoolService = require('../storage/snowflakePoolService');

const workspaceId = 1;

describe('Snowflakes pool Service', function () {
    before(function(done) {
        this.timeout(30000);
        initDb()
            .then(() => done())
            .catch(e => done(e));
    });


    it('should open a connection with snowflakes and return the connection object', function(done) {
        this.timeout(20000);

        snowflakePoolService.getConnectionPool(workspaceId)
            .then(response => {
                assert.exists(response);
                assert.isObject(response);
                assert.equal(Object.keys(response).length, 3);
                done();
            })
            .catch(e => done(e));
    });
});