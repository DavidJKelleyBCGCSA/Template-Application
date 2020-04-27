const {DataTypes} = require('sequelize');

module.exports = {
    up: async (queryInterface) => {

        await queryInterface.createTable('warehouse_account', {
            id: {type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true},
            account: {type: DataTypes.STRING, allowNull: false},
            username: {type: DataTypes.STRING, allowNull: false},
            password: {type: DataTypes.STRING, allowNull: false},
            created_at: {type: DataTypes.DATE, allowNull: false},
            updated_at: {type: DataTypes.DATE, allowNull: false},
        });

        await queryInterface.createTable('user', {
            id: {type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true},
            username: {type: DataTypes.STRING, allowNull: false},
            first_name: {type: DataTypes.STRING, allowNull: true},
            last_name: {type: DataTypes.STRING, allowNull: true},
            company: {type: DataTypes.STRING, allowNull: true},
            hashed_password: {type: DataTypes.STRING, allowNull: true},
            token: {type: DataTypes.STRING, allowNull: true},
            activated: {type: DataTypes.BOOLEAN, defaultValue: false},
            avatar: {type: DataTypes.STRING, allowNull: true},
            source: {type: DataTypes.STRING, allowNull: true},
            source_user_id: {type: DataTypes.STRING, allowNull: true},
            created_at: {type: DataTypes.DATE, allowNull: false},
            updated_at: {type: DataTypes.DATE, allowNull: false},
        });

        await queryInterface.addIndex('user', {
            unique: true,
            fields: ['username'],
        });

        await queryInterface.addIndex('user', {
            unique: true,
            fields: ['token'],
        });

        await queryInterface.createTable('workspace', {
            id: {type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true},
            title: {type: DataTypes.STRING, allowNull: false},
            number: {type: DataTypes.STRING, allowNull: false},
            description: {type: DataTypes.STRING},
            owner_id: {
                type: DataTypes.INTEGER,
                allowNull: false,
                references: {
                    model: 'user',
                    key: 'id',
                },
                onUpdate: 'CASCADE',
                onDelete: 'SET NULL',
            },
            environment: {type: DataTypes.STRING, allowNull: false},
            version: {type: DataTypes.INTEGER, allowNull: false, defaultValue: 1},
            status: {type: DataTypes.ENUM('OPEN', 'ARCHIVED'), allowNull: false, defaultValue: 'OPEN'},
            warehouse_account_id: {
                type: DataTypes.INTEGER,
                allowNull: false,
                references: {
                    model: 'warehouse_account',
                    key: 'id',
                },
                onUpdate: 'CASCADE',
                onDelete: 'SET NULL',
            },
            deleted_at: {type: DataTypes.DATE, allowNull: true, defaultValue: null},
            strict_edit_mode: {
                type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true,
                comment: 'if this workspace edition should be restricted'
            },
            created_at: {type: DataTypes.DATE, allowNull: false},
            updated_at: {type: DataTypes.DATE, allowNull: false},
        });

        await queryInterface.createTable('dev_account', {
            id: {type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true},
            handle: {type: DataTypes.STRING, allowNull: false},
            key: {type: DataTypes.STRING, allowNull: false},
            allow_create_primitives: {
                type: DataTypes.BOOLEAN,
                allowNull: true,
                comment: 'This dev can create primitives?'
            },
            created_at: {type: DataTypes.DATE, allowNull: false},
            updated_at: {type: DataTypes.DATE, allowNull: false},
        });

        await queryInterface.createTable('module_template', {
            id: {type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true},
            type: {type: DataTypes.STRING, allowNull: false, defaultValue: 'USER'},
            name: {type: DataTypes.STRING, allowNull: false},
            description: {type: DataTypes.STRING},
            widgets: {
                type: DataTypes.JSONB,
                comment: 'JSON array of widgetClasses contained in this template'
            },
            setup: {
                type: DataTypes.JSONB,
                comment: 'JSON with setup information {active, version, tabs, config, parameters}',
                defaultValue: {active: false}
            },
            config: {type: DataTypes.JSONB, comment: 'Specification for component UI and connections'},
            created_at: {type: DataTypes.DATE, allowNull: false},
            updated_at: {type: DataTypes.DATE, allowNull: false},
        });

        await queryInterface.createTable('app', {
            id: {type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true},
            slug: {
                type: DataTypes.STRING,
                allowNull: false,
                comment: 'Unique in within account; letters, numbers, dashes'
            },
            version: {type: DataTypes.INTEGER, allowNull: false},
            name: {type: DataTypes.STRING, allowNull: false},
            environment: {type: DataTypes.STRING, allowNull: false},
            description: {type: DataTypes.STRING},
            module_template_id: {
                type: DataTypes.INTEGER,
                allowNull: true,
                references: {
                    model: 'module_template',
                    key: 'id',
                },
                onUpdate: 'CASCADE',
                onDelete: 'SET NULL',
            },
            parameters: {type: DataTypes.JSONB, allowNull: true},
            primitive: {type: DataTypes.BOOLEAN, allowNull: true, comment: 'Is this a core app?'},
            created_at: {type: DataTypes.DATE, allowNull: false},
            updated_at: {type: DataTypes.DATE, allowNull: false},
            dev_account_id: {
                type: DataTypes.INTEGER,
                allowNull: true,
                references: {
                    model: 'dev_account',
                    key: 'id',
                },
                onUpdate: 'CASCADE',
                onDelete: 'SET NULL',
            },
        });

        await queryInterface.createTable('widget_class', {
            id: {type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true},
            app_id: {
                type: DataTypes.INTEGER,
                allowNull: true,
                references: {
                    model: 'app',
                    key: 'id',
                },
                onUpdate: 'CASCADE',
                onDelete: 'SET NULL',
                comment: 'App id where this widget class belongs to'
            },
            name: {type: DataTypes.STRING, allowNull: false, comment: 'User friendly widget name'},
            type: {type: DataTypes.STRING, allowNull: false, comment: 'Canonical type of widget'},
            connection_type: {
                type: DataTypes.ENUM('INPUT', 'OUTPUT', 'BOTH'), allowNull: false, defaultValue: 'BOTH',
                comment: 'This Widget can be connected as input, output or both?'
            },
            description: {type: DataTypes.STRING, allowNull: true},
            version: {type: DataTypes.INTEGER, allowNull: false, comment: 'Incrementing version number'},
            environment: {
                type: DataTypes.STRING,
                allowNull: false,
                comment: 'Target environment'
            },
            primitive: {type: DataTypes.BOOLEAN, allowNull: true, comment: 'Is this a core Widget Class ?'},
            tabs: {type: DataTypes.JSONB, allowNull: false, comment: 'Specification for subnav tabs to show on widget'},
            config: {
                type: DataTypes.JSONB,
                allowNull: false,
                comment: 'Specification for component UI and connections'
            },
            parameters: {type: DataTypes.JSONB, allowNull: false, comment: 'Array of parameters used in widgetClass'},
            created_at: {type: DataTypes.DATE, allowNull: false},
            updated_at: {type: DataTypes.DATE, allowNull: false},
        });

        await queryInterface.createTable('module_instance', {
            id: {type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true},
            name: {type: DataTypes.STRING, allowNull: false, comment: 'Display name of Module'},
            description: {type: DataTypes.STRING},
            owner_id: {
                type: DataTypes.INTEGER,
                allowNull: false,
                references: {
                    model: 'user',
                    key: 'id',
                },
                onUpdate: 'CASCADE',
                onDelete: 'SET NULL',
                comment: 'Module owner id',
            },
            workspace_id: {
                type: DataTypes.INTEGER,
                allowNull: false,
                references: {
                    model: 'workspace',
                    key: 'id',
                },
                onUpdate: 'CASCADE',
                onDelete: 'SET NULL',
                comment: 'FK to workspace'
            },
            config: {type: DataTypes.JSONB, allowNull: true, comment: 'Configuration copied from moduleTemplate'},
            deleted_at: {type: DataTypes.DATE, allowNull: true, defaultValue: null},
            strict_edit_mode: {
                type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true,
                comment: 'if this module edition should be restricted'
            },
            created_at: {type: DataTypes.DATE, allowNull: false},
            updated_at: {type: DataTypes.DATE, allowNull: false},
        });

        await queryInterface.createTable('widget_instance', {
            id: {type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true},
            widget_class_id: {
                type: DataTypes.INTEGER,
                allowNull: false,
                references: {
                    model: 'widget_class',
                    key: 'id',
                },
                onUpdate: 'CASCADE',
                onDelete: 'SET NULL',
                comment: 'FK to widgetClass'
            },
            module_instance_id: {
                type: DataTypes.INTEGER,
                allowNull: false,
                references: {
                    model: 'module_instance',
                    key: 'id',
                },
                onUpdate: 'CASCADE',
                onDelete: 'SET NULL',
                comment: 'FK to moduleInstance'
            },
            title: {type: DataTypes.STRING, allowNull: false},
            description: {type: DataTypes.STRING},
            owner_id: {
                type: DataTypes.INTEGER,
                allowNull: false,
                references: {
                    model: 'user',
                    key: 'id',
                },
                onUpdate: 'CASCADE',
                onDelete: 'SET NULL',
            },
            parameters: {type: DataTypes.JSONB, allowNull: true},
            operations: {type: DataTypes.JSONB, allowNull: true, defaultValue: {}},
            output: {type: DataTypes.JSONB, allowNull: true, defaultValue: {}},
            config: {type: DataTypes.JSONB, allowNull: true, comment: 'Configuration for this widget instance'},
            schema: {
                type: DataTypes.JSONB, allowNull: true, defaultValue:
                    {"inputSchema": [{"columns": [], "inheritSchema": true}], "outputSchema": []}
            },
            deleted_at: {type: DataTypes.DATE, allowNull: true, defaultValue: null},
            strict_edit_mode: {
                type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true,
                comment: 'if this widget edition should be restricted'
            },
            slug: {type: DataTypes.STRING, allowNull: true},
            created_at: {type: DataTypes.DATE, allowNull: false},
            updated_at: {type: DataTypes.DATE, allowNull: false},
        });

        await queryInterface.createTable('data_source', {
            id: {type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true},
            widget_instance_id: {
                type: DataTypes.INTEGER,
                allowNull: false,
                references: {
                    model: 'widget_instance',
                    key: 'id',
                },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE',
            },
            version: {type: DataTypes.INTEGER, allowNull: false},
            type: {type: DataTypes.ENUM('FILE_UPLOAD'), allowNull: false},
            schema: {type: DataTypes.JSONB, defaultValue: {}},
            metadata: {type: DataTypes.JSONB, defaultValue: {}},
            source_location: {type: DataTypes.STRING, allowNull: false},
            filename: {type: DataTypes.STRING, allowNull: false},
            tab_name: {type: DataTypes.STRING, allowNull: true},
            file_id_hash: {type: DataTypes.STRING, allowNull: false},
            size: {type: DataTypes.INTEGER, allowNull: true},
            status: {type: DataTypes.ENUM('PENDING', 'READY', 'ERROR'), allowNull: false},
            uploaded_by: {
                type: DataTypes.INTEGER,
                allowNull: false,
                references: {
                    model: 'user',
                    key: 'id',
                },
                onUpdate: 'CASCADE',
                onDelete: 'SET NULL',
            },
            created_at: {type: DataTypes.DATE, allowNull: false},
            updated_at: {type: DataTypes.DATE, allowNull: false},
        });

        await queryInterface.addIndex('data_source', {
            unique: true,
            fields: ['widget_instance_id', 'version'],
        });

        await queryInterface.addIndex('data_source', {
            unique: false,
            fields: ['widget_instance_id'],
        });

        await queryInterface.createTable('module_instance_setup', {
            id: {type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true},
            app_id: {
                type: DataTypes.INTEGER,
                allowNull: true,
                references: {
                    model: 'app',
                    key: 'id',
                },
                onUpdate: 'CASCADE',
                onDelete: 'SET NULL',
                comment: 'App id where this Setup tabs are hosted'
            },
            module_instance_id: {
                type: DataTypes.INTEGER,
                allowNull: false,
                references: {
                    model: 'module_instance',
                    key: 'id',
                },
                onUpdate: 'CASCADE',
                onDelete: 'SET NULL',
            },
            version: {type: DataTypes.INTEGER, allowNull: false, default: 1},
            is_completed: {
                type: DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false,
                comment: "the setup compute was run?"
            },
            parameters: {type: DataTypes.JSONB, allowNull: false, defaultValue: {}, comment: 'Setup parameters'},
            config: {type: DataTypes.JSONB, allowNull: false, defaultValue: {}, comment: 'Setup configuration'},
            tabs: {
                type: DataTypes.JSONB, allowNull: false, defaultValue: [],
                comment: 'JSON array of SetupTabs contained in this setup'
            },
            progress: {
                type: DataTypes.INTEGER,
                defaultValue: 0,
                allowNull: false,
                comment: 'The progress of this setup'
            },
            created_at: {type: DataTypes.DATE, allowNull: false},
            updated_at: {type: DataTypes.DATE, allowNull: false},
        });

        await queryInterface.addIndex('module_instance_setup', {
            unique: true,
            fields: ['module_instance_id'],
        });

        await queryInterface.createTable('invitation', {
            id: {type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true},
            email: {type: DataTypes.STRING, allowNull: false},
            active: {type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true},
            created_at: {type: DataTypes.DATE, allowNull: false},
            updated_at: {type: DataTypes.DATE, allowNull: false},
        });

        await queryInterface.addIndex('invitation', {
            unique: true,
            fields: ['email'],
        });

        await queryInterface.createTable('workspace_invitation', {
            id: {type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true},
            invitation_id: {
                type: DataTypes.INTEGER,
                allowNull: false,
                references: {
                    model: 'invitation',
                    key: 'id',
                },
                onUpdate: 'CASCADE',
                onDelete: 'SET NULL',
            },
            workspace_id: {
                type: DataTypes.INTEGER,
                allowNull: false,
                references: {
                    model: 'workspace',
                    key: 'id',
                },
                onUpdate: 'CASCADE',
                onDelete: 'SET NULL',
            },
            created_at: {type: DataTypes.DATE, allowNull: false},
            updated_at: {type: DataTypes.DATE, allowNull: false},
        });

        await queryInterface.addIndex('workspace_invitation', {
            unique: true,
            fields: ['invitation_id', 'workspace_id'],
        });

        await queryInterface.createTable('workspace_member', {
            id: {type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true},
            workspace_id: {
                type: DataTypes.INTEGER,
                allowNull: false,
                references: {
                    model: 'workspace',
                    key: 'id',
                },
                onUpdate: 'CASCADE',
                onDelete: 'SET NULL',
            },
            user_id: {
                type: DataTypes.INTEGER,
                allowNull: false,
                references: {
                    model: 'user',
                    key: 'id',
                },
                onUpdate: 'CASCADE',
                onDelete: 'SET NULL',
            },
            created_at: {type: DataTypes.DATE, allowNull: false},
            updated_at: {type: DataTypes.DATE, allowNull: false},
        });

        await queryInterface.addIndex('workspace_member', {
            unique: true,
            fields: ['user_id', 'workspace_id'],
        });

        await queryInterface.createTable('widget_relation', {
            id: {type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true},
            from_widget_instance_id: {
                type: DataTypes.INTEGER,
                allowNull: false,
                references: {
                    model: 'widget_instance',
                    key: 'id',
                },
                onUpdate: 'CASCADE',
                onDelete: 'SET NULL',
            },
            to_widget_instance_id: {
                type: DataTypes.INTEGER,
                allowNull: false,
                references: {
                    model: 'widget_instance',
                    key: 'id',
                },
                onUpdate: 'CASCADE',
                onDelete: 'SET NULL',
            },
            created_at: {type: DataTypes.DATE, allowNull: false},
            updated_at: {type: DataTypes.DATE, allowNull: false},
        });

        await queryInterface.addIndex('widget_relation', {
            unique: true,
            fields: ['from_widget_instance_id', 'to_widget_instance_id'],
        });

        const activityTypes = [
            'FILE_UPLOADED',
            'FILE_CREATED',
            'CURRENT_VERSION_CHANGED',
            'COMMENTED_ON_WIDGET',
            'COMMENTED_ON_MODULE',
            'COMMENTED_ON_WORKSPACE',
            'CONNECTED_INPUT_WIDGET',
            'CONNECTED_OUTPUT_WIDGET',
            'DISCONNECTED_INPUT_WIDGET',
            'DISCONNECTED_OUTPUT_WIDGET',
            'WORKSPACE_CREATED',
            'MODULE_CREATED',
            'WIDGET_CREATED',
            'WORKSPACE_UPDATED',
            'WORKSPACE_STATUS_CHANGED',
            'MODULE_UPDATED',
            'WIDGET_UPDATED',
            'WORKSPACE_DELETED',
            'MODULE_DELETED',
            'WIDGET_DELETED',
            'WORKSPACE_USERS_INVITED',
            'CHART_CREATED',
            'CHART_UPDATED',
            'CHART_DELETED',
            'CHART_PDF_DOWNLOADED',
            'ERROR_PUBLISHING_TO_PIPELINE',
            'DATA_QUALITY_UPDATED',
            'RECIPE_RUNNED',
            'JOIN_RUNNED',
            'INPUT_CHANGED',
            'PARAMETERS_CHANGED',
            'MANUAL_TRIGGER',
            'OUTPUT_CHANGED',
            'SETUP_FINISHED',
            'JOB_RUNNING',
            'JOB_COMPLETE',
        ];

        await queryInterface.createTable('activity', {
            id: {type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true},
            user_id: {
                type: DataTypes.INTEGER,
                allowNull: true,
                references: {
                    model: 'user',
                    key: 'id',
                },
                onUpdate: 'CASCADE',
                onDelete: 'SET NULL',
                comment: 'null for system notifications',
            },
            data: {
                type: DataTypes.JSONB, allowNull: true, comment:
                    'This may contain additional data in a key,value format'
            },
            type: {
                type: DataTypes.ENUM(...activityTypes), allowNull: false, comment:
                    'The activity type'
            },

            // Next attributes may be changed with just one ID attribute with another objectType attribute of 'widget',
            // 'module' or 'workspace' so we can register activities with different granularities.
            // This current way is more easier for making queries.
            widget_instance_id: {
                type: DataTypes.INTEGER,
                allowNull: true,
                references: {
                    model: 'widget_instance',
                    key: 'id',
                },
                onUpdate: 'CASCADE',
                onDelete: 'SET NULL',
            },
            module_instance_id: {
                type: DataTypes.INTEGER,
                allowNull: true,
                references: {
                    model: 'module_instance',
                    key: 'id',
                },
                onUpdate: 'CASCADE',
                onDelete: 'SET NULL',
            },
            workspace_id: {
                type: DataTypes.INTEGER,
                allowNull: true,
                references: {
                    model: 'workspace',
                    key: 'id',
                },
                onUpdate: 'CASCADE',
                onDelete: 'SET NULL',
            },
            created_at: {type: DataTypes.DATE, allowNull: false},
            updated_at: {type: DataTypes.DATE, allowNull: false},
        });

        await queryInterface.createTable('comment', {
            id: {type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true},
            user_id: {
                type: DataTypes.INTEGER,
                allowNull: false,
                references: {
                    model: 'user',
                    key: 'id',
                },
                onUpdate: 'CASCADE',
                onDelete: 'SET NULL',
                comment: 'null for system notifications',
            },
            text: {type: DataTypes.STRING(1028), allowNull: false, comment: 'the message of this comment'},
            mentions: {
                type: DataTypes.JSONB, allowNull: true, comment: 'ids of users mentioned in this comment',
                default: []
            },

            // 'widget', 'module' or 'workspace' give us different granularities.
            // This current way is more easier for making queries.
            widget_instance_id: {
                type: DataTypes.INTEGER,
                allowNull: true,
                references: {
                    model: 'widget_instance',
                    key: 'id',
                },
                onUpdate: 'CASCADE',
                onDelete: 'SET NULL',
            },
            module_instance_id: {
                type: DataTypes.INTEGER,
                allowNull: true,
                references: {
                    model: 'module_instance',
                    key: 'id',
                },
                onUpdate: 'CASCADE',
                onDelete: 'SET NULL',
            },
            workspace_id: {
                type: DataTypes.INTEGER,
                allowNull: true,
                references: {
                    model: 'workspace',
                    key: 'id',
                },
                onUpdate: 'CASCADE',
                onDelete: 'SET NULL',
            },
            created_at: {type: DataTypes.DATE, allowNull: false},
            updated_at: {type: DataTypes.DATE, allowNull: false},
        });

    },

    down: async (queryInterface) => {
        await queryInterface.dropTable('comment', { force: true });
        await queryInterface.dropTable('activity', { force: true });
        await queryInterface.dropTable('widget_relation', { force: true });
        await queryInterface.dropTable('workspace_member', { force: true });
        await queryInterface.dropTable('workspace_invitation', { force: true });
        await queryInterface.dropTable('invitation', { force: true });
        await queryInterface.dropTable('module_instance_setup', { force: true });
        await queryInterface.dropTable('data_source', { force: true });
        await queryInterface.dropTable('widget_instance', { force: true });
        await queryInterface.dropTable('module_instance', { force: true });
        await queryInterface.dropTable('widget_class', { force: true });
        await queryInterface.dropTable('app', { force: true });
        await queryInterface.dropTable('module_template', { force: true });
        await queryInterface.dropTable('dev_account', { force: true });
        await queryInterface.dropTable('workspace', { force: true });
        await queryInterface.dropTable('user', { force: true });
        await queryInterface.dropTable('warehouse_account', { force: true });
    }
};
