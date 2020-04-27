const assert = require('chai').assert;
const { initDb } = require('../../../test/init');

const WorkspaceService = require('../workspace/workspaceService');
const workspaceManager = new WorkspaceService({mock: true});

const ModuleManagerService = require('../workspace/moduleService');
const moduleManager = new ModuleManagerService();

const WidgetService = require('../widget/widgetService');

describe('Discussions Service', function () {

    const owner = 1;
    const widgetManager = new WidgetService(owner);

    before(function(done) {
        initDb()
            .then(() => done())
            .catch(e => done(e));
    });

    it('should list recent discussions from all owner workspaces', function(done) {
        workspaceManager.createWorkspace('test', '00000-00', owner, 'test workspace', 'STAGING',[])
            .then(workspace => {
                workspaceManager.createWorkspace('test2', '00000-00', owner, 'test workspace 2', 'STAGING',[])
                    .then(workspace2 => {
                        workspaceManager.createWorkspace('test from another owner', '00000-00', 2,
                        'test workspace other', 'STAGING',[])
                            .then(workspaceOther => Promise.all([workspaceManager.addComment(1, "Text1", workspace.id),
                                    workspaceManager.addComment(1, "Text2", workspace2.id),
                                    workspaceManager.addComment(2, "Text3", workspaceOther.id)]))
                            .then(() => workspaceManager.getRecentCommentsByUser(10, 1))
                            .then(comments => {
                                // just the 2 comments from owner workspaces (excludes workspaceOther).
                                assert.lengthOf(comments, 2);
                                assert.isTrue(comments[0].text === "Text1" || comments[1].text === "Text1");
                                assert.isTrue(comments[0].text === "Text2" || comments[1].text === "Text2");
                                done();
                            });
                    });
            })
            .catch(e => done(e));
    });

    it('should add a workspace, module and widget comments and get them', function(done) {
        workspaceManager.addComment(owner, "Text that mentions $2$ in the content", 1)
            .then(() => moduleManager.addComment(owner, "Text that mentions $2$ in the content", 1))
            .then(() => widgetManager.addComment("Text that mentions $2$ in the content", 1))
            .then(() => workspaceManager.getComments(1, true, 10, 1))
            .then(comments => {
                assert.lengthOf(comments, 3);
                return workspaceManager.getComments(1, false, 10, 1);
            })
            .then(comments => {
                assert.lengthOf(comments, 1);
                done();
            })
            .catch(e => done(e));
    });

    it('should get mention users data from comments', function(done) {
        // all data from previous test
       workspaceManager.getComments(1, true, 10, 1)
       .then(comments => {
            assert.equal(comments[0].mentions[0].username, 'jack.smith@test.com');
            assert.equal(comments[1].mentions[0].username, 'jack.smith@test.com');
            assert.equal(comments[2].mentions[0].username, 'jack.smith@test.com');
            done();
       })
       .catch(e => done(e));
    });

    it('should add a module and widget comments and get them from module', function(done) {
        moduleManager.addComment(owner, "new Text that mentions $2$ in the content", 1)
        .then(() => widgetManager.addComment("new Text that mentions $2$ in the content", 1))
        .then(() => moduleManager.getComments(1, true, 10, 1))
        .then(comments => {
            // 2 from second test plus this 2 new ones
            assert.lengthOf(comments, 4);
            return moduleManager.getComments(1, false, 10, 1);
        })
        .then(comments => {
            assert.lengthOf(comments, 2);
            done();
        })
        .catch(e => done(e));
    });

});