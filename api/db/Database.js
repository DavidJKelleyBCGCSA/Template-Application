const { Sequelize } = require('sequelize');
const Umzug = require('umzug');
const path = require('path');
const { config } = require('../../config');
const { Activity } = require('../model/Activity');
const { App } = require('../model/App');
const { Comment } = require('../model/Comment');
const { DataSource } = require('../model/DataSource');
const { DevAccount } = require('../model/DevAccount');
const { Invitation } = require('../model/Invitation');
const { ModuleInstance } = require('../model/ModuleInstance');
const { ModuleInstanceSetup } = require('../model/ModuleInstanceSetup');
const { ModuleInstanceRun } = require('../model/ModuleInstanceRun');
const { ModuleTemplate } = require('../model/ModuleTemplate');
const { WarehouseAccount } = require('../model/WarehouseAccount');
const { WidgetClass } = require('../model/WidgetClass');
const { WidgetInstance } = require('../model/WidgetInstance');
const { WidgetRelation } = require('../model/WidgetRelation');
const { WorkspaceInvitation } = require('../model/WorkspaceInvitation');
const { WorkspaceMember } = require('../model/WorkspaceMember');
const { Workspace } = require('../model/Workspace');
const { User } = require('../model/User');

const POSTGRES_CONNECTION_URI_KEY = 'POSTGRES_CONNECTION_URI';

class Database {
    constructor() {
        this.sequelize = new Sequelize(config.get(POSTGRES_CONNECTION_URI_KEY), {
            define: {
                timestamps: true,
                underscored: true,
            },
        });

        // TODO: Inject when Inversify implemented
        this.models = {
            Activity,
            App,
            Comment,
            DataSource,
            DevAccount,
            Invitation,
            ModuleInstance,
            ModuleInstanceSetup,
            ModuleInstanceRun,
            ModuleTemplate,
            User,
            WarehouseAccount,
            WidgetClass,
            WidgetInstance,
            WidgetRelation,
            WorkspaceInvitation,
            WorkspaceMember,
            Workspace,
        };

        this.umzug = new Umzug({
            migrations: {
                path: path.join(__dirname, '../../migrations'),
                params: [
                    this.sequelize.getQueryInterface()
                ]
            },
            storage: 'sequelize',
            storageOptions: {
                sequelize: this.sequelize,
                timestamps: true,
            },
            logging: (message) => console.info(message),
        });
    }

    async migrate() {
        console.info('Migrating database...');

        await this.umzug.up();

        console.info('Migrations performed successfully');
    }

    initializeModels() {
        Object.values(this.models).forEach((model) => model.initialize(this.sequelize));
        Object.values(this.models).forEach((model) => model.associate(this.models));

        console.info('Models initialized successfully');
    }

    getConnection() {
        return this.sequelize;
    }
}

module.exports = {
    Database,
};
