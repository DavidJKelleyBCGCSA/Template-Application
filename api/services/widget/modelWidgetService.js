const SnowflakeService = require('../storage/snowflakeService');
const axios = require('axios');
const {JUPYTER_SERVER, JUPYTER_TOKEN} = require('../../../config');
const clientTemplate = require('../../../files/jupyter/client.json');
const notebookTemplate = require('../../../files/jupyter/notebook.json');
const {WidgetRelation, WidgetInstance, WarehouseAccount, ModuleInstance, Workspace} = require('../../model');

class ModelWidgetService {

    constructor(widgetInstanceId, workspaceId, userId) {
        this.jupyterServer = JUPYTER_SERVER;
        this.widgetInstanceId = widgetInstanceId;
        this.userId = userId;
        this.snowflakeService = new SnowflakeService(workspaceId);

        this.config = {headers: {'Authorization': `token ${JUPYTER_TOKEN}`}};

        this.basePath = 'api/contents/work';
        this.fileNotebookName = 'notebook.ipynb';
        this.fileClientName = 'client.ipynb';
        this.fileDataName = 'data.json';
        this.pathFolder = 'widget_'+this.widgetInstanceId;
        this.widgetDirPath = `${this.jupyterServer}/${this.basePath}/${this.pathFolder}`;
    }

    isSuccessResponse(response) {
        return response.status >= 200 || response.status < 300;
    }

    generateDataJsonStructure() {
        return {
            "widgetInstanceId": this.widgetInstanceId,
            "warehouseName": "",
            "tableName": "",
            "snowflakeUser": "",
            "snowflakePass": "",
            "snowflakeAccount": ""
        };
    }

    runNotebook() {
        // somehow make it run. Not currenlty possible.
        return Promise.resolve();
    }

    /**
     * Updates the data json file for this widget jupyter notebook
     */
    updateInputData() {
        // get inputs data and update data.json

        WidgetRelation.findAll({
            where: { toWidgetInstanceId: [this.widgetInstanceId] },
            attributes: ['fromWidgetInstanceId'],
            include: [{
                model: WidgetInstance,
                as: 'fromInstance',
                include: [{
                    model: ModuleInstance,
                    include: [{
                        model: Workspace,
                        include: [WarehouseAccount]
                    }]
                }],
            }],
        }).then(widgetRelations => {
            // here we could get more than one in the future. For version 1.0 we will use just one
            const widgetRelation = widgetRelations[0];
            const warehouseAccount = widgetRelation.fromInstance.moduleInstance.workspace.warehouseAccount;

            const dataJson = this.generateDataJsonStructure();
            dataJson.warehouseName = widgetRelation.fromInstance.moduleInstance.workspace.warehouseName;
            dataJson.tableName = widgetRelation.fromInstance.output.tableName || '';
            dataJson.snowflakeUser = warehouseAccount.username;
            dataJson.snowflakePass = warehouseAccount.password;
            dataJson.snowflakeAccount = warehouseAccount.account;

            return dataJson;
        }).then(dataJson =>
            axios.put(`${this.widgetDirPath}/${this.fileDataName}`,
                {
                    name: this.fileDataName,
                    path: `${this.widgetDirPath}/${this.fileDataName}`,
                    type: 'file',
                    format: 'text',
                    content: JSON.stringify(dataJson)
                }, this.config)
        ).catch(error => {
            console.log('JupyterError: ', error);
            return Promise.reject(error);
        });
    }

    /**
     * Creates a new Jupyter notebook
     */
    createNotebook() {
        const clientBody = {...clientTemplate};
        const notebookBody = {...notebookTemplate};
        const dataJson = this.generateDataJsonStructure();

        return axios.put(this.widgetDirPath,
            {
                name: this.pathFolder,
                path: this.basePath,
                type: 'directory',
                format: 'json'
            }, this.config)
            .then(response => {
                if (this.isSuccessResponse(response)) {
                    return axios.put(`${this.widgetDirPath}/${this.fileClientName}`,
                    {
                        name: this.fileClientName,
                        path: `${this.widgetDirPath}/${this.fileClientName}`,
                        type: 'notebook',
                        format: 'json',
                        content: clientBody
                    }, this.config);
                }
                return Promise.reject(new Error(response.statusText));
            })
            .then(response => {
                if (this.isSuccessResponse(response)) {
                    return axios.put(`${this.widgetDirPath}/${this.fileNotebookName}`,
                        {
                            name: this.fileNotebookName,
                            path: `${this.widgetDirPath}/${this.fileNotebookName}`,
                            type: 'notebook',
                            format: 'json',
                            content: notebookBody
                        }, this.config);
                }
                return Promise.reject(new Error(response.statusText));
            })
            .then(response => {
                if (this.isSuccessResponse(response)) {
                    return axios.put(`${this.widgetDirPath}/${this.fileDataName}`,
                        {
                            name: this.ileDataName,
                            path: `${this.widgetDirPath}/${this.fileDataName}`,
                            type: 'file',
                            format: 'text',
                            content: JSON.stringify(dataJson)
                        }, this.config);
                    }
                return Promise.reject(new Error(response.statusText));
            })
            .then(response => {
                if (this.isSuccessResponse(response)) {
                    return Promise.resolve();
                }
                return Promise.reject(new Error(response.statusText));
            })
            .catch(error => {
                console.log('JupyterError: ', error);
                return Promise.reject(error);
            });
    }
}

module.exports = ModelWidgetService;