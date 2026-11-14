/**
 * Domain-level password verification. Inputs are treated as untrusted client data.
 */
export function verifyPassword(type, config = {}, input) {
    if (type === 'puzzle') {
        // A client-supplied "solved" token is not proof of a solved puzzle.
        return false;
    }

    if (type === 'find_way') {
        try {
            const userPath = typeof input === 'string' ? JSON.parse(input) : input;
            const correctPath = config.street;
            if (!Array.isArray(userPath) || !Array.isArray(correctPath) || userPath.length !== correctPath.length) return false;
            const [cols, rows] = config.area || [];
            const start = config.start;
            const target = config.target;
            if (!Number.isInteger(cols) || !Number.isInteger(rows) || cols < 1 || rows < 1) return false;
            if (!Array.isArray(start) || !Array.isArray(target)) return false;
            const validPoint = point => Array.isArray(point) && point.length === 2 &&
                Number.isInteger(point[0]) && Number.isInteger(point[1]) &&
                point[0] >= 0 && point[0] < cols && point[1] >= 0 && point[1] < rows;
            if (!userPath.every(validPoint)) return false;
            if (userPath[0][0] !== start[0] || userPath[0][1] !== start[1]) return false;
            const last = userPath[userPath.length - 1];
            if (last[0] !== target[0] || last[1] !== target[1]) return false;
            for (let i = 1; i < userPath.length; i++) {
                const dx = Math.abs(userPath[i][0] - userPath[i - 1][0]);
                const dy = Math.abs(userPath[i][1] - userPath[i - 1][1]);
                if (dx + dy !== 1) return false;
            }
            return userPath.every((point, index) =>
                point[0] === correctPath[index]?.[0] && point[1] === correctPath[index]?.[1]
            );
        } catch (_) {
            return false;
        }
    }

    if (!Object.prototype.hasOwnProperty.call(config, 'value')) return false;
    const expected = String(config.value);
    const supplied = input === null || input === undefined ? '' : String(input);
    const caseSensitive = config.caseSensitive === true;
    return caseSensitive ? supplied === expected : supplied.toUpperCase() === expected.toUpperCase();
}
