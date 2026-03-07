// htdocs/render/vfx/index.js
import { Transitions } from './modules/transitions.js';
import { Overlays } from './modules/overlays.js';
import { Media } from './modules/media.js';
import { Frames } from './modules/frame.js';

class VFXController {
    constructor() {
        this.injectStyles();
    }

    injectStyles() {
        if (document.getElementById('vfx-dynamic-styles')) return;
        const style = document.createElement('style');
        style.id = 'vfx-dynamic-styles';
        style.innerHTML = `
            /* --- CORE ANIMATIONS --- */
            @keyframes vfx-shake-x { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-5px); } 75% { transform: translateX(5px); } }
            @keyframes vfx-shake-y { 0%, 100% { transform: translateY(0); } 25% { transform: translateY(-5px); } 75% { transform: translateY(5px); } }
            
            @keyframes vfx-zoom-in { 0% { transform: scale(1); } 100% { transform: scale(1.1); } }
            @keyframes vfx-zoom-out { 0% { transform: scale(1); } 100% { transform: scale(0.9); } }
            
            @keyframes vfx-glitch-anim {
                0% { clip-path: inset(20% 0 80% 0); transform: translate(-2px, 1px); }
                20% { clip-path: inset(60% 0 10% 0); transform: translate(2px, -1px); }
                40% { clip-path: inset(40% 0 50% 0); transform: translate(-2px, 2px); }
                60% { clip-path: inset(80% 0 5% 0); transform: translate(2px, -2px); }
                80% { clip-path: inset(10% 0 70% 0); transform: translate(-1px, 1px); }
                100% { clip-path: inset(30% 0 20% 0); transform: translate(1px, -1px); }
            }
            
            @keyframes vfx-crt-shrink-y { 0% { transform: scaleY(1); } 100% { transform: scaleY(0.005); } }
            @keyframes vfx-crt-shrink-x { 0% { transform: scaleX(1); } 100% { transform: scaleX(0); } }
            
            @keyframes vfx-spin-out { 0% { transform: rotate(0deg) scale(1); opacity: 1; } 100% { transform: rotate(720deg) scale(0); opacity: 0; } }
            @keyframes vfx-spin-in { 0% { transform: rotate(-720deg) scale(0); opacity: 0; } 100% { transform: rotate(0deg) scale(1); opacity: 1; } }
            
            @keyframes vfx-warp { 0% { transform: perspective(500px) rotateX(0deg); } 100% { transform: perspective(500px) rotateX(90deg); opacity: 0; } }
            
            @keyframes vfx-border-flash { 0%, 100% { border-color: transparent; } 50% { border-color: red; } }

            /* --- SLIDES --- */
            @keyframes vfx-slide-out-left { 0% { transform: translateX(0); } 100% { transform: translateX(-100%); } }
            @keyframes vfx-slide-in-right { 0% { transform: translateX(100%); } 100% { transform: translateX(0); } }
            @keyframes vfx-slide-out-right { 0% { transform: translateX(0); } 100% { transform: translateX(100%); } }
            @keyframes vfx-slide-in-left { 0% { transform: translateX(-100%); } 100% { transform: translateX(0); } }
            @keyframes vfx-slide-out-up { 0% { transform: translateY(0); } 100% { transform: translateY(-100%); } }
            @keyframes vfx-slide-in-down { 0% { transform: translateY(-100%); } 100% { transform: translateY(0); } }
            @keyframes vfx-slide-out-down { 0% { transform: translateY(0); } 100% { transform: translateY(100%); } }
            @keyframes vfx-slide-in-up { 0% { transform: translateY(100%); } 100% { transform: translateY(0); } }

            /* --- UTILITY CLASSES --- */
            .vfx-anim-shake-x { animation: vfx-shake-x 1.5s infinite; }
            .vfx-anim-shake-y { animation: vfx-shake-y 1.5s infinite; }
            .vfx-anim-zoom-in { animation: vfx-zoom-in 1.5s ease-out forwards; }
            .vfx-anim-zoom-out { animation: vfx-zoom-out 1.5s ease-out forwards; }
            .vfx-anim-glitch { animation: vfx-glitch-anim 0.2s steps(2) infinite; filter: hue-rotate(90deg) contrast(1.5); }
            .vfx-anim-spin-out { animation: vfx-spin-out 0.8s ease-in forwards; }
            .vfx-anim-spin-in { animation: vfx-spin-in 0.8s ease-out forwards; }
            .vfx-anim-warp { animation: vfx-warp 0.8s ease-in forwards; }
            
            .vfx-sepia { filter: sepia(0.8) contrast(1.2); }
            .vfx-invert { filter: invert(1); }
            
            .vfx-frame-border-red { border: 5px solid red; box-sizing: border-box; pointer-events: none; }
            .vfx-frame-flash-red { border: 5px solid red; box-sizing: border-box; pointer-events: none; animation: vfx-border-flash 0.5s infinite; }

            /* --- OVERLAY FLICKER --- */
            @keyframes vfx-flicker {
                0% { opacity: 1; }
                50% { opacity: 0; }
                100% { opacity: 1; }
            }`;
        document.head.appendChild(style);
    }

    async exec(type, id, params = {}) {
        if (!type) return;

        // Map handlers logic
        const strategies = {
            'transition': () => Transitions[params.target || id] || Transitions['none'],
            'overlay': () => Overlays[params.target || id] || Overlays['none'],
            'media': () => {
                // params.target is already set in Strategies
                return Media['control'];
            },
            'frame': () => Frames[params.target || id]
        };

        // Note: 'id' here is the Instance ID passed from Strategies.js (or fallback to target)
        // 'params.target' is the resource/type ID (e.g. 'blood', 'border_red').

        // Add ID to params for submodules to use
        params.id = id;

        const strategy = strategies[type];

        // Nếu type không tồn tại (vd: sound) thì return luôn
        if (!strategy) return;

        const handler = strategy();

        if (handler) {
            await handler(params);
        } else {
            console.warn(`VFX: Handler for ${type}:${params.target} not found.`);
            // Fallback an toàn cho transition
            if (type === 'transition') await Transitions['none'](params);
        }
    }
}

export const vfx = new VFXController();
window.vfx = vfx;
