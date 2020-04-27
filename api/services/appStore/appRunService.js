const { ModuleInstance, ModuleInstanceRun } = require('../../model');

class AppRunService {

    getModuleRun(moduleInstanceId) {
        return ModuleInstance.findOne({
            where: {id: moduleInstanceId},
            include: [ModuleInstanceRun]
        })
        .then(moduleInstance => {
             // if this module does not have a run configured
            if (!moduleInstance.moduleInstanceRun)
                return Promise.reject(new Error('Module does not have a Run configured'));

            return moduleInstance.moduleInstanceRun;
        });
    }

    listRunTabs(moduleInstanceId) {
        return this.getModuleRun(moduleInstanceId).then(run => run.tabs);
    }

    /**
     * method that registers if a specific run tab has all required data set
     * @param {*} moduleInstanceId
     * @param {*} tabKey
     * @param {*} good
     */
    markTabAsGood(moduleInstanceId, tabKey, good) {
        return this.getModuleRun(moduleInstanceId).then(run => {
            const tabs = run.tabs;
            const tab = tabs.find(tab => tab.key === tabKey);

            if (!tab) return Promise.reject(new Error('Module does not have a Run configured'));

            // tells us if this tab has all required fields set.
            tab.good = good;

            const goodTabs = tabs.reduce((count, atab) => atab.good ? count+1 : count, 0);
            const progress = Math.round(goodTabs / tabs.length * 100);
            return ModuleInstanceRun.update({tabs, progress}, {where: {id: setup.id}});
        });
    }

    // Method to add WidgetInstanceId to all Run tabs list
    addWidgetInstanceIdToTabs(tabs, widgetInstances) {
        if(tabs) {
            tabs.map(tab => {
                if(tab.key) {
                    // There is a slug input for that widget. Find the instance.
                    const widgetInstance = widgetInstances.find(wi => wi.slug == tab.key);
                    if(widgetInstance)
                    {
                        // Add WidgetInstanceId property to tab.
                        tab['widgetInstanceId'] = widgetInstance.id;
                    }
                }
            });
        }
        return tabs;
    }

}
module.exports = AppRunService;