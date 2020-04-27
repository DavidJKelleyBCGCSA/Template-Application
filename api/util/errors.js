
const forbidden = (message) => {
    let errorMessage = message ? message : 'Forbidden';
    const error = new Error(errorMessage);
    error.status = 403;
    return error;
};

const unauthorized = () => {
    const error = new Error('Unauthorized');
    error.status = 401;
    return error;
};

const noData = () => {
    const error = new Error('No data available');
    error.status = 205;
    return error;
};

module.exports = {forbidden, unauthorized, noData};