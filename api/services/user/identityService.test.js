const assert = require('chai').assert;
const { initDb } = require('../../../test/init');

const IdentityService = require('./identityService');
const identityService = new IdentityService();

describe('IdentityService', function () {
    before(function(done) {
        initDb().then(() => done());
    });

    it('logs in', function(done) {
        identityService.login('kropp.matthew@test.com', 'notsafeforpassword')
            .then(({ token }) => {
                assert.isNotNull(token);
                done();
            })
            .catch(e => done(e));
    });

    it('registers', function(done) {
        identityService.register('john.doe@test.com', 'notsafeforpassword', 'John', 'Doe', 'BCG')
            .then(({token}) => {
                assert.isNotNull(token);
                done();
            })
            .catch(e => done(e));
    });

    it('identifies user', function(done) {
        identityService.login('kropp.matthew@test.com', 'notsafeforpassword')
            .then(({ token }) => {
                identityService.identify(token)
                    .then(user => {
                        assert.equal(user.firstName, 'Matt');
                        done();
                    })
                    .catch(e => done(e));
            })
            .catch(e => done(e));
    });

    it('generate jwt token', function(done) {
        const token = identityService.generateToken({ id: 1}, 'secret');
        assert.typeOf(token, 'string');
        done();
    });

    it('validate jwt token', function(done) {
        const token = identityService.generateToken({ id: 1}, 'secret');
        identityService.validateToken(token, 'secret').then((decoded) => {
            assert.equal(decoded.id, 1);
            done();
        }).catch(e => done(e));
    });
});