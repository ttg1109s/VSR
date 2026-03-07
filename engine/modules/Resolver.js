// htdocs/engine/modules/Resolver.js
import { API } from '../../api/index.js'; // [NEW] Import API for State Access

/**
 * Lấy giá trị từ object theo đường dẫn (path)
 */
export const getNestedValue = (obj, path) => {
    if (!path || typeof path !== 'string') return undefined;
    return path.split('.').reduce((prev, curr) => {
        return (prev && prev[curr] !== undefined) ? prev[curr] : undefined;
    }, obj);
};

/**
 * Hàm tách chuỗi tham số an toàn
 */
function splitArgs(str) {
    const parts = [];
    let current = '';
    let depth = 0;
    let inQuote = null;

    for (let i = 0; i < str.length; i++) {
        const char = str[i];
        const prev = i > 0 ? str[i - 1] : null;

        if (inQuote) {
            current += char;
            if (char === inQuote && prev !== '\\') inQuote = null;
            continue;
        }

        if (char === '"' || char === "'") {
            inQuote = char;
            current += char;
            continue;
        }

        if (char === '(' || char === '[') { depth++; current += char; continue; }
        if (char === ')' || char === ']') { depth--; current += char; continue; }

        if (char === ',' && depth === 0) {
            parts.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    if (current) parts.push(current.trim());
    return parts;
}

/**
 * Cốt lõi của việc xử lý dữ liệu động trong kịch bản
 */
export const resolveValue = (val, engine) => {
    if (val === undefined || val === null) return val;
    if (Array.isArray(val)) return val.map(v => resolveValue(v, engine));
    if (typeof val !== 'string' || !val.startsWith('$')) return val;

    try {
        // 1. $get(path)
        if (val.startsWith('$get(') && val.endsWith(')')) {
            const path = val.substring(5, val.length - 1);

            // [REFACTOR] Use API State.get instead of internal getNestedValue
            // This allows using Schema keys in scripts, e.g., $get('title')
            const res = API.engine.state.get(path);

            // console.log(`[Resolver] $get(${path}) ->`, res);
            return res;
        }

        // 2. $calc(expression)
        if (val.startsWith('$calc(') && val.endsWith(')')) {
            let content = val.substring(6, val.length - 1);
            const nestedRegex = /(\$[a-zA-Z0-9_]+\([^)]+\))/g;
            let maxLoop = 5;
            while (content.includes('$') && maxLoop > 0) {
                content = content.replace(nestedRegex, (match) => resolveValue(match, engine));
                maxLoop--;
            }
            if (!/^[0-9+\-*/().\s,Math\w]+$/.test(content)) {
                console.warn(`[Resolver] Invalid calc content: ${content}`);
                return 0;
            }
            try { return new Function('return ' + content)(); } catch (e) { return 0; }
        }

        // 3. $round(number)
        if (val.startsWith('$round(') && val.endsWith(')')) {
            return Math.round(Number(resolveValue(val.substring(7, val.length - 1), engine)) || 0);
        }

        // 4. $empty(path)
        if (val.startsWith('$empty(') && val.endsWith(')')) {
            // [REFACTOR] Use API State.get
            const path = val.substring(7, val.length - 1);
            const data = API.engine.state.get(path);
            return (data === null || data === undefined || data === "" || (Array.isArray(data) && data.length === 0));
        }

        // 5. $color(text, hex)
        if (val.startsWith('$color(') && val.endsWith(')')) {
            const parts = splitArgs(val.substring(7, val.length - 1));
            return `<span style="color:${resolveValue(parts[1], engine)}">${resolveValue(parts[0], engine)}</span>`;
        }

        // 6. $scl(x, xmin, xmax, ymin, ymax)
        if (val.startsWith('$scl(') && val.endsWith(')')) {
            const p = splitArgs(val.substring(5, val.length - 1)).map(v => Number(resolveValue(v, engine)));
            return p[1] === p[2] ? p[3] : p[3] + (p[0] - p[1]) * (p[4] - p[3]) / (p[2] - p[1]);
        }

        // 7. $dist(x1, y1, x2, y2)
        if (val.startsWith('$dist(') && val.endsWith(')')) {
            const p = splitArgs(val.substring(6, val.length - 1)).map(v => Number(resolveValue(v, engine)));
            return Math.hypot(p[2] - p[0], p[3] - p[1]);
        }

        // 8. $sqr_matrix(source, p1, p2, input)
        if (val.startsWith('$sqr_matrix(') && val.endsWith(')')) {
            const parts = splitArgs(val.substring(12, val.length - 1));
            const source = JSON.parse(resolveValue(parts[0], engine));
            const p1 = resolveValue(parts[1], engine), p2 = resolveValue(parts[2], engine), input = resolveValue(parts[3], engine);
            const [w, h] = source, horiz = (p1 === 'left' || p1 === 'right');
            const sX = (p1 === 'right' || p2 === 'right') ? w - 1 : 0, sY = (p1 === 'bottom' || p2 === 'bottom') ? h - 1 : 0;
            const dX = (p1 === 'right' || p2 === 'right') ? -1 : 1, dY = (p1 === 'bottom' || p2 === 'bottom') ? -1 : 1;
            if (typeof input === 'number') {
                const c = horiz ? input % w : Math.floor(input / h), r = horiz ? Math.floor(input / w) : input % h;
                return [sX + c * dX, sY + r * dY];
            } else if (Array.isArray(input)) {
                const c = (input[0] - sX) / dX, r = (input[1] - sY) / dY;
                return horiz ? (r * w + c) : (c * h + r);
            }
            return input;
        }

        // 9. $a(items...)
        if (val.startsWith('$a(') && val.endsWith(')')) {
            return splitArgs(val.substring(3, val.length - 1)).map(i => {
                let r = resolveValue(i, engine);
                return (typeof r === 'string' && (r.startsWith('"') || r.startsWith("'"))) ? r.slice(1, -1) : r;
            });
        }

        // 10. $index(arr, pos)
        if (val.startsWith('$index(') && val.endsWith(')')) {
            const p = splitArgs(val.substring(7, val.length - 1));
            const a = resolveValue(p[0], engine);
            return Array.isArray(a) ? a[Number(resolveValue(p[1], engine))] : undefined;
        }

        // 11. $is_a(val)
        if (val.startsWith('$is_a(') && val.endsWith(')')) {
            const c = val.substring(6, val.length - 1).trim();
            if (c.startsWith('[')) { try { return JSON.parse(c.replace(/'/g, '"')); } catch (e) { } }
            return resolveValue(c, engine);
        }

        // 12. $if(cond, t, f)
        if (val.startsWith('$if(') && val.endsWith(')')) {
            const p = splitArgs(val.substring(4, val.length - 1));
            let cond = p[0];
            while (cond.includes('$')) {
                cond = cond.replace(/(\$[a-zA-Z0-9_]+\([^)]+\))/g, (m) => {
                    const r = resolveValue(m, engine);
                    return typeof r === 'string' ? `'${r}'` : r;
                });
            }
            let res = false; try { res = new Function('return ' + cond)(); } catch (e) { }
            return res ? resolveValue(p[1], engine) : resolveValue(p[2], engine);
        }

    } catch (err) {
        console.error(`[Resolver] Error resolving value '${val}':`, err);
        return val;
    }

    return val;
};