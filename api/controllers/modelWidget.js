const {JUPYTER_SERVER, JUPYTER_TOKEN} = require('../../config');

function getJupyterNotebookUrl (req, res) {
    const { widgetInstanceId } = req.query;

    if (!widgetInstanceId) {
        res.status(500).send("Required field 'widgetInstanceId' not provided");
        return;
    }

    const response = {
        url: `${JUPYTER_SERVER}/notebooks/work/widget_${
            widgetInstanceId}/notebook.ipynb?token=${JUPYTER_TOKEN}`,
    };
    res.status(200).json(response);
}


module.exports = { getJupyterNotebookUrl };