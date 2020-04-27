const systemColumn = name => {
    const systemColums = ['_', 'row_errors'];
    return systemColums.indexOf(name) > -1;
};

const convertToSnowflakeType = type => {
    switch (type) {
        case "number":
            return "integer";

        default:
            return "string";
    }
};

module.exports = { systemColumn, convertToSnowflakeType };