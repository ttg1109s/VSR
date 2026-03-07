/**
 * @class Check
 * @description Provides type checking and data validation utilities.
 */
class Check {
    type(data, typeCheck = null, list = false) {
        if (data === null) throw new Error('Data is null');
        if (typeCheck) {
            if (typeof typeCheck !== 'string') throw new Error('TypeCheck must be a string');
            if (list) {
                if (this.array(data)) {
                    return data.every(item => typeof item === typeCheck);
                }
            }
            return typeof data === typeCheck;
        }
        return typeof data;
    }

    array(data) {
        return (
            Array.isArray(data) ||
            (ArrayBuffer.isView(data) && !(data instanceof DataView))
        );
    }

    json(data) {
        if (this.type(data, 'object')) {
            if (this.array(data)) return false;
            if (data instanceof Date) return false;
            if (data instanceof RegExp) return false;
            if (data instanceof Map) return false;
            if (data instanceof Set) return false;
            return true;
        }
        return false;
    }

    inRange(value = 0, min = 0, max = 0, equal = true) {
        if (!this.type([value, min, max], 'number', true)) throw new Error('Invalid input');

        if (equal) {
            return value >= min && value <= max;
        } else {
            return value > min && value < max;
        }
    }

    includes(source = [], search, option = { findIndex: false, count: false }) {
        if (!this.array(source)) {
            throw new Error('First parameter must be an array.');
        }

        if (this.array(search) && search.length < 2) {
            throw new Error('Second parameter must be an array with at least 2 elements.');
        }

        const index = (src, s) => ({
            has: fb.array.findAllIndex(src, s, '==='),
            exception: fb.array.findAllIndex(src, s, '!==')
        });

        let report = {
            result: null,
            index: [],
            count: []
        };

        const check = (src, s) => {
            const isSmallArray = src.length < 500;
            const exists = isSmallArray
                ? src.includes(s)
                : new Set(src).has(s);

            if (option.findIndex) {
                const indices = index(src, s);
                report.index.push(indices);

                if (option.count) {
                    report.count.push({
                        has: indices.has.length,
                        exception: indices.exception.length
                    });
                }
            }

            return exists;
        };

        if (this.array(search)) {
            let found = false;
            for (let i = 0; i < search.length; i++) {
                if (check(source, search[i])) {
                    found = true;
                } else {
                    found = false;
                    break;
                }
            }
            report.result = found;
        } else {
            report.result = check(source, search);
        }

        return report;
    }
}

/**
 * @class Random
 * @description Provides random number and string generation.
 */
class Random {
    int(min, max) {
        if (min > max) [min, max] = [max, min];
        return Math.floor(Math.random() * (max - min + 1) + min);
    }

    flt(min, max) {
        return Math.random() * (max - min) + min;
    }

    string(length = 8, charset = '', mode = 'normal', specialChar = false) {
        if (!charset) {
            charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        }
        if (specialChar) {
            charset += '!@#$%^&*()_+~`|}{[]:;?><,./-=';
        }

        const generator = {
            normal: () => {
                let result = '';
                for (let i = 0; i < length; i++) {
                    const randomIndex = this.int(0, charset.length - 1);
                    result += charset[randomIndex];
                }
                return result;
            }
        };

        return generator[mode]();
    }
}

/**
 * @class NumberPlugin
 * @description Provides number formatting and manipulation utilities.
 */
class NumberPlugin {
    constructor(randomModule) {
        this.random = randomModule;
    }

    prefixZero(num, length = 2) {
        const str = String(num);
        if (length <= str.length) return str;
        return '0'.repeat(length - str.length) + str;
    }

    truncate(number, decimalPlaces = 2) {
        if (typeof (number) !== 'number') throw new Error('number parameter must be a number.');
        if (typeof (decimalPlaces) !== 'number' || decimalPlaces < 0 || !Number.isInteger(decimalPlaces))
            throw new Error('decimalPlaces parameter must be a non-negative integer.');

        if (decimalPlaces === 0) return Math.trunc(number).toString();

        const formatted = this.string(number);
        const start = formatted.indexOf('.');
        if (start === -1) return formatted;
        return formatted.slice(0, start + decimalPlaces + 1);
    }

    string(number) {
        if (typeof (number) === 'number') return number.toString();

        if (typeof (number) === 'string') {
            let cleaned = number.replace(/[^0-9.-]+/g, '');
            let fltNumber = parseFloat(cleaned);
            let intNumber = parseInt(cleaned);
            if (fltNumber > intNumber && fltNumber < intNumber + 1) {
                return String(fltNumber);
            } else {
                return String(intNumber);
            }
        }
        return String(number);
    }

    round(fltNumber = 0, threadhold = 0.5) {
        if (threadhold < 0 || threadhold > 1)
            throw new Error('Number.round: Threadhold must be between 0 and 1.');

        const intNumber = parseInt(fltNumber);
        const maxNumber = intNumber + 1;

        return fltNumber > intNumber + threadhold ? maxNumber : intNumber;
    }
}

/**
 * @class ArrayPlugin
 * @description Provides advanced array operations.
 */
class ArrayPlugin {
    constructor(calcModule) {
        this.calc = calcModule;
    }

    clone(data) {
        if (fb.check.array(data)) {
            return JSON.parse(JSON.stringify(data));
        } else if (data !== null && typeof data === 'object') {
            return JSON.parse(JSON.stringify(data));
        } else {
            return data;
        }
    }

    flat(array = [], depth = Infinity) {
        let newArray = this.clone(array);
        newArray = newArray.flat(depth);
        return newArray;
    }

    join(array = [], separator = ',') {
        const newArray = array.map(item => typeof item === 'string' ? item.trim() : item);
        return newArray.join(separator);
    }

    split(string = '', separator = ',', trim = true, filterEmpty = true) {
        let array = string.split(separator);
        if (trim) array = array.map(item => item.trim());
        if (filterEmpty) array = array.filter(item => item !== '');
        return array;
    }

    toObj(array = [], property = []) {
        const obj = {};
        property.forEach((key, index) => {
            obj[key] = array[index];
        });
        return obj;
    }

    objReverse(keys = {}, property = [], empty = null) {
        const reversed = new Array(property.length).fill(empty);
        property.forEach((key, index) => {
            if (Object.getOwnPropertyNames(keys).includes(key)) {
                reversed[index] = keys[key];
            }
        });
        return reversed;
    }

    byIndex(index = -1, source = []) {
        if (index === -1) return false;
        if (source.length === 0) return false;
        if (index >= source.length) return false;
        return source[index] || false;
    }

    findIndex(source = [], value, key = null) {
        if (source.length === 0) return -1;
        if (value === null || value === undefined) return -1;
        if (fb.check.type(source) === false) return -1;
        if (key === null) {
            return source.indexOf(value);
        } else {
            return source.findIndex(item => item[key] === value);
        }
    }

    findAllIndex(source = [], value, operator = '===') {
        if (source.length === 0) return [];
        if (value === null || value === undefined) return [];
        if (source.some(item => Array.isArray(item))) return [];

        let list = [];
        for (let i = 0; i < source.length; i++) {
            if (this._logic(source[i], operator, value)) {
                list.push(i);
            }
        }
        return list.length > 0 ? list : [];
    }

    _logic(a, operator, b) {
        switch (operator) {
            case '===': return a === b;
            case '!==': return a !== b;
            case '>': return a > b;
            case '<': return a < b;
            case '>=': return a >= b;
            case '<=': return a <= b;
            default: return a == b;
        }
    }

    filterByKey(source = [], key = '', value) {
        if (source.length === 0 || key === '' || value === null || value === undefined) return [];
        if (fb.check.type(source) === false) return [];
        return source.filter(item => item[key] === value);
    }

    sort(source) {
        let sortedMin = [...source].sort((a, b) => a - b);
        let sortedMax = [...source].sort((a, b) => b - a);
        return {
            minValue: sortedMin[0],
            maxValue: sortedMax[0],
            min: sortedMin,
            max: sortedMax
        };
    }

    sortBy(arrays = [], direction = 'asc', column = null) {
        if (!direction || arrays.length <= 1) return arrays;

        const isObject = (val) => val !== null && typeof val === 'object';
        const isAsc = direction === 'asc' || direction === 'ascending';

        if (!column) {
            return isAsc
                ? arrays.sort((a, b) => (a > b ? 1 : -1))
                : arrays.sort((a, b) => (a > b ? -1 : 1));
        }

        if (isObject(arrays[0])) {
            return arrays.sort((a, b) => {
                if (a[column] === undefined) return 1;
                if (b[column] === undefined) return -1;

                if (typeof a[column] === 'string' && typeof b[column] === 'string') {
                    return isAsc
                        ? a[column].localeCompare(b[column])
                        : b[column].localeCompare(a[column]);
                }

                return isAsc
                    ? a[column] - b[column]
                    : b[column] - a[column];
            });
        }

        return arrays;
    }

    cut(source = [], original, start = 0, limit = source.length) {
        let cut = source;
        if (!fb.check.type(source)) return false;
        if (start < 0 || limit > source.length || start >= source.length) return false;
        if (original === false) {
            cut = [...cut];
        }
        const remainder = cut.splice(start, limit);
        return {
            original: source,
            cut: cut,
            remainder: remainder
        }
    }

    swap(array = [], indexA = -1, indexB = -1) {
        if (!fb.check.type(array)) return false;
        if (indexA < 0 || indexB < 0 || indexA >= array.length || indexB >= array.length) return false;

        const temp = array[indexA];
        array[indexA] = array[indexB];
        array[indexB] = temp;
        return array;
    }

    get merge() {
        return new MergeStrategy();
    }
}

class MergeStrategy {
    zigzag(beforeArray = [], afterArray = []) {
        const maxLength = Math.max(beforeArray.length, afterArray.length);
        const merged = [];

        for (let i = 0; i < maxLength; i++) {
            if (beforeArray.length > i) merged.push(beforeArray[i]);
            if (afterArray.length > i) merged.push(afterArray[i]);
        }
        return merged;
    }

    serial(beforeArray, afterArray, unique = false) {
        const merged = [...beforeArray, ...afterArray];
        if (unique) return [...new Set(merged)];
        return merged;
    }

    parallel(arrayBefore = [], arrayAfter = [], prioritizeBefore = true) {
        let newArrayBefore = [...arrayBefore];
        let newArrayAfter = [...arrayAfter];
        const numberMerge = Math.min(arrayBefore.length, arrayAfter.length);
        const merged = [];

        let m = 0;

        for (let i = 0; i < numberMerge; i++) {
            if (prioritizeBefore) merged.push([arrayBefore[i], arrayAfter[i]]);
            if (!prioritizeBefore) merged.push([arrayAfter[i], arrayBefore[i]]);
            m++;
        }

        let remainder = [];

        if (arrayBefore.length > arrayAfter.length) {
            remainder = fb.array.cut(newArrayBefore, false, m, newArrayBefore.length).remainder;

        } else {
            remainder = fb.array.cut(newArrayAfter, false, m, newArrayAfter.length).remainder;
        }

        if (remainder.length > 0) {
            for (let i = 0; i < remainder.length; i++) {
                if (prioritizeBefore) merged.push([remainder[i], null]);
                if (!prioritizeBefore) merged.push([null, remainder[i]]);
            }
        }

        return merged;
    }

    replace(fromArray = [], toArray = [], position = []) {
        if (fb.check.array(fromArray) === false || fb.check.array(toArray) === false || fb.check.array(position) === false)
            return false;

        if (fromArray.length > toArray.length) return false;

        const isEqual = fromArray.length === toArray.length;

        if (isEqual) {
            if (!fromArray.some(item => item === undefined || item === null)) return false;
        } else {
            if (position.length !== fromArray.length) return false;
        }

        const merged = isEqual ?
            fromArray.map((item, index) => (item === undefined || item === null ? toArray[index] : item)) :
            toArray.map((item, index) => (position.includes(index) ? fromArray[position.indexOf(index)] : item));

        return merged;
    }
}

/**
 * @class BaseFunction
 * @description Main Router class for the plugin.
 */
class BaseFunction {
    constructor() {
        this.check = new Check();
        this.random = new Random();
        this.number = new NumberPlugin(this.random);
        this.array = new ArrayPlugin();
    }
}

export const fb = new BaseFunction();
