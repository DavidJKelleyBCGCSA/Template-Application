const assert = require('chai').assert;
const { initDb } = require('../../../test/init');
const TableauService = require('./tableauService');

const tableauService = new TableauService();
const projectName = 'testproj';
const workbookId = 'af619d8d-1e23-483b-98b2-34e2e347be27';
const workbookName = 'new Chart 1';
const tablauUserId = 'b9ea310a-b687-46ba-b3fe-e074c0ee5eab'

describe.skip('Tableau Service', function () {
    before(function (done) {
        initDb()
            .then(() => done())
            .catch(e => done(e));

    });

    it('Should login to talbeau ', function(done) {
        // we just test if we can login so we can check the credentials and that online site is up
        tableauService.login()
            .then( () => done())
            .catch(e => done(e));
    });

});