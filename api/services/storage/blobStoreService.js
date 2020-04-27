const { WarehouseAccount, Workspace } = require('../../model');
const { BlobServiceClient, SharedKeyCredential } = require('@azure/storage-blob');

/**
 * Wrapper to call blob storage to save out files for File Source widget
 * NOTE: Currently, we are not saving anything to blob - just going straight to data warehouse - so this is unused
 * Consider in future simultaneously streaming uploaded data both to blob and table storage.
 */
class BlobStoreService {
    constructor(workspaceId) {
        this.workspaceId = workspaceId;
    }

    connect() {
        return Workspace.findOne({where: {id: this.workspaceId}, include: [WarehouseAccount]})
            .then(workspace => {
                this.containerName = workspace.warehouseName;
                const {blobAccount, blobAccountKey} = workspace.warehouseAccount;

                const sharedKeyCredential = new SharedKeyCredential(blobAccount, blobAccountKey);
                this.blobServiceClient = new BlobServiceClient(
                    `https://${blobAccount}.blob.core.windows.net`,
                    sharedKeyCredential
                );
            })
            .catch(e => Promise.reject(e));
    }

    createContainer() {
        return this.blobServiceClient.createContainer(this.containerName);
    }

    save(blobName, stream) {
        const containerClient = this.blobServiceClient.getContainerClient(this.containerName);
        const blobClient = containerClient.getBlobClient(blobName);
        const blockBlobClient = blobClient.getBlockBlobClient();
        return blockBlobClient.uploadStream(stream);
    }
}

module.exports = BlobStoreService;