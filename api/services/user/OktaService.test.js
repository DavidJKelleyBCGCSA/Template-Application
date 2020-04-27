const assert = require('chai').assert;
const { initDb } = require('../../../test/init');

const IdentityService = require('./identityService');
const OktaService = require('./OktaService');

const identityService = new IdentityService();
const oktaService = new OktaService(identityService);

const OKTA_USER = {
    issuer: 'http://www.okta.com/xxxxxxxxxx',
    inResponseTo: '_xxxxxxxxxxxx',
    sessionIndex: '_xxxxxxxxxxxx',
    nameID: 'Elting.Brian@test.com',
    nameIDFormat: 'urn:oasis:names:tc:SAML:1.1:nameid-format:unspecified',
    nameQualifier: undefined,
    spNameQualifier: undefined,
    firstName: 'Brian',
    lastName: 'Elting',
    email: 'Elting.Brian@test.com'
};

const BCG_COMPANY = 'BCG';

describe('OktaService', function () {
    beforeEach(function(done) {
        initDb().then(() => done());
    });

    it('logs in', function(done) {
        oktaService.login(OKTA_USER)
            .then(({ token }) => {
                assert.isNotNull(token);
                done();
            })
            .catch(e => done(e));
    });

    it('registers', function(done) {
        oktaService.register(OKTA_USER)
            .then((user) => {
                assert.isNotNull(user);
                assert.equal(user.username, OKTA_USER.email);
                assert.equal(user.firstName, OKTA_USER.firstName);
                assert.equal(user.lastName, OKTA_USER.lastName);
                assert.equal(user.company, BCG_COMPANY);
                assert.equal(user.source, OKTA_USER.issuer);
                assert.equal(user.sourceUserId, OKTA_USER.nameID);
                done();
            })
            .catch(e => done(e));
    });
});