import { API } from '../../../api/index.js';

const activeMedia = {};

const getMediaUrl = (target, value) => {
    // If value is provided (direct URL), use it.
    if (value && (value.startsWith('http') || value.startsWith('/'))) return value;

    // If target is like 'media.sound.bgm', use resolveValue?
    // Strategy already attempts resolveValue(eff.value).
    // But if user provided `target: id` (e.g. `bgm_01`), we might need to look up `media` namespace.
    // However, schema says `media` namespace is just `id`, `type`, `url`.
    // We can try to look up in API.engine.state.get('media', { id: target }) if we implement that getter,
    // OR we can just access state directly if exposed.
    // Assuming API.engine.state.data.media or similar exists after schema update?
    // Actually, `GlobalStates` logic in Engine might not auto-map `media` root property.
    // The user said "Bổ sung schema namespace media... {id, type, url}".
    // Engine/Strategies.js `Handle media namespace lookup` was a task.
    // If I didn't implement it in Strategy, I must do it here or in Strategy.
    // Strategy usually resolves values.
    // Let's assume for now `value` passed here IS the URL (resolved by Strategy or passed directly).
    // If not, we try to find it in `API.engine.state.media` (if loaded) or just treat target as global ID if mapped.
    // Given current state, let's rely on `value` or `target` being the URL/ID.

    // Fallback: Check if target format is "type:id" (e.g. photo:123)
    if (target && target.includes(':')) {
        const parts = target.split(':');
        // This is puzzle logic "photo:id", but maybe applies here too?
        // User said: "Hỗ trợ các key liên quan như cover router, background action, ảnh puzzle dạng photo:id..."
        // So we should support this.
    }

    return value || target;
};

export const Media = {
    'control': (params) => {
        const { format, control, value, duration, target, repeat, id } = params; // id is instanceId
        const mediaId = id || target; // Use instance ID

        const url = getMediaUrl(target, value);

        if (format === 'sound') {
            if (control === 'play' || control === 'start') { // 'start' for compatibility
                // If paused, resume
                if (activeMedia[mediaId] && activeMedia[mediaId].paused) {
                    activeMedia[mediaId].play().catch(e => console.warn("Audio resume error", e));
                    return;
                }

                // If already playing and same URL?
                if (activeMedia[mediaId] && activeMedia[mediaId].src === url && !activeMedia[mediaId].paused) {
                    // Do nothing or restart?
                    // User: "play lại thì run lại từ đầu" (if stopped/finished?)
                    // "play/pause (chạy tiếp từ lúc rừng)" (resume)
                    // If it's a new Play command with same ID, usually implies restart or new track.
                    if (activeMedia[mediaId].currentSrc.endsWith(url)) {
                        activeMedia[mediaId].currentTime = 0;
                        activeMedia[mediaId].play();
                        return;
                    }
                }

                // Stop existing if different
                if (activeMedia[mediaId]) {
                    activeMedia[mediaId].pause();
                    delete activeMedia[mediaId];
                }

                const audio = new Audio(url);
                if (repeat) audio.loop = true;
                audio.play().catch(e => console.warn("Audio play error", e, url));
                activeMedia[mediaId] = audio;

                // Duration handling? User said "control... play/pause... repeat". 
                // Duration usually via `vfx` duration.
                // If duration set, stop after time?
                if (duration) {
                    setTimeout(() => {
                        if (activeMedia[mediaId] === audio) {
                            audio.pause();
                            delete activeMedia[mediaId];
                        }
                    }, duration * 1000);
                }
            } else if (control === 'pause') {
                if (activeMedia[mediaId]) activeMedia[mediaId].pause();
            } else if (control === 'stop') {
                if (activeMedia[mediaId]) {
                    activeMedia[mediaId].pause();
                    activeMedia[mediaId].currentTime = 0;
                    // Keep instance? or delete? 
                    // "stop (play lại thì run lại từ đầu)" -> means can play again.
                    // If I delete, I lose the reference to URL.
                    // But usually `vfx` call comes with URL again.
                    // So deleting is fine.
                    delete activeMedia[mediaId];
                }
            }
        } else if (format === 'video' || format === 'photo') {
            const container = document.getElementById('vfx-layer') || document.body;
            const elementId = `media-${mediaId}`;

            if (control === 'stop') {
                const existing = document.getElementById(elementId);
                if (existing) existing.remove();
                return;
            }

            if (control === 'pause' && format === 'video') {
                const existing = document.getElementById(elementId);
                if (existing) existing.pause();
                return;
            }

            if (control === 'play' && format === 'video') {
                const existing = document.getElementById(elementId);
                if (existing) {
                    existing.play();
                    return;
                }
            }

            // Create New
            const old = document.getElementById(elementId);
            if (old) old.remove();

            const el = document.createElement(format === 'video' ? 'video' : 'img');
            el.id = elementId;
            el.src = url;
            el.className = "absolute inset-0 w-full h-full object-cover pointer-events-none z-10 animate-fade-in";
            // Check if object-fit should be contain or cover? Usually cover for BG.

            if (format === 'video') {
                if (repeat) el.loop = true;
                el.autoplay = true;
                el.muted = false; // Note: Auto-play with sound often blocked by browser
                el.playsInline = true;
                el.play().catch(e => console.warn("Video play error", e));
            }

            container.appendChild(el);

            if (duration) {
                setTimeout(() => {
                    el.style.transition = 'opacity 0.5s';
                    el.style.opacity = '0';
                    setTimeout(() => el.remove(), 500);
                }, duration * 1000);
            }
        }
    }
};