const assert = require('chai').assert;
const { initDb } = require('../../../test/init');

const SnowflakeService = require('../storage/snowflakeService');
const { WidgetInstance } = require('../../model');
const DataprepService = require('./dataprepService');
const WidgetService = require('../widget/widgetService');
const DataSourceService = require('../storage/dataSourceService');
const DataPrepRecipeService = require('./dataPrepRecipeService');

describe('Dataprep Service', function () {
    before(function(done) {
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

    it('should create a table in Snowflake', function(done) {

        const schema = [
            {name: 'col1', type: 'number'},
            {name: 'col2', type: 'varchar'},
        ];

        const snowflakeService = new SnowflakeService(1);
        snowflakeService.connect()
            .then(() => {
                snowflakeService.createTable('test_table', schema)
                    .then(() => done())
                    .catch(e => done(e));
            })
            .catch(e => done(e));
    });

    it('should upload data into Snowflake table', function(done) {
        const rows = [
            [1, 'one'],
            [2, 'two'],
            [3, 'three'],
            [4, 'four'],
            [5, 'five'],
        ];

        const snowflakeService = new SnowflakeService(1);
        snowflakeService.connect()
            .then(() => {
                snowflakeService.insert('test_table', rows)
                    .then(() => done())
                    .catch(e => done(e));
            })
            .catch(e => done(e));
    });

    it('should select data from the Snowflake table', function(done) {
        const snowflakeService = new SnowflakeService(1);
        snowflakeService.connect()
            .then(() => {
                snowflakeService.selectStream({tableName: 'test_table', sort: [], filter: [], offset: 5, limit: 1})
                    .then(stream => {
                        stream.on('data', data => {
                            assert.equal(data.col2, 'one');
                            console.log(data);
                        });
                        stream.on('end', () => {
                            done();
                        });
                    })
                    .catch(e => done(e));
            })
            .catch(e => done(e));
    });

    it('should set the sample dataset in Snowflake as table under Widget 1', function(done) {
        const schema = [{
            "name": "_",
            "type": "integer"
        }, {
            "name": "col1",
            "type": "string"
        }, {
            "name": "col2",
            "type": "string"
        }];

        const dataSourceService = new DataSourceService(1, 1, 1);
        dataSourceService.storeVersionMeta('names.xlsx', 'tb1', 'test_table',
            '9792d29e1959d0f68d884a14f3a44422dc53c9f6', 1111, 'READY', schema, {})
            .then(() => done())
            .catch(e => done(e));
    });

    it('should connect Widget 2 to Widget 1 as input and select the first row', function(done) {
        const widgetService = new WidgetService(1);
        widgetService.setInput(2, 1, true)
            .then(() => {
                const dataprepService = new DataprepService(1, 2);
                dataprepService.select(5, 1)
                    .then(stream => {
                        stream.on('data', data => {
                            console.log(data);
                            assert.equal(data.col2, 'one');
                        });
                        stream.on('end', () => done());
                        stream.on('error', e => done(e));
                    });
            })
            .catch(e => done(e));
    });

    it('should add sort and query result', function(done) {
        const dataprepService = new DataprepService(1, 2);
            dataprepService.addSort({
                "type": "SORT_Z_A",
                "column": "col1",
                "direction": "DESC"
            })
            .then(() => dataprepService.select(0, 0))
            .then(stream => {
                stream.on('data', data => {
                    assert.equal(data.col2, 'five');
                });
                stream.on('end', () => done());
                stream.on('error', e => done(e));
            });
    });

    it('should remove sort and query result', function(done) {
        const dataprepService = new DataprepService(1, 2);
            dataprepService.removeSort(0)
            .then(() => dataprepService.select(5,1))
            .then(stream => {
                stream.on('data', data => {
                    console.log(data);
                    assert.equal(data.col2, 'one');
                });
                stream.on('end', () => done());
                stream.on('error', e => done(e));
            });
    });

    it('should return the info of the table related to the input of the data prep', function(done) {
        const dataprepService = new DataprepService(1, 2);
            dataprepService.inputInfo()
            .then(infoData => {
                console.log(infoData);
                assert.equal(infoData.info.totalRows, 5);
                done();
            });
    });


    it('should add range filter and query result', function(done) {
        const dataprepService = new DataprepService(1, 2);
            dataprepService.addRangeFilter({
                "min": 1,
                "max": 1,
                "column": "col1",
                "type": "FILTER_BY",
                "filterType": "IS_BETWEEN",
            })
            .then(() => dataprepService.select(0, 0))
            .then(stream => {
                stream.on('data', data => {
                    assert.equal(data.col2, 'one');
                });
                stream.on('end', () => done());
                stream.on('error', e => done(e));
            });
    });

    it('should remove range filter and query result', function(done) {
        const dataprepService = new DataprepService(1, 2);
            dataprepService.removeRangeFilter(0)
            .then(() => dataprepService.select(5,1))
            .then(stream => {
                stream.on('data', data => {
                    console.log(data);
                    assert.equal(data.col2, 'one');
                });
                stream.on('end', () => done());
                stream.on('error', e => done(e));
            });
    });


    it('should add filter and query result', function(done) {
        const dataprepService = new DataprepService(1, 2);
            dataprepService.addFilter({
                "pattern": 4,
                "column": "col1",
                "type": "FILTER_BY",
                "filterType": "EQUALS",
            })
            .then(() => dataprepService.select(0, 0))
            .then(stream => {
                stream.on('data', data => {
                    assert.equal(data.col2, 'four');
                });
                stream.on('end', () => done());
                stream.on('error', e => done(e));
            });
    });

    it('should remove filter and query result', function(done) {
        const dataprepService = new DataprepService(1, 2);
            dataprepService.removeFilter(0)
            .then(() => dataprepService.select(5,1))
            .then(stream => {
                stream.on('data', data => {
                    console.log(data);
                    assert.equal(data.col2, 'one');
                });
                stream.on('end', () => done());
                stream.on('error', e => done(e));
            });
    });


    it('should add step and query result', function(done) {
        const dataprepService = new DataprepService(1, 2);
        dataprepService.addStep({
            "pattern": 4,
            "column": "col1",
            "newColumName": "test",
            "type": "RENAME_COLUMN",
        })
        .then(() => WidgetInstance.findOne({where: {id: 2}})
            .then(widget => {
                const operations = widget.operations || [];
                const steps = operations.steps || [];
                const step = steps[0] || {};
                assert.equal(step.type, 'RENAME_COLUMN');
                done();
            }).catch(e => done(e))
        ).catch(e => done(e));
    });

    it('should remove step and query result', function(done) {
        const dataprepService = new DataprepService(1, 2);
            dataprepService.removeStep(0)
            .then(() => dataprepService.select(5,1))
            .then(stream => {
                stream.on('data', data => {
                    console.log(data);
                    assert.equal(data.col2, 'one');
                });
                stream.on('end', () => done());
                stream.on('error', e => done(e));
            });
    });

    it.skip('should run recipe steps', function(done) {
        const dataPrepRecipeService = new DataPrepRecipeService(1, 2, 1);
        dataPrepRecipeService.runRecipe()
        .then(() => {
            const dataprepService = new DataprepService(1, 2, 1);
            dataprepService.listVersions()
                .then(({versions, currentVersion}) => {
                    assert.equal(versions[0].tableName, "dataprep_2:1");
                    dataprepService.setVersion(currentVersion)
                        .then(() => {
                            dataprepService.preview()
                                .then(stream => {
                                    stream.on('data', data => {
                                        console.log(data);
                                    });

                                    stream.on('end', () => done());
                                });
                        });
                })
                .catch(e => done(e));
        }).catch(e => done(e));
    });
});