const { Readable } = require('stream');
const DataSourceService = require('../storage/dataSourceService');

class FileSourceService {
    constructor(workspaceId, widgetInstanceId, userId) {
        this.widgetInstanceId = widgetInstanceId;
        this.userId = userId;
        this.dataSourceService = new DataSourceService(workspaceId, widgetInstanceId, userId);
    }

    getUploadToken(tabName, filename, fileIdHash, size, schema) {
        return this.dataSourceService.getDataStoreToken(fileIdHash, filename, size, schema, tabName);
    }

    upload(token, stream) {
        return this.dataSourceService.storeData(token, stream);
    }

    uploadSync(token, data) {
        return new Promise((resolve, reject) => {
            const stream = new Readable({objectMode: true});
            this.dataSourceService.storeData(token, stream, resolve)
                .catch(e => reject(e));

            data.map(row => stream.push(row));
            stream.push(null);
        });
    }

    listVersions() {
        return Promise.all([
            this.dataSourceService.listVersions(),
            this.dataSourceService.getCurrentVersion(),
        ]).then(([versions, currentVersion]) => {
            return Promise.resolve({versions, currentVersion});
        });
    }

    setVersion(version) {
       return this.dataSourceService.setCurrentVersion(version);
    }

    preview() {
        return this.dataSourceService.getFileStream({offset: 0, limit: 1000})
            .then(({stream}) => Promise.resolve(stream));
    }

    download(version) {
        return this.dataSourceService.getFileStream({version})
            .then(({stream, dataSource}) => {
                const filename = `${dataSource.filename}${dataSource.tabName ? `(${dataSource.tabName})` : ''}.csv`;
                return Promise.resolve({stream, filename});
            });
    }
}

module.exports = FileSourceService;