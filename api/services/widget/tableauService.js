const fs = require("fs").promises;
const axios = require('axios');
const { createOrEditDatasourceWithCurl, createOrEditWorkbookWithCurl } = require('../../helpers/curl');
const config = require('../../../config');
const qs = require('querystring');
const jwt = require('jsonwebtoken');

// a more powerful role could be Creator or even more powerful SiteAdministratorCreator
const DEFAULT_USER_ROLE = 'ExplorerCanPublish';

class TableauService {

  constructor() {

    this.projectRootId = config.TABLEAU_PROJECT_ROOT;
    this.server = config.TABLEAU_SERVER;
    this.ticketServer = config.TABLEAU_SERVER_TICKET_MIDDLEWARE || config.TABLEAU_SERVER;
    this.apiServer = `${this.server}/api/3.6`;
    this.credentials = {
        name: config.TABLEAU_USERNAME,
        password: config.TABLEAU_PASSWORD,
        site: {
          contentUrl: config.TABLEAU_SITE_NAME
        }
    };
    this.config = {
      headers: {
          "content-type": "application/json",
          "accept": "application/json"
      }
    };
    this.xmlconfig = {
        headers: {
            "content-type": "application/xml",
            "accept": "application/xml"
        }
    };
    this.pdfconfig = {
        headers: {
            "content-type": "application/pdf",
            "accept": "*/*",
            "Cache-Control": "no-cache",
        },
      };

    const appRoot = global.appRoot ? global.appRoot : `${__dirname}/../../..`;
    this.XMLTemplatePath = `${appRoot}/files/tableauTemplates/workbook_template.xml`;
    this.TWBTemplatePath =`${appRoot}/files/tableauTemplates/workbook_template.twb`;

    this.XMLTemplateDatasourcePath = `${appRoot}/files/tableauTemplates/datasource_template.xml`;
    this.TDSTemplateDatasourcePath =`${appRoot}/files/tableauTemplates/datasource_template.tds`;

  }

  /**
   * perform tableau login
   * @returns {Promise<any>}
   */
  login() {
    if (this.session) {
      return Promise.resolve({logged: true});
    }
    return new Promise((resolve, reject) => {
      axios.post(`${this.apiServer}/auth/signin`, {
        credentials: this.credentials
      }, this.config)
      .then((response) => {
        const { credentials } = response.data;
        this.session = {
          siteId: credentials.site.id,
          userId: credentials.user.id,
          token: credentials.token
        };
        this.config.headers['X-Tableau-Auth'] = this.session.token;
        this.xmlconfig.headers['X-Tableau-Auth'] = this.session.token;
        this.pdfconfig.headers['X-Tableau-Auth'] = this.session.token;
        console.log('Logged In on Tableau');
        resolve({logged: true});
      })
      .catch(error => reject(new Error(error.message)));
    });
  }


  isSuccessResponse(response) {
    return response.status >= 200 || response.status < 300;
  }

  getUserByUsername(username) {
    if (!this.session)
      return Promise.reject(new Error("There is no session, please login first"));

    return new Promise((resolve, reject) => {
      axios.get(`${this.apiServer}/sites/${this.session.siteId}//users?filter=name:eq:${username}`, this.config)
        .then(response => {
            if (!this.isSuccessResponse(response)) {
                reject(response.message);
                return;
            }
            // const { id, name, description, contentUrl, webpageUrl, updatedAt } = workbooks[0];
            if (response.data.users.user) {
                resolve(response.data.users.user[0]);
            }
            else {
              reject(new Error('user not found on tableau'));
            }
        })
        .catch(error => reject(new Error(error.message)));
    });
  }


  /**
   * Get a project by filter name
   * @param projectName
   * @returns {Promise<any>}
   */
  getProject(projectName) {
    if (!this.session) {
      return Promise.reject(new Error("There is no session, please login first"));
    }

    return new Promise((resolve, reject) => {
      axios.get(`${this.apiServer}/sites/${this.session.siteId}/projects?filter=name:eq:${projectName}`, this.config)
      .then(response => {
        if (!this.isSuccessResponse(response)) {
          reject(response.message);
          return;
        }
        if (response.data.projects.project) {
            const { project: projects } = response.data.projects;
            resolve(projects);
        }
        else {
            resolve([]);
        }
      })
      .catch(error => reject(new Error(error.message)));
    });
  }

  downloadWorkbook(workbookId) {
    if (!this.session) {
      return Promise.reject(new Error("There is no session, please login first"));
    }

    return new Promise((resolve, reject) => {
      axios.get(`${this.apiServer}/sites/${this.session.siteId}/workbooks/${workbookId}/content?includeExtract=False`,
        this.config)
      .then(response => {

        if (!this.isSuccessResponse(response)) {
          reject(response.message);
          return;
        }
        resolve(response.data);
      })
      .catch(error => reject(new Error(error.message)));
    });
  }

  downloadPDF(workbookId) {
    if (!this.session) {
      return Promise.reject(new Error("There is no session, please login first"));
    }

    return new Promise((resolve, reject) => {
        axios({
          method: "get",
          url: `${this.apiServer}/sites/${this.session.siteId}/workbooks/${workbookId}/pdf`,
          responseType: "stream",
          headers: this.pdfconfig.headers
      })
      .then(response => {
        if (!this.isSuccessResponse(response)) {
          reject(response.message);
          return;
        }
        resolve(response.data);
      })
      .catch(error => reject(new Error(error.message)));
    });
  }

  /**
   * create a new project on tableau
   * @param projectName
   * @param projectDescription
   * @param parentProjectId
   * @returns {Promise<any>}
   */
  createProject(projectName, projectDescription = '', parentProjectId = this.projectRootId) {
    if (!this.session) {
      return Promise.reject(new Error("There is no session, please login first"));
    }

    return new Promise((resolve, reject) => {
      axios.post(`${this.apiServer}/sites/${this.session.siteId}/projects`,{
        project: {
          name: projectName,
          description: projectDescription,
          parentProjectId,
        }
      }, this.config)
      .then(response => {
        if (!this.isSuccessResponse(response)) {
          reject(response.message);
          return;
        }
        resolve(response.data);
      })
      .catch(error => reject(new Error(error.message)));
    });
  }

  tagWorkbook(workbookId, tag) {
      console.log('TAGGING: ', {workbookId, tag});
    if (!this.session) {
        return Promise.reject(new Error("There is no session, please login first"));
      }

      return new Promise((resolve, reject) => {
        axios.put(`${this.apiServer}/sites/${this.session.siteId}/workbooks/${workbookId}/tags`,
        `<tsRequest><tags><tag label="${tag}" /></tags></tsRequest>`,this.xmlconfig)
        .then(response => {
          if (!this.isSuccessResponse(response)) {
            reject(response.message);
            return;
          }
          resolve(response.data);
        })
        .catch(error => reject(new Error(error.message)));
      });
  }

  createDatasourceAndWorkbookManager(projectId, workbookName, database, table, datasourceName, title, description,
    inputWidgetInstanceId, widget, snowflakeWarehouse, workbookFilePath) {
    return new Promise((resolve, reject) => {
      this.createOrUpdateDatasource(projectId, database, table, datasourceName, snowflakeWarehouse)
        .then(dsResponse => {
            const datasource = Object.values(dsResponse.datasource[0])[0];
            return Promise.all([datasource,
                this.createWorkbook(projectId, workbookName, datasource.contentUrl, title, workbookFilePath)]);
        })
        .then(([datasource, wbkResponse]) => {

            const workbook = Object.values(wbkResponse.workbook[0])[0];
            // update widget instance with new workbook and datasource data.
            const parameters = widget.parameters;

            const newChart = {
                workbookId: workbook.id,
                // need to store our own title because tableau will not let us to update it
                workbookTitle: title,
                workbookName: workbook.contentUrl,
                datasourceId: datasource.id,
                datasourceName: datasource.contentUrl,
                database,
                table,
                inputWidgetId: inputWidgetInstanceId,
                // need to store our own title because tableau does not have a description for workbooks
                description,
            };
            parameters.charts.push(newChart);
            widget.parameters = parameters;
            return Promise.all([wbkResponse, widget.save()]);
        })
        .then(([wbkResponse]) => {
            resolve(wbkResponse);
        })
        .catch(err => reject(err.message));
    });
  }

  /**
   * create a new workbook
   * @param projectId
   * @param workbookname
   * @returns {Promise<any>}
   */
  createOrUpdateDatasource(projectId, database, table, datasourceName, snowflakeWarehouse) {
    if (!this.session) {
      return Promise.reject(new Error("There is no session, please login first"));
    }

    return new Promise((resolve, reject) => {
      let promises = [];

      promises.push(fs.readFile(this.XMLTemplateDatasourcePath, 'utf8'));
      promises.push(fs.readFile(this.TDSTemplateDatasourcePath, 'utf8'));

      Promise.all(promises).then(([xmlFile, tdsFile]) => {
        xmlFile = xmlFile.replaceAll("{{id}}", datasourceName);
        xmlFile = xmlFile.replaceAll('{{snowflakeUser}}',snowflakeWarehouse.username);
        xmlFile = xmlFile.replaceAll('{{snowflakePass}}',snowflakeWarehouse.password);
        xmlFile = xmlFile.replaceAll('{{datasourcesProjectId}}', projectId);

        tdsFile = tdsFile.replaceAll("{{id}}", datasourceName);
        tdsFile = tdsFile.replaceAll("{{siteName}}", this.credentials.site.contentUrl);
        tdsFile = tdsFile.replaceAll('{{snowflakeUser}}', snowflakeWarehouse.username);
        tdsFile = tdsFile.replaceAll("{{snowflakeServer}}", `${snowflakeWarehouse.account}.snowflakecomputing.com`);
        tdsFile = tdsFile.replaceAll("{{database}}", database);
        tdsFile = tdsFile.replaceAll("{{table}}", table);
        return [xmlFile, tdsFile];

      }).then(([xmlFile, tdsFile]) => {

        const xmlName = `datasource_copy-${Date.now()}.xml`;
        const tdsName = `datasource_copy-${Date.now()}.tds`;

        const promise1 = fs.writeFile(xmlName, xmlFile, "utf8");
        const promise2 = fs.writeFile(tdsName, tdsFile, "utf8");

        Promise.all([promise1, promise2]).then(() => {
          createOrEditDatasourceWithCurl(xmlName, tdsName, this.session, this.apiServer, resolve, reject, true);
        });
      })
      .catch(err => reject(err.message));
   });
  }

  createTrustedAuthenticationTicket(username) {

    let headers = {};
    let body = { username, target_site: config.TABLEAU_SITE_NAME};
    // The following code block is required because when run locally developers will have all different dynamic IPs
    // and Tableau Server must whitelist those IPs to retrieve a trusted ticket. Therefore, locally we call a
    // middleware whose IP will be on that whitelist.
    if (config.TABLEAU_SERVER_TICKET_MIDDLEWARE) {
      // jwt token with a life of 30 seconds.
      const accessToken = jwt.sign({exp: Math.floor(Date.now() / 1000) + 30 }, config.TABLEAU_SERVER_TICKET_SECRET);
      headers['access-token'] = accessToken;
      headers['Content-Type'] = 'application/json';
    }
    else {
      body = qs.stringify(body);
      headers['Content-Type'] = 'application/x-www-form-urlencoded';
    }

    return new Promise((resolve, reject) => {
      axios.post(`${this.ticketServer}/trusted`, body,
        { headers })
      .then(response => {
        if (!this.isSuccessResponse(response)) {
          reject(response.message);
          return;
        }
        resolve(response.data);
      })
      .catch(error => {
        console.log('error', error);
        reject(new Error(error.message));
      });
    });
}

  /**
   * create a new workbook
   * @param projectId
   * @param workbookId
   * @returns {Promise<any>}
   */
  createWorkbook(projectId, workbookName, datasourceId, title, workbookFilePath) {
    if (!this.session) {
      return Promise.reject(new Error("There is no session, please login first"));
    }

    return new Promise((resolve, reject) => {

      let promises = [];
      promises.push(fs.readFile(this.XMLTemplatePath, 'utf8'));
      promises.push(fs.readFile(workbookFilePath, 'utf8'));

      Promise.all(promises).then(([xmlFile, twbFile]) => {
        xmlFile = xmlFile.replaceAll('{{workbook_name}}',title);
        xmlFile = xmlFile.replaceAll('{{project_id}}', projectId);

        twbFile = twbFile.replaceAll("{{datasourceName}}", datasourceId);
        twbFile = twbFile.replaceAll("{{datasourceId}}", datasourceId);
        twbFile = twbFile.replaceAll("{{siteName}}", this.credentials.site.contentUrl);
        twbFile = twbFile.replaceAll("{{workbookId}}", workbookName);
        return [xmlFile, twbFile];

      }).then(([xmlFile, twbFile]) => {

        // console.log(twbFile);
        // console.log('==========================================');
        // console.log(xmlFile);

        const xmlName = `workbook_copy-${Date.now()}.xml`;
        const twbName = `workbook_copy-${Date.now()}.twb`;

        const promise1 = fs.writeFile(xmlName, xmlFile, "utf8");
        const promise2 = fs.writeFile(twbName, twbFile, "utf8");

        Promise.all([promise1, promise2]).then(() => {
          createOrEditWorkbookWithCurl(xmlName, twbName, this.session, this.apiServer, resolve, reject);
        });
      });
   });
  }

  /**
   * get a workbook by id
   * @param workbookId
   * @returns {Promise<any>}
   */
  getWorkbook(workbookId) {
    if (!this.session)
      return Promise.reject(new Error("There is no session, please login first"));

    return new Promise((resolve, reject) => {
      const workbookUrl = `${this.apiServer}/sites/${this.session.siteId}/workbooks/${workbookId}`;
      const workbookPromise = axios.get(workbookUrl, this.config);
      const workbookPreviewImagePromise = axios.get(`${workbookUrl}/previewImage`, this.config);

      Promise.all([workbookPromise, workbookPreviewImagePromise]).then(response => {
        const workbookResp = response[0];
        const workBookImgResp = response[1];
        if (!this.isSuccessResponse(workbookResp)) {
          reject(workbookResp.message);
          return;
        }
        const workbookData = workbookResp.data;
        const { id, name, description, contentUrl, webpageUrl, updatedAt } = workbookData.workbook;
        resolve({ id, name, description, contentUrl, webpageUrl, updatedAt, previewUrl: workBookImgResp.data});
      })
      .catch(error => reject(new Error(error.message)));
    });
  }

  /**
   * deletes a workbook by id
   * @param workbookId
   * @returns {Promise<any>}
   */
  deleteWorkbook(workbookId) {
    if (!this.session)
      return Promise.reject(new Error("There is no session, please login first"));

    return new Promise((resolve, reject) => {
      const workbookUrl = `${this.apiServer}/sites/${this.session.siteId}/workbooks/${workbookId}`;
      axios.delete(workbookUrl, this.config)
        .then(workbookResp => {
            if (!this.isSuccessResponse(workbookResp)) {
                reject(workbookResp.message);
                return;
            }
            resolve(true);
        })
        .catch(error => reject(new Error(error.message)));
    });
  }

  /**
   * deletes a data source by id
   * @param datasourceId
   * @returns {Promise<any>}
   */
  deleteDatasource(datasourceId) {
    if (!this.session)
      return Promise.reject(new Error("There is no session, please login first"));

    return new Promise((resolve, reject) => {
      const datasrouceUrl = `${this.apiServer}/sites/${this.session.siteId}/datasources/${datasourceId}`;
      axios.delete(datasrouceUrl, this.config)
        .then(dsResp => {
            if (!this.isSuccessResponse(dsResp)) {
                reject(dsResp.message);
                return;
            }
            resolve(true);
        })
        .catch(error => reject(new Error(error.message)));
    });
  }

  /**
   * get a workbook by name
   * @param workbookName
   * @returns {Promise<any>}
   */
  getWorkbookByName(workbookName) {

    if (!this.session)
      return Promise.reject(new Error("There is no session, please login first"));

    return new Promise((resolve, reject) => {
      axios.get(`${this.apiServer}/sites/${this.session.siteId}/workbooks?filter=name:eq:${workbookName}`, this.config)
      .then(workbookResp => {
        if (!this.isSuccessResponse(workbookResp)) {
          reject(workbookResp.message);
          return;
        }
      //const workbookPreviewImagePromise = axios.get(`${workbookUrl}/previewImage`, this.config);
        //workbookData.workbook.previewImg = workBookImgResp.data;

        const { workbook: workbooks } = workbookResp.data.workbooks;
        const { id, name, description, contentUrl, webpageUrl, updatedAt } = workbooks[0];
        resolve({ id, name, description, contentUrl, webpageUrl, updatedAt, previewUrl: ''});
      })
      .catch(error => reject(new Error(error.message)));
    });
  }

  /**
   * get a workbook preview image by workbook id
   * @param workbookId
   * @returns {Promise<any>}
   */
  getWorkbookPreviewImage(workbookId) {
    if (!this.session) {
      return Promise.reject(new Error("There is no session, please login first"));
    }
    return axios.get(`${this.apiServer}/sites/${this.session.siteId}/workbooks/${workbookId}/previewImage`, {
      headers: { 'X-Tableau-Auth': this.session.token }, responseType: 'arraybuffer'
    });
  }

  /**
   * fetch all images of given array of workbooks
   * @TODO need refactor/redesign
   * @param workbooks {array}
   * @returns {Promise<any>}
   */
  fetchAllWorkbookPreviewImages(workbooks) {

    if (workbooks.length === 0)
        return Promise.resolve(workbooks);

    let promises = [];
    const workbooksWithPreviewImg = [];
    for (let i = 0; i < workbooks.length; i++) {
      promises.push(this.getWorkbookPreviewImage(workbooks[i].id));
    }
    return Promise.all(promises).then(responses => {
        workbooks.forEach((workbook, idx) => {
            workbook.previewImg = Buffer.from(responses[idx].data).toString('base64');
            workbooksWithPreviewImg.push(workbook);
        });
      return Promise.resolve(workbooksWithPreviewImg);
    }).catch(() => {
        console.log('could not get preview images');
        // we resolve anyway beacuase we do not want to cancel the request just for the Preview Image part.
        return Promise.resolve(workbooks);
    });
  }


  getWorkbooksByName(names) {
    if (!this.session)
      return Promise.reject(new Error("There is no session, please login first"));

    return new Promise((resolve, reject) => {
      axios.get(`${this.apiServer}/sites/${this.session.siteId}/workbooks?filter=contentUrl:in:[${names}]`, this.config)
        .then(workbookResp => {
            if (!this.isSuccessResponse(workbookResp)) {
                reject(workbookResp.message);
                return;
            }
            // const { id, name, description, contentUrl, webpageUrl, updatedAt } = workbooks[0];
            if (workbookResp.data.workbooks.workbook) {
                resolve(workbookResp.data.workbooks.workbook);
            }
            else {
                resolve([]);
            }
        })
        .catch(error => reject(new Error(error.message)));
    });
  }

  getWorkbooksByTag(tag) {
    if (!this.session)
      return Promise.reject(new Error("There is no session, please login first"));

    return new Promise((resolve, reject) => {
      axios.get(`${this.apiServer}/sites/${this.session.siteId}/workbooks?filter=tags:eq:${tag}`, this.config)
        .then(workbookResp => {
            if (!this.isSuccessResponse(workbookResp)) {
                reject(workbookResp.message);
                return;
            }
            // const { id, name, description, contentUrl, webpageUrl, updatedAt } = workbooks[0];
            if (workbookResp.data.workbooks.workbook) {
                resolve(workbookResp.data.workbooks.workbook);
            }
            else {
                resolve([]);
            }
        })
        .catch(error => reject(new Error(error.message)));
    });
  }

   /**
   * create a new user
   */
  addUserToSite(name) {
    if (!this.session) {
      return Promise.reject(new Error("There is no session, please login first"));
    }

    return new Promise((resolve, reject) => {
      axios.post(`${this.apiServer}/sites/${this.session.siteId}/users`,{
        user: {
          name,
          siteRole: DEFAULT_USER_ROLE,
          authSetting: 'ServerDefault',
        }
      }, this.config)
      .then(response => {
        if (!this.isSuccessResponse(response)) {
          reject(response.message);
          return;
        }

        if (response.data && response.data.user && response.data.user.id) {
          resolve({exists: false, tableauUserid: response.data.user.id});
        }
        else {
          reject(new Error('User creation response has no id'));
        }
      })
      .catch(error => {
         // user already exists on tableau. Could happend on DEV env.
         if (error && error.response && error.response.status === 409) {
          resolve({exists: true});
        }
        reject(new Error(error.message));
      });
    });
  }

  /**
   * create a new user
   */
  updateUser(tableauUserId, name, fullName, password) {
    if (!this.session) {
      return Promise.reject(new Error("There is no session, please login first"));
    }

    return new Promise((resolve, reject) => {
      axios.put(`${this.apiServer}/sites/${this.session.siteId}/users/${tableauUserId}`,{
        user: {
          fullName,
          password,
          email: name,
          siteRole: DEFAULT_USER_ROLE,
        }
      }, this.config)
      .then(response => {
        if (!this.isSuccessResponse(response)) {
          reject(response.message);
          return;
        }

        resolve(tableauUserId);
      })
      .catch(error => {
        console.log("Error when trying to update tableau user", error);
        // there are a lot of scenarios where this could fail on Online version but not on Server version, etc.
        resolve(tableauUserId);
      });
    });
  }

  /**
   * changes the workbook owner
   */
  updateWorkbookOwner(workbookId, ownerId) {
    if (!this.session) {
      return Promise.reject(new Error("There is no session, please login first"));
    }

    return new Promise((resolve, reject) => {
      axios.put(`${this.apiServer}/sites/${this.session.siteId}/workbooks/${workbookId}`,{
        workbook: {
         owner: {
           id: ownerId
         }
        }
      }, this.config)
      .then(response => {
        if (!this.isSuccessResponse(response)) {
          reject(response.message);
          return;
        }

        resolve(response);
      })
      .catch(error => reject(new Error(error.message)));
    });
  }


 }

  /**
 * prototype helper function
 */
String.prototype.replaceAll = function(search, replace) {
  if (replace === undefined) {
      return this.toString();
  }
  return this.split(search).join(replace);
  };

  module.exports = TableauService;