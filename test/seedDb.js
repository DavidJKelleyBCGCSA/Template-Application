const { config } = require('../config');
const enums = require('../api/util/enums');
const {
    App,
    DevAccount,
    WidgetInstance,
    WidgetRelation,
    ModuleInstance,
    ModuleTemplate,
    User,
    Workspace,
    WorkspaceMember,
    WarehouseAccount,
} = require('../api/model');

const DEFAULT_WAREHOUSE_ACCOUNT_ID_KEY = 'DEFAULT_WAREHOUSE_ACCOUNT_ID';
const ENVIRONMENT_KEY = 'ENVIRONMENT';

///////////////////// Testing Seeds /////////////////////

function createUsers() {
    return User.create({
        username: 'kropp.matthew@test.com',
        firstName: 'Matt',
        lastName: 'Kropp',
        company: 'BCG',
        token: 'TEST_TOKEN',
        hashedPassword: '$2b$10$AV0x69zqlslLRMbnwbkqkuZgooXoqymveKu.Z5ermrLZpj/O0gN9S',
        activated: true,
        avatar: 'https://api.adorable.io/avatars/150/kropp.matthew@test.com'
    })
        .then(() => User.create({
            username: 'jack.smith@test.com',
            firstName: 'Jack',
            lastName: 'Smith',
            company: 'BCG',
            hashedPassword: '$2b$10$EYmkU9uvh2LBXNRePq2Z/.rtaMqW3ivQuSZeIllw7zTsQsCMvSTR2',
            activated: true,
            avatar: 'https://api.adorable.io/avatars/150/jack.smith@test.com'
        }));
}

function createModuleTemplate() {
    return ModuleTemplate.create({
        name: 'Seed Module Template',
        description: 'Seed module template used for testing',
        ownerId: 1,
        widgets: [],
        config: {},
    });
}

function getDevAccount() {
    return DevAccount.findOne({
        where: {
            handle: 'testing-handle',
        },
    });
}

function createApp(moduleTemplateId) {
    return getDevAccount()
        .then(devAccount => {
            return App.create({
                devAccountId: devAccount.id,
                slug: 'seed-app-1',
                name: 'Seed App 1',
                description: 'Seed app used to initialize database for testing',
                environment: config.get(ENVIRONMENT_KEY),
                version: 1,
                moduleTemplateId,
            });
        });
}

function createWorkspace(userId, warehouseAccountId) {
    return Workspace.create({
        title: 'Seed Workspace',
        number: '01234-00',
        description: 'Seed workspace for testing',
        ownerId: userId,
        environment: config.get(ENVIRONMENT_KEY),
        version: 1,
        status: 'OPEN',
        warehouseAccountId,
    });
}

function createModuleInstance(workspaceId) {
    return ModuleInstance.create({
        name: 'Test Module Instance',
        description: 'Module instance created in SeedDb for testing',
        ownerId: 1,
        workspaceId: workspaceId,
        config: {},
    });
}

function createWidgetRelation(widgetInstanceId1, widgetInstanceId2) {
    return WidgetRelation.create({
        fromWidgetInstanceId: widgetInstanceId1,
        toWidgetInstanceId: widgetInstanceId2,
    });
}

function createWidgetInstance(moduleInstanceId, widgetClass) {
    return WidgetInstance.create({
        widgetClassId: widgetClass.id,
        moduleInstanceId,
        title: `Test ${widgetClass.name} Widget`,
        description: 'Created by SeedDb for testing',
        ownerId: 1,
        parameters: {},
        operations: {},
        outputs: [],
        schema: { "inputSchema": [{ "columns": [], "inheritSchema": true }], "outputSchema": {} },
    });
}

function createWorkspaceMember(userId, workspaceId) {
    return WorkspaceMember.create({
        userId, workspaceId
    });
}

function getWarehouseAccount() {
    return WarehouseAccount.findByPk(config.get(DEFAULT_WAREHOUSE_ACCOUNT_ID_KEY));
}

function seedDb() {
    return new Promise((fulfill) => {
        return getWarehouseAccount()
            .then(warehouseAccount => {
                createUsers()
                    .then(() => {
                        createModuleTemplate()
                            .then((moduleTemplate) => createApp(moduleTemplate.id))
                            .then(() => createWorkspace(1, warehouseAccount.id))
                            .then(workspace => Promise.all([
                                createWorkspaceMember(1, workspace.id),
                                createModuleInstance(workspace.id)
                            ]))
                            .then(([, moduleInstance]) => {
                                createWidgetInstance(moduleInstance.id, enums.PrimitiveWidgetClassType.FILE_SOURCE)
                                    .then(widgetInstanceFS => {
                                        return createWidgetInstance(moduleInstance.id,
                                            enums.PrimitiveWidgetClassType.DATA_PREP)
                                            .then(widgetInstanceDP => createWidgetRelation(widgetInstanceFS.id,
                                                widgetInstanceDP.id));
                                    })
                                    .then(() => createWidgetInstance(moduleInstance.id,
                                        enums.PrimitiveWidgetClassType.VISUALIZE))
                                    .then(() => {
                                        fulfill();
                                    });

                            });
                    });
            });
    });
}

module.exports = {
    seedDb
};
