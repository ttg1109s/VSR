// htdocs/render/vfx/modules/overlays.js

const getContainer = (params) => {
    if (params && params.element) {
        if (typeof params.element === 'string') {
            return document.getElementById(params.element) || document.body;
        }
        return params.element;
    }
    return document.body;
};

const createOverlay = (container, classes, id) => {
    if (!container) return null;
    let ol = document.createElement('div');
    container.appendChild(ol);
    ol.className = "vfx-overlay absolute inset-0 pointer-events-none z-10 " + classes;
    if (id) ol.setAttribute('data-vfx-id', id);
    return ol;
};

const setOverlay = (container, cssClass, styleObj = {}, duration = null, id = null, flicker = false) => {
    if (!container) return;

    // Manage by ID
    if (id) {
        const existing = container.querySelector(`.vfx-overlay[data-vfx-id="${id}"]`);
        if (existing) existing.remove();
    } else {
        // Fallback: Clear ALL if no ID (legacy safety)
        const existing = container.querySelectorAll('.vfx-overlay');
        existing.forEach(el => el.remove());
    }

    let ol = createOverlay(container, cssClass, id);
    Object.assign(ol.style, styleObj);

    // Flicker Logic
    let flickerDur = 0;
    if (typeof flicker === 'number' && flicker >= 2) flickerDur = flicker;
    else if (duration && duration > 1) flickerDur = duration; // Backward compatibility for overlayFlick

    if (flickerDur > 0) {
        ol.style.animation = `vfx-flicker ${flickerDur}s infinite ease-in-out`;
    }

    // Auto remove if duration specified but NOT flickering (permanent if flicker?)
    // User said "overlayFlick: Duration in seconds... If > 1, pass as duration". 
    // Wait, the schema said "flicker=number second". "nếu < 2 | null | empty-> false".
    // Does it mean it disappears after X seconds? Or it flickers every X seconds?
    // "subtype overflay có thêm flicker=number secnond"
    // Usually "flicker" implies repetition. 
    // And "duration" is usually lifetime.
    // In `Scene.js`, `ovFlick` was passed as `duration` to `vfx.exec`.
    // I will assume `flicker` param controls the ANIMATION speed/cycle, and it stays permanent unless Stopped/Overridden.

    // Implementation:
    // If flicker >= 2: set animation.
    // If duration also provided (and not just for flicker): remove after duration?
    // The previous code had: `if (duration && duration > 0) ... animation ...`
    // It seems previous code conflated duration with flicker.
    // New Schema separates them? No, previously it was `overlayFlick` (duration/flicker mixed).
    // Now Schema has `flicker` (number).
    // Strategies passes `flicker` and `duration`.
    // I'll use `flicker` for animation.
    // I'll use `duration` for auto-removal if needed, but usually overlays are permanent until swapped/removed.
    // IMPORTANT: Scene.js passes `duration: ovDuration` where `ovDuration` comes from `overlayFlick`.
    // So for Scene transitions, `duration` IS the flicker duration.
    // But directly in VFX effect, `flicker` property is used.

    if (flickerDur > 0) {
        ol.style.animation = `vfx-flicker ${flickerDur}s infinite ease-in-out`;
    }
};

export const Overlays = {
    'none': (p) => {
        const container = getContainer(p);
        if (p.id) {
            const existing = container.querySelector(`.vfx-overlay[data-vfx-id="${p.id}"]`);
            if (existing) existing.remove();
        } else {
            if (container && typeof container.querySelectorAll === 'function') {
                container.querySelectorAll('.vfx-overlay').forEach(ol => ol.remove());
            }
        }
    },
    'dark': (p) => setOverlay(getContainer(p), 'bg-black/50 pointer-events-none z-10', {}, p.duration, p.id, p.flicker),
    'light': (p) => setOverlay(getContainer(p), 'bg-white/30 mix-blend-overlay pointer-events-none z-10', {}, p.duration, p.id, p.flicker),
    'blood': (p) => setOverlay(getContainer(p), 'bg-red-900/30 mix-blend-overlay pointer-events-none z-10', { boxShadow: "inset 0 0 100px 50px rgba(100,0,0,0.8)" }, p.duration, p.id, p.flicker),
    'noise': (p) => setOverlay(getContainer(p), 'opacity-10 pointer-events-none z-10', { backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.4'/%3E%3C/svg%3E")` }, p.duration, p.id, p.flicker),
    'dreaming': (p) => setOverlay(getContainer(p), 'bg-purple-500/10 mix-blend-screen pointer-events-none z-10 animate-pulse', { backdropFilter: 'blur(2px)' }, p.duration, p.id, p.flicker),

    // [UPDATED] Add Classic Movie
    'classic movie': (p) => setOverlay(getContainer(p), 'pointer-events-none z-10', {
        backgroundColor: 'rgba(50, 40, 30, 0.1)',
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.3'/%3E%3C/svg%3E")`,
        filter: 'sepia(0.6) contrast(1.1)',
        boxShadow: 'inset 0 0 150px rgba(0,0,0,0.8)'
    }, p.duration, p.id, p.flicker)
};