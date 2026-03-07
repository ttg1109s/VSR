// htdocs/render/vfx/modules/frame.js

const getContainer = (params) => {
    if (params && params.element) {
        if (typeof params.element === 'string') {
            return document.getElementById(params.element) || document.body;
        }
        return params.element;
    }
    return document.body;
};

const createFrame = (container, classes, id) => {
    if (!container) return;

    if (id) {
        const existing = container.querySelector(`.vfx-frame[data-vfx-id="${id}"]`);
        if (existing) existing.remove();
    } else {
        const existing = container.querySelectorAll('.vfx-frame');
        existing.forEach(el => el.remove());
    }

    let ol = document.createElement('div');
    container.appendChild(ol);
    ol.className = "vfx-frame absolute inset-0 pointer-events-none z-20 " + classes;
    if (id) ol.setAttribute('data-vfx-id', id);
    return ol;
};

const setFrame = (p, classes) => {
    const frame = createFrame(getContainer(p), classes, p.id);

    // Loop Logic
    // loop=true/false loopSecond = number second (nếu < 1 | null | empty -> false
    const loopSec = (p.loop && p.loopSecond && p.loopSecond >= 1) ? p.loopSecond : 0;

    if (loopSec > 0) {
        // Implement looping visibility or animation?
        // "subtype frame có thêm loop=true/false loopSecond... type overflay có thêm flicker"
        // Frame usually is static border or flash.
        // If loop, maybe it flashes repeatedly?
        // Assuming it's a "flash" frame that repeats every loopSecond.
        // Or if it's "border_red", maybe it stays?
        // Let's assume loop applies to animation.
        // If classes include 'vfx-frame-flash-red', it already has animation.
        // If loopSecond is set, maybe we change the animation duration?
        // Or maybe it means "Show for X seconds, hide, then Show again"?
        // Let's go with: if loopSecond > 0, set animation-duration to loopSecond.
        if (frame) {
            frame.style.animationDuration = `${loopSec}s`;
            frame.style.animationIterationCount = 'infinite';
        }
    } else {
        // If no loop, and it's a flash frame, it might run once.
        // Existing code: setTimeout remove after p.duration.
        if (p.duration) {
            setTimeout(() => frame?.remove(), p.duration * 1000);
        }
    }
};

export const Frames = {
    'border_red': (p) => setFrame(p, 'vfx-frame-border-red'),
    'flash_red': (p) => setFrame(p, 'vfx-frame-flash-red')
};