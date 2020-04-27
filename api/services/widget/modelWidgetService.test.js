// const assert = require('chai').assert;
// const { initDb } = require('../../../test/init');
const WidgetService = require('./widgetService');
const enums = require('../../util/enums');

// skip this test while jupyter server is not part of the test stack
describe.skip('Model Widget Service', function () {
    // before(function (done) {
    //     initDb()
    //         .then(() => done())
    //         .catch(e => done(e));

    // });

    it('create a new notebook when the user creates a new Model Widget', function(done) {
        const widgetService = new WidgetService(1);
        widgetService.createWidget('Model widget', 'a description',{},[], enums.PrimitiveWidgetClassType.MODEL.id, 1)
            .then(widget => {
                // check thing here
                   done();
            })
            .catch(e => done(e));
    });

    it('update a notebook input data', function(done) {
        const widgetService = new WidgetService(1);
        widgetService.createWidget('Model widget', 'a description',{},[], enums.PrimitiveWidgetClassType.MODEL.id, 1)
        .then(modelwidget => {
            widgetService.createWidget('fs widget', 'a description',{},[], enums.PrimitiveWidgetClassType.FILE_SOURCE.id, 1)
            .then(fswidget => {
                widgetService.setInput(modelwidget.id, fswidget.id)
                    .then(() => {
                        // check thing here
                        done();
                    })
                    .catch(e => done(e));
            })
            .catch(e => done(e));
        })
        .catch(e => done(e));
    });

});