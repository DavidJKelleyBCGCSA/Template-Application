const assert = require('chai').assert;
const { initDb } = require('../../test/init');

const filters = require('../filters');

const IdentityService = require('../services/user/identityService');
const identityService = new IdentityService();

describe('Filter', function () {

    before(function(done) {
        initDb().then(() => done())
            .catch(error => console.error(error));
    });

    it('Should return user data from a valid token', function(done) {
        identityService.register('testuser@test.com', 'notsafeforpassword', 'test', 'user', 'bcg')
        .then(({token}) => {
            const req = {
                originalUrl: '/api/someendpoint',
                headers: {
                    authorization: 'Bearer ' + token
                }
            };

            const resp = {
                sendStatus: () => {
                    assert.fail();
                    done();
                }
            };
            const next = () => {
                assert.isNotNull(req.user);
                assert.equal(req.user.username, 'testuser@test.com');
                done();
            };

            filters.VerifyToken(req, resp, next);

        })
        .catch(e => done(e));
    });

    it('Should allow public access', function(done) {

        const req = {
            originalUrl: '/api/identity/xxx',
        };

        const resp = {
            sendStatus: () => {
                assert.fail();
                done();
            }
        };
        const next = () => {
            done();
        };

        filters.VerifyToken(req, resp, next);
    });

    it('Should reject an unauthorized token', function(done) {
        const token = 'nonexistingtoken';
        const req = {
            originalUrl: '/api/someendpoint',
            headers: {
                authorization: 'Bearer ' + token
            }
        };

        const resp = {
            status: (num) => {
                this.num = num;
                return {
                    send: () => {
                        assert.equal(this.num, 403);
                        done();
                    },
                };
            },
            sendStatus: (num) => {
               assert.equal(num, 403);
               done();
            }
        };
        const next = () => {
            assert.fail();
            done();
        };

        filters.VerifyToken(req, resp, next);

    });
});