const { ModuleInstance, ModuleInstanceSetup } = require('../../model');
const pipelineService = require('../pipeline/pipelineService');
const { ActivityType } = require('../../util/enums');

class AppSetupService {

    constructor(userId) {
        this.userId = userId;
    }

    getModuleSetup(moduleInstanceId) {
        return ModuleInstance.findOne({
            where: {id: moduleInstanceId},
            include: [ModuleInstanceSetup]
        })
            .then(moduleInstance => {
                // if this module has not a setup configured
                if (!moduleInstance.moduleInstanceSetup)
                    return Promise.reject(new Error('Module does not have a Setup configured'));

                return moduleInstance.moduleInstanceSetup;
            });
    }

    listSetupTabs(moduleInstanceId) {
        return this.getModuleSetup(moduleInstanceId).then(setup => setup.tabs);
    }

    markSetupAsCompleted(moduleInstanceId) {
        return this.getModuleSetup(moduleInstanceId).then(setup => {
            const hasBadTabs = setup.tabs.some(tab => !tab.good);

            if (hasBadTabs)
                return Promise.reject(new Error('Setup has incomplete tabs. The action cannot be performed.'));

            return Promise.all([
                pipelineService.publishPipelineModuleEvent(this.userId, ActivityType.SETUP_FINISHED,
                moduleInstanceId),
                setup.update({ isCompleted: true })
            ]).then(([pipelineResp]) => pipelineResp);
        });
    }

    /**
     * method that registers if a specific setup tab has all required data set
     * @param {*} moduleInstanceId
     * @param {*} tabKey
     * @param {*} good
     */
    markTabAsGood(moduleInstanceId, tabKey, good) {
        return this.getModuleSetup(moduleInstanceId).then(setup => {
            const tabs = setup.tabs;
            const tab = tabs.find(tab => tab.key === tabKey);

            if (!tab) return Promise.reject(new Error('Module does not have a Setup configured'));

            // tells us if this tab has all required fields set.
            tab.good = good;

            const goodTabs = tabs.reduce((count, atab) => atab.good ? count+1 : count, 0);
            const progress = Math.round(goodTabs / tabs.length * 100);
            return ModuleInstanceSetup.update({tabs, progress}, {where: {id: setup.id}});
        });
    }

    /**
     * set parameters to this setup instance
     * @param {} moduleInstanceId
     * @param {*} parameters
     */
    setParameters(moduleInstanceId, parameters) {
        const { sequelize } = ModuleInstanceSetup; // TODO: Inject when Inversify implemented

        return this.getModuleSetup(moduleInstanceId).then(setup => {
            return sequelize.transaction(transaction => {
                const updatedParameters = { ...setup.parameters, ...parameters };
                return ModuleInstanceSetup.update({parameters: updatedParameters}, {where: {id: setup.id},
                    transaction});
            });
        });
    }

    /**
     * get this Setup instance parameters
     * @param {} moduleInstanceId
     */
    getParameters(moduleInstanceId) {
        return this.getModuleSetup(moduleInstanceId).then(setup => setup.parameters);
    }


}
module.exports = AppSetupService;