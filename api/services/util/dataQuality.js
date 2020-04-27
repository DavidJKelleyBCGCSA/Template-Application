const find = require('lodash/find');

/*
How data quality is determined

For each column the following information is calculated:

    Number of rows that do not match schema data type of column(int, string, double etc.) D

    Number of rows that are empty or null. E

    For numerical rows:

        Values that fall two standard deviations away median. S

        Values that larger than a user selectable max. X (optional)

        Values smaller than a user selectable min. N (optional)
*/

/*
Numerical Rows:

% bad data = (D + X + N)/(Total Number of Rows)

% Intermediate data = (E + S)/(Total Number of Rows)

% Good data = [(total number of rows) - (% bad data + % intermediate data)]/(Total Number of Rows)

Alphanumeric Rows:

% Intermediate data = (E )/(Total Number of Rows)

% Good data = [(total number of rows) - (% bad data + % intermediate data)]/(Total Number of Rows)
*/


const isNullOrEmptyString = value => {
    const possibleNulls = ['null', 'n/a', 'nan'];
    return value === null || String(value).trim() === '' || possibleNulls.indexOf(String(value).trim().toLowerCase()) > -1;
};

const isNullOrEmptyNumber = value => {
    return value === null;
};

const isNullOrEmpty = (dataType, value) => {
    if (dataType === 'string') {
        return isNullOrEmptyString(value);
    }
    else if (dataType === 'number') {
        return isNullOrEmptyNumber(value);
    }
        return false;

};


const matchedDataType = (dataType, value) => {

    let matched = true;

    if (dataType === 'string') {
        matched = isNaN(value) || isNullOrEmptyString(value);
    }

    if (dataType === 'number') {
        matched = !isNaN(value) || isNullOrEmptyNumber(value);
    }

    return matched;
};

const tryParseInt = (str) => {
    if (str !== null && str !== undefined) { //eslint-disable-line
        if (str.length > 0 && !isNaN(str)) {
            return true;
        }
 else if (!isNaN(str.toString()) && str.toString().length > 0) {
            return true;
        }
    }
    return false;
};

const fallTwoStandardDeviationsAwayMedian = (value, median, standardDeviation) => {
    const dev = 2 * standardDeviation;
    const intValue = parseInt(value, 0);
    const min = median - dev;
    const max = median + dev;
    return !(intValue >= min && intValue <= max);
};

const numericalBadData = (D, X, N, count) => {
    return (D + X + N)/count;
};

const numericalIntermediateData = (E, S, count) => {
    return (E + S)/count;
};

const numericalGoodData = (badData, intermediateData, count) => {
    const bad = badData * count;
    const intermediate = intermediateData * count;
    return [count - (bad + intermediate)]/count;
};

const alphanumericBadData = (D, count) => {
    return D/count;
};

const alphanumericIntermediateData = (E, count) => {
    return E/count;
};

const alphanumericGoodData = (badData, intermediateData, count) => {
    const bad = badData * count;
    const intermediate = intermediateData * count;
    return [count - (bad + intermediate)]/count;
};

const numericalOverMax = (value, max, decimal) => {
    const dec = decimal ? !isNaN(decimal) && decimal.toString().indexOf('.') !== -1 : false;
    if (dec) {
        return parseFloat(value) && max.toString().length > 0 ? parseFloat(value) > max : false;
    }
    return tryParseInt(value) && tryParseInt(max) ? parseInt(value, 0) > max : false;
};

const numericalUnderMin = (value, min, decimal) => {
    const dec = decimal ? !isNaN(decimal) && decimal.toString().indexOf('.') !== -1 : false;
    if (dec) {
        return parseFloat(value) && min.toString().length > 0 ? parseFloat(value) < min : false;
    }
    return tryParseInt(value) && tryParseInt(min) ? parseInt(value, 0) < min : false;
};

const calculateRowDataQuality = (row, schema, dataQualityInfo, summary) => {

    for (let y = 0; y < Object.keys(row).length; y += 1) {

        const key = Object.keys(row)[y];

        if (key !== '_' && !key.endsWith('_dqColumn') && find(schema, { name: key })) {
            const dqCheckKey = key + '_dqColumn';

            const hasDqCheck = Object.keys(row).indexOf(dqCheckKey) > 0;

            let median = 0;
            let standardDeviation = 0;

            if (find(dataQualityInfo, { 'NAME': key })) {
                median = find(dataQualityInfo, { 'NAME': key }).MEDIAN;
                standardDeviation = find(dataQualityInfo, { 'NAME': key }).SD;
            }

            const rowSummary = summary[key] || { wrongDataType: 0, nullOrEmpty: 0,
                twoStandardDeviationAwayMedian: 0, largerThanMax: 0, smallerThanMin: 0 };
            const dataType = find(schema, { name: key }).type;

            const min = find(schema, { name: key }).min;
            const max = find(schema, { name: key }).max;
            const decimal = find(schema, { name: key }).decimalPoint;

            let D = 0;
            let E = 0;
            let S = 0;
            let X = 0;
            let N = 0;

            if (hasDqCheck) {
                const dqCheck = parseInt(row[dqCheckKey], 0);
                D = dqCheck === 0 ? 1 : 0;
                E = dqCheck !== 0 && dqCheck !== 1 ? 1 : 0;
            }
 else {
                D = matchedDataType(dataType, row[key]) ? 0 : 1;
                E = isNullOrEmpty(dataType, row[key]) ? 1 : 0;
                if (dataType === 'number' && D === 0) {
                    S = fallTwoStandardDeviationsAwayMedian(row[key], median, standardDeviation) ? 1 : 0;
                    X = numericalOverMax(row[key], max, decimal) ? 1 : 0;
                    N = numericalUnderMin(row[key], min, decimal) ? 1 : 0;
                }
            }

            rowSummary.wrongDataType += D;
            rowSummary.nullOrEmpty += E;
            rowSummary.twoStandardDeviationAwayMedian += S;
            rowSummary.largerThanMax += X;
            rowSummary.smallerThanMin += N;
            summary[key] = rowSummary;
        }
    }

    return summary;
};

const calculateDataQuality = (keys, schema, count, summary) => {

    const totalSummary = {};

    for (let y = 0; y < keys.length; y += 1) {
        const key = keys[y];

        if (key !== '_' && !key.endsWith('_dqColumn') && summary[key]) {
            const D = summary[key].wrongDataType;
            const E = summary[key].nullOrEmpty;
            const S = summary[key].twoStandardDeviationAwayMedian;
            const X = summary[key].largerThanMax;
            const N = summary[key].smallerThanMin;

            const dataType = find(schema, { name: key }).type;

            let badData = 0;
            let intermediateData = 0;
            let goodData = 0;

            if (dataType === 'number') {
                badData = numericalBadData(D, X, N, count);
                intermediateData = numericalIntermediateData(E, S, count);
                goodData = numericalGoodData(badData, intermediateData, count);
            }
            else if (dataType === 'string') {
                badData = alphanumericBadData(D, count);
                intermediateData = alphanumericIntermediateData(E, count);
                goodData = alphanumericGoodData(badData, intermediateData, count);
            }

            totalSummary[key] = { badData, intermediateData, goodData };

        }
    }

    return totalSummary;
};


const depResolve = (node, resolved, unresolved, widgetInstances) => {
    if (typeof node.inputs === 'undefined')
        return;
    unresolved.push(node.slug);
    for (let i = 0; i < node.inputs.length; i++) {
        const edgeSlug = node.inputs[i];
        const edge = widgetInstances.find(widget => widget.slug === edgeSlug);
        if (!resolved.includes(edge.slug)) {
            if (unresolved.includes(edge.slug)) {
                console.warn('circular dependency detected', node.slug, edge.slug);
                throw new Error('circular dependency');
            }
            depResolve(edge, resolved, unresolved, widgetInstances);
        }
    }
    resolved.push(node.slug);
    // remove from array of unresolved due is not needed anymore
    // so that, we speed up the search
    const index = unresolved.indexOf(node.slug);
    if (index !== -1) unresolved.splice(index, 1);
};

module.exports = { calculateRowDataQuality, calculateDataQuality, depResolve };