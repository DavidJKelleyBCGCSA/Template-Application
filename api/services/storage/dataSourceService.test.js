const assert = require('chai').assert;
const { initDb } = require('../../../test/init');
const { Readable } = require('stream');

const DataSourceService = require('./dataSourceService');

describe('DataSourceService', function () {
    const dataSourceService = new DataSourceService(1, 1, 1);

    before(function (done) {
        initDb().then(() => done());
    });

    it('get datastoretoken for new upload', function(done) {
        const schema = [{name: 'col1', type: 'integer'}];
        dataSourceService.getDataStoreToken('hash', 'filename.csv', 1, schema, 'tab1')
            .then(({token, offset}) => {
                assert.equal(token, 'hash');
                assert.equal(offset, 0);
                done();
            }).catch(e => done(e));
    });

    it('stores data to create a new version', function(done) {
        const stream = new Readable({objectMode: true});

        dataSourceService.storeData('hash', stream)
            .then(() => done())
            .catch(e => done(e));

        stream.push({col1: 1});
        stream.push({col1: 2});
        stream.push(null);
    });

    it('gets metadata for stored data', function(done) {
        dataSourceService.getVersionInfo(1)
            .then(info => {
                assert.equal(info.filename, 'filename.csv');
                assert.equal(info.tabName, 'tab1');
                done();
            });
    });

    it('gets file stream from stored data', function(done) {
        dataSourceService.getFileStream()
            .then(({stream, dataSource}) => {
                assert.equal(dataSource.filename, 'filename.csv');
                let row = 0;
                stream.on('data', data => {
                    if (row++ === 0)
                        assert.equal(data.col1, 1);
                });

                stream.on('end', () => {
                    done();
                });

                stream.on('error', e => {
                    done(e);
                });
            });
    });
});