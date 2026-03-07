// htdocs/render/vfx/modules/transitions.js

const runPhase = async (overlay, cssTransition, startStyles, endStyles, duration) => {
    Object.assign(overlay.style, startStyles);
    void overlay.offsetWidth; // Force Reflow
    overlay.style.transition = cssTransition;
    Object.assign(overlay.style, endStyles);
    await new Promise(r => setTimeout(r, duration * 1000));
};

const resetAll = (overlay, content) => {
    overlay.style.transition = 'none';
    overlay.style.opacity = '0';
    overlay.style.backgroundColor = 'black';
    overlay.style.backdropFilter = 'none';
    overlay.style.clipPath = 'none';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.transform = 'none';
    overlay.style.zIndex = '200';

    if (content) {
        content.className = content.className.replace(/vfx-anim-[\w-]+/g, '').trim();
        content.classList.remove('vfx-invert');
        content.style.transform = '';
        content.style.filter = '';
        content.style.opacity = '';
        content.style.animation = '';
    }
};

// --- LOGIC HELPERS ---
const zoomLogic = async (type, { overlay, content, phase, duration }) => {
    const d = duration || 1.0;
    overlay.style.backgroundColor = 'black';
    overlay.style.zIndex = '9999';

    if (phase === 'start') {
        if (content) content.classList.add(type === 'in' ? 'vfx-anim-zoom-in' : 'vfx-anim-zoom-out');
        await runPhase(overlay, `opacity ${d}s ease`, { opacity: '0' }, { opacity: '1' }, d);
    } else {
        if (content) content.classList.remove('vfx-anim-zoom-in', 'vfx-anim-zoom-out');
        await runPhase(overlay, `opacity ${d}s ease`, { opacity: '1' }, { opacity: '0' }, d);
        resetAll(overlay, content);
    }
};

const shakeLogic = async (animClass, { overlay, content, phase, duration }) => {
    const d = duration || 2.0;
    overlay.style.backgroundColor = 'black';
    overlay.style.zIndex = '9999';

    if (phase === 'start') {
        if (content) content.classList.add(animClass);
        await runPhase(overlay, `opacity ${d}s ease`, { opacity: '0' }, { opacity: '1' }, d);
    } else {
        if (content) content.classList.remove(animClass);
        await runPhase(overlay, `opacity ${d}s ease`, { opacity: '1' }, { opacity: '0' }, d);
        resetAll(overlay, content);
    }
};

const spinLogic = async ({ overlay, content, phase, duration }) => {
    const d = duration || 0.8;
    overlay.style.zIndex = '9999';
    overlay.style.backgroundColor = 'black';

    if (phase === 'start') {
        if (content) content.classList.add('vfx-anim-spin-out');
        await runPhase(overlay, `opacity ${d}s ease-in`, { opacity: '0' }, { opacity: '1' }, d);
    } else {
        if (content) {
            content.classList.remove('vfx-anim-spin-out');
            content.classList.add('vfx-anim-spin-in');
        }
        await runPhase(overlay, `opacity ${d}s ease-out`, { opacity: '1' }, { opacity: '0' }, d);
        resetAll(overlay, content);
    }
};

const slideLogic = async (dir, { overlay, content, phase, duration }) => {
    const d = duration || 0.6;
    const animOut = `vfx-slide-out-${dir}`;
    const mapIn = { 'left': 'right', 'right': 'left', 'up': 'down', 'down': 'up' };
    const animIn = `vfx-slide-in-${mapIn[dir]}`;

    overlay.style.backgroundColor = 'black';

    if (phase === 'start') {
        overlay.style.opacity = '1';
        overlay.style.zIndex = '-1'; // Nằm dưới lúc trượt ra
        if (content) content.style.animation = `${animOut} ${d}s ease-in forwards`;
        await new Promise(r => setTimeout(r, d * 1000));
        overlay.style.zIndex = '9999'; // Che màn hình khi xong
    } else {
        overlay.style.zIndex = '-1'; // Xuống dưới để trượt vào
        if (content) content.style.animation = `${animIn} ${d}s ease-out forwards`;
        await new Promise(r => setTimeout(r, d * 1000));
        resetAll(overlay, content);
    }
};

export const Transitions = {
    'fade': async ({ overlay, phase, duration }) => {
        const d = duration || 0.5;
        overlay.style.backgroundColor = 'black';
        overlay.style.zIndex = '9999';
        if (phase === 'start') await runPhase(overlay, `opacity ${d}s ease-out`, { opacity: '0' }, { opacity: '1' }, d);
        else { await runPhase(overlay, `opacity ${d}s ease-in`, { opacity: '1' }, { opacity: '0' }, d); resetAll(overlay); }
    },
    'flash': async ({ overlay, phase, duration }) => {
        const d = duration || 0.5;
        overlay.style.backgroundColor = 'white';
        overlay.style.zIndex = '9999';
        if (phase === 'start') await runPhase(overlay, `opacity ${d}s ease-out`, { opacity: '0' }, { opacity: '1' }, d);
        else { await runPhase(overlay, `opacity ${d}s ease-in`, { opacity: '1' }, { opacity: '0' }, d); resetAll(overlay); }
    },
    'blur': async ({ overlay, phase, duration }) => {
        const d = duration || 1.0;
        overlay.style.zIndex = '9999';
        if (phase === 'start') await runPhase(overlay, `backdrop-filter ${d}s ease, background-color ${d}s ease`, { backdropFilter: 'blur(0px)', backgroundColor: 'rgba(0,0,0,0)' }, { backdropFilter: 'blur(20px)', backgroundColor: 'rgba(0,0,0,1)' }, d);
        else { await runPhase(overlay, `backdrop-filter ${d}s ease, background-color ${d}s ease`, { backdropFilter: 'blur(20px)', backgroundColor: 'rgba(0,0,0,1)' }, { backdropFilter: 'blur(0px)', backgroundColor: 'rgba(0,0,0,0)' }, d); resetAll(overlay); }
    },
    // Zoom
    'zoom': (p) => zoomLogic('in', p),
    'zoom in': (p) => zoomLogic('in', p),
    'zoom out': (p) => zoomLogic('out', p),

    // Shakes
    'shake random blur': (p) => shakeLogic('shake-blur-anim', p),
    'shake left right blur': (p) => shakeLogic('vfx-anim-shake-x', p),
    'shake up down blur': (p) => shakeLogic('vfx-anim-shake-y', p),

    // Glitch
    'glitch': async ({ overlay, content, phase, duration }) => {
        const d = duration || 0.8;
        overlay.style.zIndex = '9999';
        if (phase === 'start') {
            if (content) content.classList.add('vfx-anim-glitch');
            overlay.style.transition = 'none';
            overlay.style.backgroundColor = 'rgba(0,0,0,0.2)';
            await new Promise(r => setTimeout(r, d * 1000));
            overlay.style.backgroundColor = 'black';
            overlay.style.opacity = '1';
        } else {
            if (content) content.classList.remove('vfx-anim-glitch');
            await runPhase(overlay, `opacity 0.2s ease`, { opacity: '1' }, { opacity: '0' }, 0.2);
            resetAll(overlay, content);
        }
    },

    // CRT Off
    'crt off': async ({ overlay, content, phase, duration }) => {
        const d = duration || 0.6;
        overlay.style.zIndex = '9999';
        if (phase === 'start') {
            if (content) {
                content.style.transition = `transform ${d / 2}s ease-in`;
                content.style.transformOrigin = 'center';
                content.style.animation = `vfx-crt-shrink-y ${d / 2}s ease-in forwards`;
                await new Promise(r => setTimeout(r, (d / 2) * 1000));

                overlay.style.backgroundColor = 'white';
                overlay.style.height = '2px';
                overlay.style.top = '50%';
                overlay.style.opacity = '1';

                content.style.animation = `vfx-crt-shrink-x ${d / 2}s ease-out forwards`;
                await new Promise(r => setTimeout(r, (d / 2) * 1000));

                overlay.style.height = '100%';
                overlay.style.top = '0';
                overlay.style.backgroundColor = 'black';
            } else {
                overlay.style.opacity = '1';
            }
        } else {
            await runPhase(overlay, `opacity 0.5s ease`, { opacity: '1' }, { opacity: '0' }, 0.5);
            resetAll(overlay, content);
        }
    },

    // Spin
    'spin': (p) => spinLogic(p),

    // Slides
    'slide left': (p) => slideLogic('left', p),
    'slide right': (p) => slideLogic('right', p),
    'slide up': (p) => slideLogic('up', p),
    'slide down': (p) => slideLogic('down', p),

    // Iris
    'iris circle': async ({ overlay, phase, duration }) => {
        const d = duration || 1.0;
        overlay.style.backgroundColor = 'black';
        overlay.style.zIndex = '9999';
        if (phase === 'start') {
            overlay.style.opacity = '1';
            await runPhase(overlay, `clip-path ${d}s ease-in-out`, { clipPath: 'circle(150% at 50% 50%)' }, { clipPath: 'circle(0% at 50% 50%)' }, d);
        } else {
            await runPhase(overlay, `clip-path ${d}s ease-in-out`, { clipPath: 'circle(0% at 50% 50%)' }, { clipPath: 'circle(150% at 50% 50%)' }, d);
            resetAll(overlay);
        }
    },

    // Invert Flash
    'invert flash': async ({ overlay, content, phase, duration }) => {
        const d = duration || 0.2;
        overlay.style.backgroundColor = 'white';
        overlay.style.zIndex = '9999';
        if (phase === 'start') {
            if (content) content.classList.add('vfx-invert');
            await new Promise(r => setTimeout(r, 100));
            if (content) content.classList.remove('vfx-invert');
            await new Promise(r => setTimeout(r, 100));
            if (content) content.classList.add('vfx-invert');
            await runPhase(overlay, `opacity ${d}s`, { opacity: '0' }, { opacity: '1' }, d);
        } else {
            if (content) content.classList.remove('vfx-invert');
            await runPhase(overlay, `opacity ${d}s`, { opacity: '1' }, { opacity: '0' }, d);
            resetAll(overlay, content);
        }
    },

    // Warp
    'warp': async ({ overlay, content, phase, duration }) => {
        const d = duration || 1.0;
        overlay.style.backgroundColor = 'black';
        overlay.style.zIndex = '9999';
        if (phase === 'start') {
            if (content) content.classList.add('vfx-anim-warp');
            await runPhase(overlay, `opacity ${d}s ease`, { opacity: '0' }, { opacity: '1' }, d);
        } else {
            if (content) content.classList.remove('vfx-anim-warp');
            await runPhase(overlay, `opacity ${d}s ease`, { opacity: '1' }, { opacity: '0' }, d);
            resetAll(overlay, content);
        }
    },

    'none': async ({ overlay, content }) => { resetAll(overlay, content); return Promise.resolve(); }
};

// Alias
Transitions['fade in'] = Transitions['fade'];
Transitions['fade out'] = Transitions['fade'];

// [UPDATED] Aliases for Schema Compatibility (snake_case -> space separated / Logic)
Transitions['zoom_in'] = Transitions['zoom in'];
Transitions['zoom_out'] = Transitions['zoom out'];

Transitions['shake_random_blur'] = Transitions['shake random blur'];
Transitions['shake_left_right_blur'] = Transitions['shake left right blur'];
Transitions['shake_up_down_blur'] = Transitions['shake up down blur'];

Transitions['crt_off'] = Transitions['crt off'];

Transitions['slide_left'] = Transitions['slide left'];
Transitions['slide_right'] = Transitions['slide right'];
Transitions['slide_up'] = Transitions['slide up'];
Transitions['slide_down'] = Transitions['slide down'];

Transitions['iris_circle'] = Transitions['iris circle'];
Transitions['invert_flash'] = Transitions['invert flash'];