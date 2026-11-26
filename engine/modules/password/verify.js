/**
 * Domain-level password verification. Inputs and scenario definitions are
 * validated because both may cross an application boundary.
 */
const MAX_TEXT_INPUT = 4096;
const MAX_PATH_POINTS = 10000;
const MAX_PUZZLE_PIECES = 400;

function parseStructuredInput(input) {
    if (typeof input === 'string') {
        if (input.length > MAX_TEXT_INPUT * 16) return null;
        try { return JSON.parse(input); } catch (_) { return null; }
    }
    return input;
}

function validGridPoint(point, cols, rows) {
    return Array.isArray(point) && point.length === 2 &&
        Number.isInteger(point[0]) && Number.isInteger(point[1]) &&
        point[0] >= 0 && point[0] < cols && point[1] >= 0 && point[1] < rows;
}

function verifyPath(config, input) {
    const userPath = parseStructuredInput(input);
    const correctPath = config.street;
    const [cols, rows] = config.area || [];
    const start = config.start;
    const target = config.target;

    if (!Number.isInteger(cols) || !Number.isInteger(rows) ||
        cols < 1 || rows < 1 || cols * rows > MAX_PATH_POINTS) return false;
    if (!validGridPoint(start, cols, rows) || !validGridPoint(target, cols, rows)) return false;
    if (!Array.isArray(correctPath) || correctPath.length < 2 ||
        correctPath.length > Math.min(MAX_PATH_POINTS, cols * rows)) return false;
    if (!Array.isArray(userPath) || userPath.length !== correctPath.length) return false;

    const validPath = path => path.every((point, index) => {
        if (!validGridPoint(point, cols, rows)) return false;
        if (index === 0) return point[0] === start[0] && point[1] === start[1];
        const previous = path[index - 1];
        return Math.abs(point[0] - previous[0]) + Math.abs(point[1] - previous[1]) === 1;
    });
    if (!validPath(correctPath) || !validPath(userPath)) return false;

    const last = correctPath[correctPath.length - 1];
    const userLast = userPath[userPath.length - 1];
    if (last[0] !== target[0] || last[1] !== target[1] ||
        userLast[0] !== target[0] || userLast[1] !== target[1]) return false;

    // A path may not revisit a cell; this also rejects malformed answer data.
    const unique = path => new Set(path.map(([x, y]) => `${x},${y}`)).size === path.length;
    if (!unique(correctPath) || !unique(userPath)) return false;

    return userPath.every((point, index) =>
        point[0] === correctPath[index][0] && point[1] === correctPath[index][1]
    );
}

function verifyPuzzle(config, input) {
    const parsed = parseStructuredInput(input);
    const order = Array.isArray(parsed) ? parsed : parsed?.order;
    const ratio = config.ratio ?? [3, 3];
    if (!Array.isArray(ratio) || ratio.length !== 2) return false;
    const [cols, rows] = ratio;
    if (!Number.isInteger(cols) || !Number.isInteger(rows) ||
        cols < 1 || rows < 1 || cols * rows > MAX_PUZZLE_PIECES) return false;
    const pieceCount = cols * rows;
    if (!Array.isArray(order) || order.length !== pieceCount) return false;

    // order[position] is the original row-major piece index at that position.
    // The solved arrangement is therefore [0, 1, 2, ... pieceCount - 1].
    return order.every((pieceIndex, position) =>
        Number.isInteger(pieceIndex) && pieceIndex === position
    );
}

export function verifyPassword(type, config = {}, input) {
    if (!config || typeof config !== 'object' || Array.isArray(config)) return false;

    if (type === 'puzzle') return verifyPuzzle(config, input);
    if (type === 'find_way') return verifyPath(config, input);

    if (!Object.prototype.hasOwnProperty.call(config, 'value')) return false;

    // Switch challenges follow the schema's binary toggle contract: a string of 0/1 states.
    // Reject malformed definitions and inputs rather than treating them as generic text passwords.
    if (type === 'switch') {
        if (typeof config.value !== 'string' || !/^[01]+$/.test(config.value)) return false;
        if (typeof input !== 'string' || input.length !== config.value.length || !/^[01]+$/.test(input)) return false;
        return input === config.value;
    }
    if (typeof input !== 'string' && typeof input !== 'number') return false;
    if (typeof input === 'string' && input.length > MAX_TEXT_INPUT) return false;
    if (typeof input === 'number' && !Number.isFinite(input)) return false;
    if (typeof config.value !== 'string' && typeof config.value !== 'number') return false;

    const expected = String(config.value);
    const supplied = String(input);
    const caseSensitive = config.caseSensitive === true;
    return caseSensitive ? supplied === expected : supplied.toUpperCase() === expected.toUpperCase();
}
