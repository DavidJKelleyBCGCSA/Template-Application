const { XlFunction } = require('formula-parser');
const cloneDeep = require('lodash/cloneDeep');
const findIndex = require('lodash/findIndex');
const find = require('lodash/find');
const remove = require('lodash/remove');
const replace = require('lodash/replace');
const split = require('lodash/split');

const { systemColumn } = require('../helpers/dataHelper');
const { isFormat } = require('../helpers/dataTypeInferer');

const positionsEnum = {
    AFTER: 'AFTER',
    BEFORE: 'BEFORE',
};

const filterByEnum = {
    CONTAINS: 'CONTAINS',
    STARTS_WITH: 'STARTS_WITH',
    ENDS_WITH: 'ENDS_WITH',
    IS_BETWEEN: 'IS_BETWEEN',
    GREATER_THAN: 'GREATER_THAN',
    GREATER_THAN_OR_EQUAL_TO: 'GREATER_THAN_OR_EQUAL_TO',
    LESS_THAN: 'LESS_THAN',
    LESS_THAN_OR_EQUAL_TO: 'LESS_THAN_OR_EQUAL_TO',
    EQUALS: 'EQUALS',
    NOT_EQUAL_TO: 'NOT_EQUAL_TO',
    IS_EMPTY: 'IS_EMPTY',
    IS_ERROR: 'IS_ERROR',
    IS_NULL: 'IS_NULL',
    IS_NUMBER: 'IS_NUMBER',
    IS_TEXT: 'IS_TEXT',
};

const dataPrepActionsEnum = {
    REMOVE_ROWS: 'REMOVE_ROWS',
    ADD_COLUMN: 'ADD_COLUMN',
    SORT_A_Z: 'SORT_A_Z',
    SORT_Z_A: 'SORT_Z_A',
    RENAME_COLUMN: 'RENAME_COLUMN',
    REMOVE_COLUMN: 'REMOVE_COLUMN',
    CHANGE_TYPE: 'CHANGE_TYPE',
    FILTER_BY: 'FILTER_BY',
    STANDARDIZE: 'STANDARDIZE',
    REPLACE: 'REPLACE',
    SPLIT_COLUMN: 'SPLIT_COLUMN',
    FORMAT: 'FORMAT',
};


const checkCellValueIsFormat = (schema, name, value) => {
    if (!systemColumn(name)) {
        const schemaRow = find(schema, { name: name });
        const format = schemaRow.format;

        return isFormat(value, format);
    }

    return true;
};

const checkCellValueIdDataType = (schema, name, value) => {
    if (!systemColumn(name)) {
        const schemaRow = find(schema, { name: name });
        const type = schemaRow.type;

        return type === 'string' ? isNaN(value) : !isNaN(value);
    }

    return true;
};

const checkDataType = (row, schema, column) => {

    let cellValue = row[column];
    let rowErrors = {};
    if (row.row_errors) {
        rowErrors = JSON.parse(row['row_errors']); //eslint-disable-line
    }

    // const isValidFormat = checkCellValueIsFormat(schema, column, cellValue);
    const isValidFormat = true;
    const isValidDataType = checkCellValueIdDataType(schema, column, cellValue);

    if (isValidDataType) {
        row[column] = typeof cellValue !== 'undefined' ? String(cellValue) : '';
    }
    else {
        row[column] = null;
    }

    if (!isValidFormat || !isValidDataType) {

        const schemaRow = find(schema, { name: column });
        const format = schemaRow.format;
        const type = schemaRow.type;

        rowErrors[column] = { originalValue: cellValue, isValidFormat, isValidDataType, format, type };
    }

    row['row_errors'] = JSON.stringify(rowErrors); //eslint-disable-line

    return row;
};

const addColumnToSchema = (step, schema) => {
    const {
        column,
        selectedPosition,
        selectedPositionField,
        selectedColumnType,
    } = step;

    let newColumns = cloneDeep(schema);
    const columnObj = cloneDeep(newColumns[0]);
    columnObj.name = column;
    columnObj.type = selectedColumnType.toLowerCase();

    let columnSelectedFieldIndex = findIndex(newColumns, o => {
        return o.name === selectedPositionField;
    });

    columnSelectedFieldIndex =
        selectedPosition.toLowerCase() === positionsEnum.AFTER.toLowerCase()
            ? columnSelectedFieldIndex + 1
            : columnSelectedFieldIndex;

    if (columnSelectedFieldIndex > newColumns.length) {
        newColumns.push(columnObj);
        columnSelectedFieldIndex = newColumns.length - 1;
    }
 else {
        columnSelectedFieldIndex = columnSelectedFieldIndex < 0 ? 0 : columnSelectedFieldIndex;
        newColumns.splice(columnSelectedFieldIndex, 0, columnObj);
    }

    return newColumns;
};


const addColumnApplyRecipeItem = (row, step, schema) => {

    const {
        column,
        selectedFormula,
        formulaColumns
    } = step;

    let newRow = cloneDeep(row);

    const parser = new XlFunction(selectedFormula, formulaColumns);

    const { err } = parser.parse();
    let value = '';

    if (err) {
        value = err;
    }

    value = parser.execute(newRow);

    if (!(column in newRow)) {
        newRow[column] = value;
        checkDataType(newRow, schema, column);
    }

    return newRow;
};

const renameColumnToSchema = (step, schema) => {

    const {
        column, newColumName
    } = step;

    let newColumns = cloneDeep(schema);

    const orignalColumn = find(newColumns, { name: column });

    const columnA = cloneDeep(orignalColumn);
    columnA.name = newColumName;

    let columnSelectedFieldIndex = findIndex(newColumns, o => {
        return o.name === column;
    });

    if (columnSelectedFieldIndex > newColumns.length) {
        newColumns.push(columnA);
        columnSelectedFieldIndex = newColumns.length - 1;
    }
 else {
        columnSelectedFieldIndex = columnSelectedFieldIndex < 0 ? 0 : columnSelectedFieldIndex;
        newColumns.splice(columnSelectedFieldIndex + 1, 0, columnA);
    }

    for (let index = 0; index < newColumns.length; index += 1) {
        const newColumn = newColumns[index];
        newColumn.order = index + 1;
    }

    remove(newColumns, o => {
        return o.name === column;
    });

    return newColumns;
};

const renameColumnApplyRecipeItem = (row, step) => {
    const { column, newColumName } = step;
    let newRow = cloneDeep(row);

    if (column in newRow) {
        newRow[newColumName] = newRow[column];
        Reflect.deleteProperty(newRow, column);
    }

    return newRow;
};


const replaceApplyRecipeItem = (row, step) => {
    const { column, pattern, replacement } = step;

    const newRow = cloneDeep(row);

    if (pattern === '') {
        if (newRow[column] === '') {
            newRow[column] = replacement;
        }
    }
 else if (newRow[column]) {
            newRow[column] = replace(newRow[column], pattern, replacement);
        }
else {
            const rowErrors = newRow.row_errors ? JSON.parse(newRow.row_errors) : {};
            const cellError = rowErrors[column];
            if (cellError) {
                newRow[column] = replace(cellError.originalValue, pattern, replacement);
                delete rowErrors[column];
                newRow.row_errors = JSON.stringify(rowErrors); //eslint-disable-line
            }
        }

    return newRow;
};


const splitColumnOnSchema = (step, schema) => {

    const { column, resultColumnA, resultColumnB } = step;

    let newColumns = cloneDeep(schema);

    const orignalColumn = find(schema, o => {
        return o.name === column;
    });

    const columnA = cloneDeep(orignalColumn);
    columnA.name = resultColumnA;

    const columnB = cloneDeep(orignalColumn);
    columnB.name = resultColumnB;

    let columnSelectedFieldIndex = findIndex(newColumns, o => {
        return o.name === column;
    });

    if (columnSelectedFieldIndex > newColumns.length) {
        newColumns.push(columnA);
        newColumns.push(columnB);
        columnSelectedFieldIndex = newColumns.length - 2;
    }
    else {
        columnSelectedFieldIndex = columnSelectedFieldIndex < 0 ? 0 : columnSelectedFieldIndex;
        newColumns.splice(columnSelectedFieldIndex + 1, 0, columnA);
        newColumns.splice(columnSelectedFieldIndex + 2, 0, columnB);
    }

    return newColumns;
};

const splitColumnApplyRecipeItem= (row, step) => {
    const { column, separator, resultColumnA, resultColumnB } = step;

    let newRow = cloneDeep(row);


    const parts = split(row[column], separator, 2);
    let partA = '';
    let partB = '';

    if (parts.length === 2) {
        [partA, partB] = parts;
    }
    else if (parts.length === 1) {
        [partA] = parts;
        partB = '';
    }

    if (!(resultColumnA in newRow) && !(resultColumnB in newRow)) {
        newRow[resultColumnA] = partA;
        newRow[resultColumnB] = partB;
    }

    return newRow;
};

const executeRecipeStep = (data, step, schema) => {
    switch (step.type) {
        case dataPrepActionsEnum.ADD_COLUMN: {
            return addColumnApplyRecipeItem(data, step, schema);
        }
        case dataPrepActionsEnum.RENAME_COLUMN: {
            return renameColumnApplyRecipeItem(data, step, schema);
        }
        case dataPrepActionsEnum.REPLACE: {
            return replaceApplyRecipeItem(data, step, schema);
        }
        case dataPrepActionsEnum.SPLIT_COLUMN: {
            return splitColumnApplyRecipeItem(data, step, schema);
        }
        default:
            return data;
    }
};

const executeRecipeStepSchema = (step, schema) => {
    switch (step.type) {
        case dataPrepActionsEnum.ADD_COLUMN: {
            return addColumnToSchema(step, schema);
        }
        case dataPrepActionsEnum.RENAME_COLUMN: {
            return renameColumnToSchema(step, schema);
        }
        case dataPrepActionsEnum.SPLIT_COLUMN: {
            return splitColumnOnSchema(step, schema);
        }
        default:
            return schema;
    }
};

module.exports = { filterByEnum, dataPrepActionsEnum, executeRecipeStep, executeRecipeStepSchema };