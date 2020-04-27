const fs = require('fs');
const crypto = require('crypto');
const assert = require('chai').assert;
const csv = require('csv-parser');
const { initDb } = require('../../../test/init');

const FileSourceService = require('./fileSourceService');
const SnowflakeService = require('../storage/snowflakeService');

describe('FileSource Service', function () {
    before(function (done) {
        initDb()
            .then(() => done())
            .catch(e => done(e));
    });

    it('Should connect to Snowflake and create new datawarehouse', function(done) {
        const snowflakeService = new SnowflakeService(1);
        snowflakeService.connect()
            .then(() => {
                snowflakeService.createWarehouseAndDatabase()
                    .then(() => {
                        snowflakeService.getWarehouse()
                            .then(warehouse => {
                                assert.equal(warehouse.length, 1);
                                done();
                            })
                            .catch(e => done(e));
                    })
                    .catch(e => done(e));
            })
            .catch(e => done(e));
    });

    it('should upload a new file for a new File Source widget', function(done) {
        const filename = 'sample_sm.csv';
        fs.open('files/sample_data/' + filename, (err, fd) => {
            if (err) return done(err);

            fs.fstat(fd, (err, stats) => {
                if (err) return done(err);

                const size = stats.size;
                const modified = stats.mtimeMs;
                const hash = crypto.createHash('sha1');
                hash.update(`${filename}:${size}:${modified}`);
                const fileIdHash = hash.digest('hex');

                const stream = fs.createReadStream(null, {fd});
                const csvStream = stream.pipe(csv());

                // Add ROWID column
                const schema = [];
                csvStream.on('headers', headers => {
                    headers.map(header => schema.push({name: header, type: 'string'}));
                    schema.push({name: '_', type: 'integer'});

                    const fileSourceService = new FileSourceService(1, 1, 1);
                    fileSourceService.getUploadToken('t1', filename, fileIdHash, size, schema)
                        .then(({token}) => fileSourceService.upload(token, csvStream))
                        .then(() => done())
                        .catch(e => done(e));
                });
            });
        });
    });

    it('should list versions and set version then get preview', function(done) {
        const fileSourceService = new FileSourceService(1, 1, 1);
        fileSourceService.listVersions()
            .then(({versions, currentVersion}) => {
                console.log(versions);
                assert.equal(versions[0].tabName, 't1');

                fileSourceService.setVersion(currentVersion)
                    .then(() => {
                        fileSourceService.preview()
                            .then(stream => {
                                stream.on('data', data => {
                                    console.log(data);
                                });

                                stream.on('end', () => done());
                            });
                    });
            })
            .catch(e => done(e));
    });


    it('should set a new version', function(done) {
        const widgetId = 1;
        const fileSourceService = new FileSourceService(1, widgetId, 1);

        fileSourceService.listVersions()
            .then(({versions, currentVersion}) => {
                assert.equal(versions[0].tabName, 't1');
                assert.equal(currentVersion, 1);

                return fileSourceService.getUploadToken('tabname2', 'newfile2.test', 'hashid2', 111,
                    [{name: '_', type: 'integer'}]);
            })
            .then(({token}) => fileSourceService.uploadSync(token, [{"_": 1}],1))
            .then(() => fileSourceService.listVersions())
            .then(({versions, currentVersion}) => {
                assert.equal(versions[0].tabName, 'tabname2');
                assert.equal(currentVersion, 2);

                // go back to first file version
                return fileSourceService.setVersion(1);
            })
            .then(() => fileSourceService.listVersions())
            .then(({versions, currentVersion}) => {
                assert.equal(currentVersion, 1);
                done();
            })
            .catch(e => done(e));
        });

});