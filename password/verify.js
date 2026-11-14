/**
 * Domain-level password verification.
 * Presentation strategies collect input; this module decides whether it is valid.
 */

export function verifyPassword(type, config = {}, input) {
    if (type === 'puzzle') {
        return input === (config.value || 'solved');
    }

    if (type === 'find_way') {
        try {
            const userPath = typeof input === 'string' ? JSON.parse(input) : input;
            const correctPath = config.street;
            if (!Array.isArray(userPath) || !Array.isArray(correctPath)) return false;
            if (userPath.length !== correctPath.length) return false;
            return userPath.every((point, index) =>
                Array.isArray(point) && Array.isArray(correctPath[index]) &&
                point[0] === correctPath[index][0] && point[1] === correctPath[index][1]
            );
        } catch (_) {
            return false;
        }
    }

    const correct = config.value ? String(config.value).toUpperCase() : '';
    const supplied = input ? String(input).toUpperCase() : '';
    return supplied === correct;
}
