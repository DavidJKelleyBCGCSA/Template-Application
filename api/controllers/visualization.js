const VisualizationService = require('../services/widget/visualizationService');

function listCharts (req, res) {

    const { widgetInstanceId } = req.query;

    if (!widgetInstanceId) {
        res.status(400).send('widgetInstanceId field missing');
    }
    else {
        const visulizationService = new VisualizationService(req.user.id);
        visulizationService.listCharts(widgetInstanceId)
            .then(list => res.status(200).json(list))
            .catch(error => res.status(error.status || 400).send(error.message));

    }

}

function deleteChart (req, res) {

    const { widgetInstanceId, chartId } = req.body;

    if (!widgetInstanceId || !chartId) {
        res.status(400).send('fields missing');
    }
    else {
        const visulizationService = new VisualizationService(req.user.id);
        visulizationService.deleteChart(widgetInstanceId, chartId)
            .then(list => res.status(200).json(list))
            .catch(error => res.status(error.status || 400).send(error.message));
    }

}

function updateChart(req, res) {

    const { widgetInstanceId, inputWidgetInstanceId, chartId, title, description} = req.body;

    if (!widgetInstanceId || !inputWidgetInstanceId || !title || !chartId) {
        res.status(400).send('Required fields missing');
    }
    else {

        const visulizationService = new VisualizationService(req.user.id);
        visulizationService.updateChart(widgetInstanceId, inputWidgetInstanceId, title, description, chartId)
            .then(workbook => res.status(200).json(workbook))
            .catch(error => res.status(error.status || 400).send(error.message));

    }
}

function createChart(req, res) {

    const { widgetInstanceId, inputWidgetInstanceId, title, description, workbookURL} = req.body;

    if (!widgetInstanceId || !inputWidgetInstanceId || !title) {
        res.status(400).send('Required fields missing');
    }
    else {

        const visulizationService = new VisualizationService(req.user.id);
        visulizationService.createChart(widgetInstanceId, inputWidgetInstanceId, title, description, workbookURL)
            .then(workbook => res.status(200).json(workbook))
            .catch(error => res.status(error.status || 400).send(error.message));

    }
}

function downloadPDF (req, res) {
    const { widgetInstanceId, chartId } = req.query;
    if (!widgetInstanceId || !chartId) {
        res.status(400).send('fields missing');
    }
    else {
        const visulizationService = new VisualizationService(req.user.id);
        visulizationService.downloadPDF(widgetInstanceId, chartId)
            .then(data => {
                res.attachment('pdfname.pdf');
                data.pipe(res);
            })
            .catch(error => res.status(error.status || 400).send(error.message));
    }
}

// function downloadWorkbookTemplate (req, res) {

//     const { widgetInstanceId, chartId } = req.query;

//     if (!widgetInstanceId || !chartId) {
//         res.status(400).send('fields missing');
//     }
//     else {
//         const visulizationService = new VisualizationService(req.user.id);
//         visulizationService.generateWorkbookTemplate(widgetInstanceId, chartId)
//             .then(([title, xml]) => {
//                 res.attachment(`${title}.twb`);
//                 res.set('Content-Type', 'text/xml');
//                 res.send(xml);
//             })
//             .catch(error => res.status(error.status || 400).send(error.message));
//     }
// }

 function downloadWorkbookTemplateFromWorkbook (req, res) {

     const { url } = req.query;

     if (!url) {
         res.status(400).send('fields missing');
     }
     else {
         const visulizationService = new VisualizationService(req.user.id);
         visulizationService.generateWorkbookTemplateFromWorkbookUrl(url)
             .then((xml) => {
                 res.attachment(`template.twb`);
                 res.set('Content-Type', 'text/xml');
                 res.send(xml);
             })
             .catch(error => res.status(error.status || 400).send(error.message));
     }
 }

 function getTrustedToken (req, res) {

    const { widgetInstanceId } = req.query;

    if (!widgetInstanceId) {
        res.status(400).send('fields missing');
    } else {
        const visulizationService = new VisualizationService(req.user.id);
        visulizationService.getTrustedToken(widgetInstanceId)
            .then(token => res.status(200).json(token))
            .catch(error => res.status(error.status || 400).send(error.message));
    }
}

module.exports = { listCharts, createChart, deleteChart, updateChart, downloadPDF, 
        downloadWorkbookTemplateFromWorkbook, getTrustedToken };