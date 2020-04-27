const axios = require('axios');
const fs = require("fs");
const { WidgetInstance, ModuleInstance, Workspace, WidgetRelation } = require('../../model');
const config = require('../../../config');
const TableauService = require('./tableauService');
const WidgetService = require('../widget/widgetService');
const WorkspaceService = require('../workspace/workspaceService');
const workspaceService = new WorkspaceService();
const activityBus = require('../../events/activityEventBus');
const {ActivityEventType, ActivityType} = require('../../util/enums');
const xml2js = require('xml2js');
const log = require('../../util/log');
const widgetPrefix = 'widget';
const casePrefix = 'case';
const chartPrefix = 'chart';
const datasourcePrefix = 'ds';

const NO_TABLE_NAME = 'no-table';

class VisualizationService {


    constructor(userId) {
        this.userId = userId;
        const appRoot = global.appRoot ? global.appRoot : `${__dirname}/../../..`;
        this.twbTemplatePath =`${appRoot}/files/tableauTemplates/workbook_template.twb`;
    }

    // generateDatasourceId(widgetId, date) {
    //     return `${datasourcePrefix}-${widgetId}-${date.getTime()}`;
    // }

    generateDatasourceId(widgetId, widgetIdInput, date) {
        return `${datasourcePrefix}-${widgetId}-${date.getTime()}`;
    }

    generateWorkbookId(widgetId, date) {
        return `${chartPrefix}-${widgetId}-${date.getTime()}`;
    }

    generateWorkspaceProjectName(workspaceId, workspaceCreatedAt) {
        return `${casePrefix}-${workspaceId}-${workspaceCreatedAt.getTime()}`;
    }

    generateWidgetProjectName (widgetInstanceId, widgetCreatedAt) {
        return `${widgetPrefix}-${widgetInstanceId}-${widgetCreatedAt.getTime()}`;
    }

    /**
     * get the datasource that will be used on tableau
     * @param widgetId
     * @returns {promise<any>}
     */
    getInputsDatabaseAndTable(widgetId) {
        return WidgetInstance.findOne({
            where: {id: widgetId, deletedAt: null},
            include: [
                {
                    model: ModuleInstance,
                    include: [Workspace]
                }
            ]
        }).then(widget => {
            const database = widget.moduleInstance.workspace.warehouseName;
            const table = widget.output ? widget.output.tableName : '';
            return Promise.resolve({database, table});
        })
        .catch(e => Promise.reject(e));
    }

    /**
    * update a workbook
    */
   updateChart(widgetInstanceId, inputWidgetInstanceId, title, description, chartId) {
    const tableauService = new TableauService();

    const widgetService = new WidgetService(this.userId);
    return new Promise((resolve, reject) => {
        return tableauService.login()
            .then(() => widgetService.getWidget(widgetInstanceId, true))
            .then(widget => {
                const parameters = widget.parameters;
                const charts = parameters.charts;
                const chart = charts.find(chart => chart.workbookId === chartId);
                // const oldTitle = chart.workbookTitle;
                if (chart) {
                    new Promise((resolveDS, rejectDS) => {
                        // if user updated the input
                        if (chart.inputWidgetId !== inputWidgetInstanceId) {
                            const snowflakeWarehouse = widget.moduleInstance.workspace.warehouseAccount;
                            const widgetProjectId = widget.parameters.projectId;
                            this.getInputsDatabaseAndTable(inputWidgetInstanceId)
                                .then(({ database, table }) => {
                                    const datasourceName = chart.datasourceName;
                                        tableauService.createOrUpdateDatasource(widgetProjectId,
                                            database, table, datasourceName, snowflakeWarehouse)
                                        .then(() => resolveDS({database, table}))
                                        .catch(err => rejectDS(err));
                                })
                                .catch(err => rejectDS(err));
                        }
                        else {
                            resolveDS();
                        }
                    })
                    .then((databaseInfo) => {

                        chart.workbookTitle = title;
                        chart.description = description;

                        if (databaseInfo) {
                            chart.inputWidgetId = inputWidgetInstanceId;
                            chart.database = databaseInfo.database;
                            chart.table = databaseInfo.table;
                        }

                        widget.parameters = parameters;
                        return widget.save();
                    })
                    .then(() => {
                        activityBus.emit(ActivityEventType.WIDGET_DATA, this.userId, ActivityType.CHART_UPDATED,
                            {chartTitle: title}, widget.id);
                        resolve();
                    })
                    .catch(err => reject(err));
                }
                 else {
                    reject(new Error('Chart not found'));
                }
            });
    });
}

    /**
    * update  datarouce version due to an output changed. This means, same widget inputs
    * but maybe different tables name on snowflake.
    */
   updateDataSourcesToLastVersion(widgetInstanceId) {
    const tableauService = new TableauService();

    const widgetService = new WidgetService(this.userId);
    return new Promise((resolve, reject) => {
        return tableauService.login()
            .then(() => widgetService.getWidget(widgetInstanceId, true))
            .then(widget => {
                const parameters = widget.parameters;
                const widgetProjectId = widget.parameters.projectId;
                const snowflakeWarehouse = widget.moduleInstance.workspace.warehouseAccount;
                const charts = parameters.charts;

                // for every chart on the widget
                return Promise.all(charts.map(chart => this.getInputsDatabaseAndTable(chart.inputWidgetId)))
                    .then(dbValues => dbValues.map((dbvalue, index) => {
                        return {chart: charts[index],
                            dbFreshParams: dbvalue};
                        }))
                    .then(dbParams => {
                        // we check if the widget it has as an input, has a different output table
                        const inputsWithUpdatedOutput = [];
                        dbParams.forEach(dbParam => {
                                if (dbParam.chart.table !== dbParam.dbFreshParams.table ||
                                    dbParam.chart.database !== dbParam.dbFreshParams.database) {
                                        // there were changes on the input
                                        inputsWithUpdatedOutput.push(dbParam);
                                }
                        });

                        if (inputsWithUpdatedOutput.length > 0) {
                            // for all those charts with an outdated input table, we update them with fresh data
                            const updatePromises = inputsWithUpdatedOutput.map(updatedOutput => {
                                return () => tableauService.createOrUpdateDatasource(widgetProjectId,
                                    updatedOutput.dbFreshParams.database, updatedOutput.dbFreshParams.table,
                                    updatedOutput.chart.datasourceName, snowflakeWarehouse);
                            });
                            // we need to do them one at a time
                            const lastChartPromiseUpdate = updatePromises.reduce((promise, next) =>
                                        promise.then(next), Promise.resolve());
                            return Promise.all([inputsWithUpdatedOutput, lastChartPromiseUpdate]);
                        }
                        return resolve();
                    })
                    .then(([updatedCharts,]) => {

                        updatedCharts.forEach(updatedChart => {
                            const chart = charts.find(chart => updatedChart.chart.workbookId === chart.workbookId);
                            if (chart) {
                                chart.database = updatedChart.dbFreshParams.database;
                                chart.table = updatedChart.dbFreshParams.table;
                            }
                        });

                        widget.parameters = parameters;
                        return widget.save();
                    })
            .then(() => resolve())
            .catch(e => reject(e));
        })
        .catch(e => reject(e));
    });
}

/**
 * Creates a new Chart. Could be from an existing TWB Workbook (workbookURL) or using our own template.
 * @param {*} widgetInstanceId
 * @param {*} inputWidgetInstanceId
 * @param {*} title
 * @param {*} description
 * @param {*} workbookURL
 */
createChart(widgetInstanceId, inputWidgetInstanceId, title, description, workbookURL) {
    // this is a workbook template url
    if (workbookURL) {
        return this.createChartFromUrl(widgetInstanceId, inputWidgetInstanceId, title, description, workbookURL);
    }
    return this.createChartFromFile(widgetInstanceId, inputWidgetInstanceId, title, description, this.twbTemplatePath);
}

    /**
    * method handler to create a new workbook from a template local file (workbookFilePath)
    * @param widgetId
    * @param workspaceId
    * @returns {promise<any>}
    */
    createChartFromFile(widgetInstanceId, inputWidgetInstanceId, title, description, workbookFilePath) {
        const tableauService = new TableauService();

        const widgetService = new WidgetService(this.userId);
        return new Promise((resolve, reject) => {
            return tableauService.login()
                .then(() => widgetService.getWidget(widgetInstanceId, true))
                .then(widget => {
                    const snowflakeWarehouse = widget.moduleInstance.workspace.warehouseAccount;
                    const awidgetProjectId = widget.parameters.projectId;

                    new Promise((res, rej) => {
                        if (!awidgetProjectId) {
                            // somehow the tableau widget proy was not created
                            this.createVisulizationWidgetProjectTree(widget.id, widget.moduleInstance.workspaceId,
                                widget.createdAt)
                                .then(widgetVizProject => {
                                    const projectId = widgetVizProject.project.id;
                                    widget.parameters = { projectId, charts: [] };
                                    return Promise.all([projectId, widget.save()]);
                                })
                                .then(([projectId,]) => res(projectId))
                                .catch(e => rej(e));
                        }
                        else {
                            res(awidgetProjectId);
                        }
                    })
                        .then((widgetProjectId) => Promise.all([widgetProjectId,
                            this.generateOrGetTableauUser(widget, tableauService)]))
                        .then(([widgetProjectId, tableauUserId]) => {
                            this.getInputsDatabaseAndTable(inputWidgetInstanceId)
                                .then(({ database, table }) => {
                                    // const workbookId = this.generateWorkbookId(widgetInstanceId, date);
                                    // we let tableau o generate the id
                                    const workbookName = `${title}`.toLowerCase();
                                    // const datasourceId = this.generateDatasourceId(widgetInstanceId, date);
                                    const datasourceName = this.generateDatasourceId(widgetInstanceId,
                                        inputWidgetInstanceId, new Date());
                                    tableauService.createDatasourceAndWorkbookManager(widgetProjectId, workbookName,
                                        database, table || NO_TABLE_NAME, datasourceName, title, description,
                                        inputWidgetInstanceId, widget, snowflakeWarehouse, workbookFilePath)
                                        .then(resp => {
                                            activityBus.emit(ActivityEventType.WIDGET_DATA, this.userId,
                                                ActivityType.CHART_CREATED, {chartTitle: title}, widget.id);

                                            const newWorkbookId = resp.workbook[0].$.id;
                                            tableauService.updateWorkbookOwner(newWorkbookId, tableauUserId)
                                                .then(() => resolve(resp))
                                                 // we don't want to show an error if we cannot cannot change the owner.
                                                 // In this case the onwer will remain as the admin
                                                .catch(() => resolve(resp));
                                        })
                                        .catch(err => reject(err));
                                })
                                .catch(err => reject(err));
                        })
                        .catch(err => reject(err));

                })
                .catch(err => reject(err));
        });
    }

    /**
     * Basedn on the workpsace id, we create or retrieve the tableau user id that represents whit workspace
     *
     */
    generateOrGetTableauUser(widget, tableauService) {

        // if the tableau user already exists for the widget's workspace
        const workspaceParams = widget.moduleInstance.workspace.parameters;
        if (workspaceParams && workspaceParams.tableauUserId) {
            return Promise.resolve(workspaceParams.tableauUserId);
        }

        const tableauUsername = this.getWidgetTableauUsername(widget.moduleInstance.workspace.id);

        return tableauService.addUserToSite(tableauUsername)
            .then(({exists, tableauUserid}) => {
                if (exists) {
                    // the user already exists.. (may happend in dev or staging)
                    return tableauService.getUserByUsername(tableauUsername)
                        .then(tableauUser => Promise.resolve(tableauUser.id));
                }
                // from Tableau docs: After creating the user, you must set a full name, password,
                // and email address for the user with the call to Update User
                const generatedPassPart1 = Math.random().toString(36).substring(2, 10);
                const generatedPassPart2 = Math.random().toString(36).substring(2, 10).toUpperCase();
                const userPassword = generatedPassPart1 + generatedPassPart2;
                return tableauService.updateUser(tableauUserid, tableauUsername, tableauUsername, userPassword)
                    .then(() => Promise.resolve(tableauUserid));

            })
            .then(tableauUserId => {
                const parameters = {...workspaceParams, tableauUserId};
                return Workspace.update({parameters}, { where: { id: widget.moduleInstance.workspace.id } })
                    .then(() => Promise.resolve(tableauUserId));
            });
    }

    listCharts(widgetInstanceId) {
        const tableauService = new TableauService();
        const widgetService = new WidgetService(this.userId);
        return tableauService.login()
        .then(() => widgetService.getWidget(widgetInstanceId))
        .then(widget => {
            const charts = widget.parameters.charts;
            if (charts && charts.length > 0) {
                return tableauService.getWorkbooksByName(charts.map(chartData => chartData.workbookName))
                    .then(workbooks => tableauService.fetchAllWorkbookPreviewImages(workbooks))
                    .then(workbooks => {
                        const workbooksFull = [];
                        workbooks.forEach(wk => {
                            const additionalData = charts.find(chart => chart.workbookName === wk.contentUrl);
                            if (additionalData) {
                                const ghostInput = !widget.inputs.some(input => input === additionalData.inputWidgetId);
                                workbooksFull.push({
                                    id: wk.id,
                                    name: additionalData.workbookTitle,
                                    description: additionalData ? additionalData.description : 'No description',
                                    contentUrl: wk.contentUrl,
                                    previewImg: ghostInput ? '' : wk.previewImg,
                                    inputWidgetId: additionalData.inputWidgetId,
                                    updatedAt: wk.updatedAt,
                                    ghostInput,
                                    inputHasOutputTable: additionalData.table !== NO_TABLE_NAME,
                                });
                            }
                        });
                        return Promise.resolve(workbooksFull);
                    });
            }
            return Promise.resolve([]);
        })
        .then(workbooks => Promise.resolve({
            server: config.TABLEAU_SERVER,
            site: config.TABLEAU_SITE_NAME,
            charts: workbooks
        }));
    }

    deleteChart(widgetInstanceId, chartId) {
        const tableauService = new TableauService();
        const widgetService = new WidgetService(this.userId);
        return tableauService.login()
            .then(() => widgetService.getWidget(widgetInstanceId))
            .then(widget => {
                const charts = widget.parameters.charts;
                if (charts && charts.length > 0) {
                    const chartIndex = charts.findIndex(chart => chart.workbookId === chartId);
                    if (chartIndex !== -1) {
                        const chartTitle = charts[chartIndex].workbookTitle;
                        const datasourceId = charts[chartIndex].datasourceId;
                        charts.splice(chartIndex, 1);
                        widget.parameters = {...widget.parameters, charts};
                        return Promise.all([datasourceId, chartTitle, widget.save()]);
                    }
                }
                return Promise.reject(new Error('Chart not found'));
            })
            .then(([datasourceId, chartTitle]) => Promise.all([datasourceId, chartTitle,
                tableauService.deleteWorkbook(chartId)]))
            .then(([datasourceId, chartTitle]) => Promise.all([chartTitle,
                tableauService.deleteDatasource(datasourceId)]))
            .then((chartTitle) => {
                activityBus.emit(ActivityEventType.WIDGET_DATA, this.userId, ActivityType.CHART_DELETED,
                    {chartTitle}, widgetInstanceId);
                return Promise.resolve();
            })
            .catch(e => e);
    }

    /**
    * create a visulization Project tree on talbleau
    * @param workspaceId
    * @param widgetInstanceId
    * @returns {promise<any>}
    */
    createVisulizationWidgetProjectTree(widgetInstanceId, workspaceId, widgetCreatedAt) {
        const tableauService = new TableauService();
        return tableauService.login()
            .then(() => workspaceService.getWorkspace(workspaceId, this.userId))
            .then((workspace) => {
                const projectCaseName = this.generateWorkspaceProjectName(workspaceId, workspace.createdAt);
                const projectWidgetName = this.generateWidgetProjectName(widgetInstanceId, widgetCreatedAt);

                return tableauService.getProject(projectCaseName)
                    .then(projs => {
                        if (projs && projs.length > 0) {
                            return Promise.resolve({project: projs[0]});
                        }
                        // not found
                        return tableauService.createProject(projectCaseName, `Thanos Case with id ${workspaceId}`);
                    })
                    .then(workspaceProject => {
                        // this is just in case this widget exists (beacuse we are reusing the same
                        // tableu server with diff envs)
                        return tableauService.getProject(projectWidgetName)
                            .then(projs => {
                                if (projs && projs.length > 0) {
                                    return Promise.resolve(projs[0]);
                                }
                                // not found
                                return tableauService.createProject(projectWidgetName,
                                    `Widget with id ${widgetInstanceId}`,
                                    workspaceProject.project.id);
                            });
                    });
            });
    }

    /**
     * downloads a chart in PDF format.
     */
    downloadPDF(widgetInstanceId, chartId) {
        const tableauService = new TableauService();
        const widgetService = new WidgetService(this.userId);
        return tableauService.login()
            .then(() => widgetService.getWidget(widgetInstanceId))
            .then(widget => {
                const charts = widget.parameters.charts;
                if (charts && charts.length > 0) {
                    const chart = charts.find(chart => chart.workbookId === chartId);
                    if (chart) {
                        const chartTitle = chart.workbookTitle;
                        return Promise.all([chartTitle, tableauService.downloadPDF(chartId)]);
                    }
                }
                return Promise.reject(new Error('Chart not found'));
            })
            .then((result) => {
                activityBus.emit(ActivityEventType.WIDGET_DATA, this.userId, ActivityType.CHART_PDF_DOWNLOADED,
                    {chartTitle: result[0]}, widgetInstanceId);

                return Promise.resolve(result[1]);
            })
            .catch(e => {
                console.log('error: ',e);
                return e;
            });
    }

    /**
     * NOT USED ANYMORE. LEAVE IT HERE IN CASE WE NEED IT
     * This method returns a template in xml for the selected chart.
     * This could be used to create another fresh chart based on the selected chart.
     * @param {*} widgetInstanceId
     * @param {*} chartId
     */
    generateWorkbookTemplate (widgetInstanceId, chartId) {
        const tableauService = new TableauService();
        const widgetService = new WidgetService(this.userId);
        return tableauService.login()
            .then(() => widgetService.getWidget(widgetInstanceId))
            .then(widget => {
                const charts = widget.parameters.charts;
                if (charts && charts.length > 0) {
                    const chart = charts.find(chart => chart.workbookId === chartId);
                    if (chart) {
                        const chartTitle = chart.workbookTitle;
                        return Promise.all([chartTitle, tableauService.downloadWorkbook(chartId)]);
                    }
                }
                return Promise.reject(new Error('Chart not found'));
            })
            .then(([title, workbookXml]) => Promise.all([title, xml2js.parseStringPromise(workbookXml)]))
            .then(([title, jsonXml]) => Promise.all([title, jsonXml,
                fs.promises.readFile(this.twbTemplatePath, 'utf8')]))
            .then(([title, jsonXml, defaultXml]) => Promise.all([title, jsonXml,
                xml2js.parseStringPromise(defaultXml)]))
            .then(([title, jsonXml, defaultJsonXml]) => {
                jsonXml.workbook['repository-location'] = defaultJsonXml.workbook['repository-location'];
                jsonXml.workbook.datasources = defaultJsonXml.workbook.datasources;
                jsonXml.workbook.worksheets[0].worksheet[0]['repository-location'] =
                    defaultJsonXml.workbook.worksheets[0].worksheet[0]['repository-location'];
                const builder = new xml2js.Builder();
                const xml = builder.buildObject(jsonXml);

                // this xml has the user chart 'templated'
                return Promise.all([title, xml]);
            })
            .catch(e => {
                console.log('error: ',e);
                return e;
            });
    }

    /**
     * This method recieves an url of a workbook (.twb only), downloads it, replace necessary fields and
     *  creates a template from it.
     * This template could be used to create a new fresh chart based on the workbook from the url.
     */
    generateWorkbookTemplateFromWorkbookUrl (url) {
        return new Promise((resolve, reject) => {
            axios({ url, responseType: 'stream'}).then(response => {
                if (response.statusCode < 200 || response.statusCode >= 300) {
                    reject(new Error(response));
                }
                const { data } = response;

                let body = '';
                data.on('data', function (chunk) {
                    body += chunk;
                });
                data.on('end', function () {
                    resolve(body);
                });
            }).catch(err => reject(err));
        })
            .then(workbookXml => Promise.all([workbookXml, xml2js.parseStringPromise(workbookXml)]))
            .then(([workbookXml, jsonXml]) => Promise.all([jsonXml,
                fs.promises.readFile(this.twbTemplatePath, 'utf8'), workbookXml]))
            .then(([jsonXml, defaultXml, workbookXml]) => Promise.all([jsonXml,
                xml2js.parseStringPromise(defaultXml), workbookXml]))
            .then(([jsonXml, defaultJsonXml, workbookXml]) => {

                let origName = '';
                jsonXml.workbook.datasources[0].datasource.map(datasource => {
                    if (datasource.$.hasconnection !== 'false') {
                        origName = datasource.$.name;
                    }
                });
                const newName = defaultJsonXml.workbook.datasources[0].datasource[0].$.name;

                // replace name
                const regex = new RegExp(origName, 'gu');
                const newWorkbookXml = workbookXml.replace(regex, newName);

                return Promise.all([xml2js.parseStringPromise(newWorkbookXml), defaultJsonXml]);
            })
            .then(([jsonXml, defaultJsonXml]) => {
                jsonXml.workbook['repository-location'] = defaultJsonXml.workbook['repository-location'];

                // datasource

                jsonXml.workbook.datasources[0].datasource.map(datasource => {
                    if (datasource.$.hasconnection !== 'false') {
                        datasource.$ = defaultJsonXml.workbook.datasources[0].datasource[0].$;
                        datasource['repository-location'] = defaultJsonXml.workbook.datasources[0]
                            .datasource[0]['repository-location'];
                        datasource.connection[0].$ = defaultJsonXml.workbook.datasources[0].datasource[0]
                            .connection[0].$;
                        datasource.connection[0].relation[0] = defaultJsonXml.workbook.datasources[0].datasource[0]
                            .connection[0].relation[0];
                        datasource.connection[0]['metadata-records'][0]['metadata-record'].map(md => {
                            md['parent-name'][0] = '[sqlproxy]';
                        });
                    }
                });


                jsonXml.workbook.worksheets[0].worksheet[0]['repository-location'] =
                    defaultJsonXml.workbook.worksheets[0].worksheet[0]['repository-location'];
                jsonXml.workbook.worksheets[0].worksheet[0].table[0].view[0].datasources[0]
                    .datasource[0].$.caption = '{{datasourceName}}';

                // rename first window to sheet 1 so the front can bind the iframe
                const firstWindowName = jsonXml.workbook.windows[0].window[0].$.name;
                const firstWindowRefClass = jsonXml.workbook.windows[0].window[0].$.class;
                jsonXml.workbook.windows[0].window[0].$.name = 'Sheet 1';

                if (firstWindowRefClass === 'dashboard') {
                    const refDashboard = jsonXml.workbook.dashboards[0].dashboard.find(dashboard =>
                            dashboard.$.name === firstWindowName);
                    refDashboard.$.name = 'Sheet 1';
                }
                else {
                    // lets asume is a worksheet
                    const refWorksheet = jsonXml.workbook.worksheets[0].worksheet.find(worksheet =>
                            worksheet.$.name === firstWindowName);
                    refWorksheet.$.name = 'Sheet 1';
                }
                ///

                const builder = new xml2js.Builder();
                const xml = builder.buildObject(jsonXml);

                // this xml is the workbook'templated'
                return xml;
            })
            .catch(e => {
                console.log('error: ',e);
                return Promise.reject(e);
            });
    }

    /**
     * creates a new chart from the workbook url (workbookURL)  - (accepts .twb paths only)
     */
    createChartFromUrl(widgetInstanceId, inputWidgetInstanceId, title, description, workbookURL) {
        const tempFileName = `wb_${widgetInstanceId}_${inputWidgetInstanceId}_${Date.now()}`;
        const tempWorkbookFilePath = `${__dirname}/../../../files/tableauTemplates/temp/${tempFileName}`;

        return this.generateWorkbookTemplateFromWorkbookUrl(workbookURL)
            .then(templateXml => {
                fs.writeFileSync(tempWorkbookFilePath, templateXml);
                return Promise.resolve();
            })
            .then(() => this.createChartFromFile(widgetInstanceId, inputWidgetInstanceId, title, description,
                            tempWorkbookFilePath))
            .then(response => {
                fs.unlinkSync(tempWorkbookFilePath);
                return response;
            }).catch(e => {
                fs.unlinkSync(tempWorkbookFilePath);
                return Promise.reject(e);
            });
    }

    /**
     * init chart with config data
     * * @param config - JSON object with the following structure:
     *  - title
     *  - decription [optional]
     *  - inputWidgetSlug
     *  - workbookURL
     *
     */
    createChartFromConfig(widgetInstanceId, config) {

        const { title, description, inputWidgetSlug, workbookURL } = config;

        return WidgetRelation.findAll({
            where: {toWidgetInstanceId: widgetInstanceId},
            attributes: ['fromWidgetInstanceId'],
            include: [
                {
                    model: WidgetInstance,
                    as: 'fromInstance',
                    attributes: ['id', 'slug']
                }
            ]
        })
            .then(inputWidgetRelations => {
                return inputWidgetRelations.find(inputWidget =>
                inputWidget.fromInstance.slug === inputWidgetSlug);
            })
            .then(inputWidgetInstance => {
                if (inputWidgetInstance) {
                    return this.createChartFromUrl(widgetInstanceId, inputWidgetInstance.fromInstance.id, title,
                        description, workbookURL);
                }
                return Promise.reject(new Error('Specified InputSlug is not an input of this widget'));

            })
            .catch(e => {
                log.error('Error while trying to create Chart from url', e);
                return Promise.reject(e);
            });
    }


    getWidgetTableauUsername (id) {
        return `workspace_${id}`;
    }

    getTrustedToken(widgetInstanceId) {
        const tableauService = new TableauService();
        const widgetService = new WidgetService(this.userId);
        return widgetService.getWidget(widgetInstanceId)
            .then(widget => {
                const username = this.getWidgetTableauUsername(widget.moduleInstance.workspaceId);
                return tableauService.createTrustedAuthenticationTicket(username);
            })
            .catch(e => {
                log.error('error getting trusted auth token: ', e);
                return Promise.reject(e);
            });
    }

}


module.exports = VisualizationService;