const fs = require("fs").promises;
const { exec } = require('child_process');
const parseString = require('xml2js').parseString;

/**
   * create or edit a element using curl, used on datasource and workbooks
   * @param xmlName
   * @param twbName
   * @param resolve
   * @param reject
   * @param isEdit
   * @returns {Promise<any>}
   */
  function createOrEditElementWithCurl(curl, resolve, reject, filesToDelete) {
    exec(curl, (err, stdout) => {
      filesToDelete.forEach(el => fs.unlink(el));

      if (err) {
        reject(new Error(err.message));
      }
      parseString(stdout, (err, result) => {

        if (err) {
          reject(new Error(err.message));
        }

        if (result.tsResponse.error) {
          const error = result.tsResponse.error[0];
          reject(new Error(error.detail[0]));
          return;
        }
        resolve(result.tsResponse);
      });
     });
  }

/**
   * create or edit a datasources using curl
   * @param xmlName
   * @param twbName
   * @param session {object}
   * @param server
   * @param resolve
   * @param reject
   * @param isEdit
   * @returns {Promise<any>}
   */
  function createOrEditDatasourceWithCurl(xmlName, tdsName, session, server, resolve, reject, isEdit = false) {
    const curl =`curl "${server}/sites/${session.siteId}/datasources?overwrite=${isEdit}" -X POST -H "X-Tableau-Auth:${session.token}" -H "Content-Type: multipart/mixed;" -F "request_payload=@${xmlName}" -F "tableau_datasource=@${tdsName}"`;
    createOrEditElementWithCurl(curl, resolve, reject, [xmlName, tdsName]);
  }

/**
   * create or edit a workbook using curl
   * @param xmlName
   * @param twbName
   * @param session {object}
   * @param server
   * @param resolve
   * @param reject
   * @param isEdit
   * @returns {Promise<any>}
   */
  function createOrEditWorkbookWithCurl(xmlName, twbName, session, server, resolve, reject, isEdit = false) {
    const curl =`curl "${server}/sites/${session.siteId}/workbooks?overwrite=${isEdit}" -X POST -H "X-Tableau-Auth:${session.token}" -H "Content-Type: multipart/mixed;" -F "request_payload=@${xmlName}" -F "tableau_workbook=@${twbName}"`;
    createOrEditElementWithCurl(curl, resolve, reject, [xmlName, twbName]);
  }


  module.exports = {
    createOrEditWorkbookWithCurl,
    createOrEditDatasourceWithCurl
  };