import { ScriptInfoMeta, ScriptTag } from '../../components/Common.js';
import { API } from '../../api/index.js';

export const sceneMethods = {
    async handleTransition(phase, type, duration) {
        const overlayEl = document.getElementById('transition-overlay');
        const contentEl = document.getElementById('scene-container');

        if (!overlayEl) return;

        if (phase === 'start') {
            overlayEl.classList.remove('hidden');
            overlayEl.style.display = 'block';
            overlayEl.style.zIndex = '9999';
        }

        void overlayEl.offsetWidth;

        if (window.vfx) {
            await window.vfx.exec('transition', type, {
                overlay: overlayEl,
                content: contentEl,
                phase: phase,
                duration: duration
            });
        } else {
            console.warn("VFX Plugin missing! Using fallback transition.");
            const timeMs = (duration || 1) * 1000;

            overlayEl.style.transition = `opacity ${duration}s ease`;

            if (phase === 'start') {
                overlayEl.style.opacity = '1';
                overlayEl.style.pointerEvents = 'auto';
            } else {
                overlayEl.style.opacity = '0';
                overlayEl.style.pointerEvents = 'none';
            }

            await new Promise(r => setTimeout(r, timeMs));
        }

        if (phase === 'end') {
            overlayEl.style.zIndex = '-1';
            overlayEl.style.pointerEvents = 'none';
        }
    },

    slideGame(direction) {
        const slider = document.getElementById('game-slider');
        if (!slider) return;

        if (direction === 'right') {
            slider.classList.add('slide-to-right');
        } else {
            slider.classList.remove('slide-to-right');
        }
    },


    renderScene(s, r, actions) {
        const title = s?.meta?.title || s.title || "Unknown Scene";
        const titleEl = document.getElementById('scene-title');
        if (titleEl && titleEl.innerText !== title) titleEl.innerText = title;

        const badgeEl = document.getElementById('scene-title-badge');
        if (badgeEl && badgeEl.innerText !== title) badgeEl.innerText = title;

        if (!r || !r.meta) {
            console.error("Render Error: Router data missing.");
            return;
        }

        let descHtml = r.meta.desc || "No description.";
        if (r.meta.subTitleStatus) {
            descHtml = `<span class=\"text-green-400 font-bold mr-2\">${r.meta.subTitleStatus}</span>` + descHtml;
        }
        const descEl = document.getElementById('scene-desc');
        if (descEl && descEl.innerHTML !== descHtml) {
            descEl.innerHTML = descHtml;
        }

        let bgUrl = r.meta.cover || s.meta?.cover?.url || s.cover?.url;

        // [NEW] Resolve Media ID if format is video:id or photo:id, or just id?
        // User asked "photo:id, video:id".
        // Also simple ID lookup if it matches a media key?
        // Let's implement robust resolution.

        let bgType = 'image'; // default
        if (bgUrl) {
            // Check for prefix
            if (bgUrl.startsWith('video:')) {
                bgType = 'video';
                bgUrl = bgUrl.substring(6); // remove 'video:'
            } else if (bgUrl.startsWith('photo:')) {
                bgType = 'image';
                bgUrl = bgUrl.substring(6);
            }

            // Resolve ID to URL if not path
            if (!bgUrl.includes('/') && !bgUrl.startsWith('http') && engine && engine.src && engine.src.media) {
                const mediaDef = engine.src.media[bgUrl];
                if (mediaDef && mediaDef.url) {
                    bgUrl = mediaDef.url;
                    // Auto-detect type from media def if not forced by prefix
                    if (mediaDef.type === 'video') bgType = 'video';
                }
            }
        }

        const leftPanel = document.getElementById('left-panel');
        if (leftPanel) {
            const currentBg = leftPanel.getAttribute('data-bg');
            if (currentBg !== (r.meta.cover || s.meta?.cover?.url || '')) {
                // Use original string as key to detect change

                // Clear previous video if any
                const existingVideo = document.getElementById('scene-bg-video');
                if (existingVideo) existingVideo.remove();

                if (bgType === 'video' && bgUrl) {
                    leftPanel.style.backgroundImage = 'none';
                    const video = document.createElement('video');
                    video.id = 'scene-bg-video';
                    video.src = bgUrl;
                    video.autoplay = true;
                    video.loop = true;
                    video.muted = true; // Background video usually muted
                    video.playsInline = true;
                    video.className = "absolute inset-0 w-full h-full object-cover -z-10";
                    // Insert as first child to be behind everything (but overlay is on top?)
                    // left-panel has children? it seems it's just a panel.
                    // If it has children, we need z-index logic.
                    // Panel usually has gradient overlay in CSS? 
                    // The previous code used `linear-gradient(...)` in backgroundImage.
                    // If we use video, we need to overlay gradient separately or put video BEHIND gradient.
                    // Let's append video and ensure z-index is low.
                    // Or simply set innerHTML if panel is empty? 
                    // Panel likely has content? No, left-panel is usually the background container.
                    // Let's append it.
                    if (leftPanel.firstChild) {
                        leftPanel.insertBefore(video, leftPanel.firstChild);
                    } else {
                        leftPanel.appendChild(video);
                    }

                    // Add Gradient Overlay on top of video?
                    // The original code had linear-gradient in bgImage.
                    // We can keep the gradient in bgImage and have video behind it?
                    // No, CSS bgImage is on top of content (unless content is z-indexed higher? No).
                    // We can set bgImage to JUST the gradient, and let video show through?
                    leftPanel.style.backgroundImage = `linear-gradient(to bottom, rgba(0,0,0,0.1), rgba(0,0,0,0.8))`;
                    // Ensure video is behind.
                    video.style.zIndex = '-1';
                    // Ensure panel has relative positioning?
                    // It usually does.
                } else {
                    leftPanel.style.backgroundImage = bgUrl ? `linear-gradient(to bottom, rgba(0,0,0,0.1), rgba(0,0,0,0.8)), url('${bgUrl}')` : 'none';
                }

                leftPanel.setAttribute('data-bg', r.meta.cover || s.meta?.cover?.url || bgUrl || '');
            }
        }

        // [ACTION RENDER]
        if (this.renderActions && engine) {
            this.renderActions(actions, engine.state.sceneId, engine.state.scenes[engine.state.sceneId].activeRouterId);
        }

        const currentSceneId = API.engine.state.sceneId;
        const path = (API.engine.scene.getPath && API.engine.scene.getPath(currentSceneId)) || [];
        // Has Back if Path has at least 2 items (Root + Current) -> Parent is path[path.length - 2]
        // Actually, if we are deeper than root, we can go back.
        const hasBack = path.length > 1;

        // [FIX UI v13] Có 2 nút back (desktop nổi #back-node-btn + mobile trong
        // scene-bottom-toolbar #back-node-btn-mobile) — đồng bộ cả hai qua class dùng chung.
        const backBtns = document.querySelectorAll('.back-node-btn');
        backBtns.forEach(backBtn => {
            const shouldHide = !hasBack;
            backBtn.classList.toggle('hidden', shouldHide);
            // Go back to the immediate parent (second to last item)
            backBtn.onclick = () => {
                if (path.length >= 2) {
                    const parentNode = path[path.length - 2];
                    API.engine.scene.enterScene(parentNode.id, true);
                }
            };
        });

        // [SCROLL FIX] Only reset if context changes (New Scene OR New Router)
        const currentContext = `${engine?.state?.sceneId}_${engine?.state?.scenes[engine?.state?.sceneId]?.activeRouterId}`;

        if (this._lastRenderSceneContext !== currentContext) {
            // Only scroll to top if we have actually changed context
            if (s.meta && s.meta.resetScroll !== false) {
                const sc = document.getElementById('scene-container');
                if (sc) sc.scrollTop = 0;

                // Note: right-panel scroll is handled carefully in renderActions to avoid jumpiness during action updates.
                // But if context changes, we want to reset it.
                const rp = document.getElementById('rp-body');
                if (rp) rp.scrollTop = 0;
            }
            this._lastRenderSceneContext = currentContext;

            // [UI v13] Dọn danh sách NPC sheet khi đổi scene (thay cho rp-footer cũ)
            const npcList = document.getElementById('npc-sheet-list');
            if (npcList) npcList.innerHTML = '';
            if (window.ui) window.ui.toggleNpcSheet(false);

            // [NEW] Render Breadcrumbs
            const breadcrumbs = document.getElementById('breadcrumbs');
            const currentSceneId = API.engine.state.sceneId;
            const path = API.engine.scene.getPath(currentSceneId);
            // path is [{id, title}, {id, title}...] (root -> leaf)

            if (path.length > 0) {
                // Container style
                breadcrumbs.className = "flex items-center space-x-2 text-xs font-medium select-none p-2";

                const html = path.map((node, index) => {
                    const isLast = index === path.length - 1;
                    // Style: items before are dim, current is bright. Hover effect for links.
                    // [THEME] rp-header giờ là nền sáng (xem main.css) nên breadcrumb dùng
                    // token chữ tối (ink), không dùng text-white/NN của theme cũ.
                    const cssClass = isLast
                        ? "text-[var(--vsr-ink-900)] font-semibold"
                        : "text-[var(--vsr-ink-400)] hover:text-[var(--vsr-ink-700)] transition-colors duration-200 cursor-pointer";

                    const clickAttr = isLast ? "" : `onclick="API.engine.scene.enterScene('${node.id}')"`;

                    return `<span class="${cssClass}" ${clickAttr}>${node.title}</span>`;
                }).join(`
                        <svg class="w-3 h-3 text-[var(--vsr-ink-300)] -mx-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                        </svg>
                    `);

                breadcrumbs.innerHTML = html;
            } else {
                breadcrumbs.innerHTML = "";
            }
        }

        // [NEW] Always refresh character list when rendering scene
        if (window.ui && window.ui.renderCharacterFooter) window.ui.renderCharacterFooter();
    },

    // [UI v13] Trước đây render trực tiếp vào #rp-footer (chiếm không gian dọc cố định,
    // đi ngược yêu cầu "list action full-view" trên mobile). Giờ NPC được liệt kê trong
    // #npc-sheet (bottom sheet mở từ icon trong scene-bottom-toolbar) + badge đếm số lượng.
    renderCharacterFooter() {
        const sheetList = document.getElementById('npc-sheet-list');
        const badges = [document.getElementById('npc-badge'), document.getElementById('npc-badge-desktop')];
        if (!sheetList) return;

        sheetList.innerHTML = '';

        if (!API.engine || !API.engine.state) return;

        const characters = API.engine.state.getCharacters();
        if (!characters) { badges.forEach(b => b && b.classList.add('hidden')); return; }

        const sceneId = API.engine.state.sceneId;
        const fakerState = (API.engine.state.getFakerState && API.engine.state.getFakerState()) || { active: false };
        const entryChar = API.engine.state.meta?.entryCharacter || 'player';
        const currentIdentity = fakerState.active ? fakerState.targetId : entryChar;

        const activeChars = Object.entries(characters).filter(([id, char]) => {
            if (id === entryChar) return false;
            if (id === currentIdentity) return false;
            return char.place && char.place.scene_id === sceneId;
        });

        // Cập nhật badge số lượng trên toolbar (mobile) + header (desktop)
        badges.forEach(badge => {
            if (!badge) return;
            if (activeChars.length > 0) {
                badge.textContent = activeChars.length > 9 ? '9+' : String(activeChars.length);
                badge.classList.remove('hidden');
            } else {
                badge.classList.add('hidden');
            }
        });

        if (activeChars.length === 0) {
            sheetList.innerHTML = `<div class="text-center py-10 text-[var(--vsr-ink-400)] text-xs italic">Không có ai khác ở đây.</div>`;
            return;
        }

        const statusMap = {
            'danger': 'text-red-600 status-danger',
            'warning': 'text-amber-600 status-warning',
            'success': 'text-green-600 status-success',
            'notice': 'text-blue-600 status-notice'
        };

        activeChars.forEach(([id, char]) => {
            const type = char.set.alert || 'notice';
            const statusClass = statusMap[type] || 'text-[var(--vsr-ink-400)]';
            const dotClass = statusMap[type] ? statusMap[type].split(' ')[1] : '';

            const charName = char.set.name || char.meta.name || "Unknown";
            const avatarUrl = char.meta.avatar || '';
            const initial = charName.charAt(0).toUpperCase();

            const row = document.createElement('div');
            row.className = "flex items-center gap-3 p-3 rounded-xl hover:bg-[var(--vsr-tint-05)] cursor-pointer transition-colors char-avatar-wrapper";

            row.innerHTML = `
                <div class="char-avatar flex items-center justify-center text-base font-bold overflow-hidden shrink-0"
                     style="${avatarUrl ? `background-image: url('${avatarUrl}')` : ''}">
                     ${!avatarUrl ? initial : ''}
                     ${dotClass ? `<div class="char-dot-status ${dotClass}"></div>` : ''}
                </div>
                <div class="flex-1 min-w-0">
                    <div class="text-sm font-bold text-[var(--vsr-ink-900)] truncate">${charName}</div>
                    <div class="text-[11px] ${statusClass} uppercase tracking-wide font-bold">${type}</div>
                </div>
                <span class="material-icons-round text-[var(--vsr-ink-300)]">chevron_right</span>
            `;

            row.onclick = () => {
                const mainActionId = char.set.mainAction;
                if (mainActionId && API.engine && API.engine.action && API.engine.action.trigger) {
                    this.toggleNpcSheet(false);
                    API.engine.action.trigger(mainActionId, id);
                }
            };
            sheetList.appendChild(row);
        });
    },

    // Mở/đóng NPC sheet. Gọi không truyền tham số để toggle theo trạng thái hiện tại.
    toggleNpcSheet(force) {
        const sheet = document.getElementById('npc-sheet');
        const backdrop = document.getElementById('npc-sheet-backdrop');
        if (!sheet || !backdrop) return;
        const shouldOpen = (force !== undefined) ? force : !sheet.classList.contains('open');
        sheet.classList.toggle('open', shouldOpen);
        backdrop.classList.toggle('open', shouldOpen);
    },

    switchScreen(id) {
        if (id === 'home' && window.ui) window.ui.reset();
        const ss = ['home', 'info', 'game', 'inventory', 'character'];
        ss.forEach(s => {
            const el = document.getElementById(`screen-${s}`);
            if (s === id) {
                el.classList.remove('hidden');
                setTimeout(() => el.classList.replace('screen-hidden', 'screen-visible'), 10);
            } else {
                el.classList.replace('screen-visible', 'screen-hidden');
                setTimeout(() => { if (el.classList.contains('screen-hidden')) el.classList.add('hidden'); }, 400);
            }
        });

        if (id === 'inventory' && window.ui) window.ui.renderExplorerGrid();
        if (id === 'character' && window.ui) window.ui.renderContactScreen();

        const np = document.getElementById('notify-panel');
        if (np && !np.classList.contains('hidden-panel') && window.ui) window.ui.toggleNotifications();
    },

    showEnding(id) {
        const d = (engine.src.endings || {})[id] || { title: "THE END", desc: "Game Over" };
        const t = document.getElementById('end-title');
        const desc = document.getElementById('end-desc');
        if (t) t.innerText = d.title;
        if (desc) desc.innerText = d.desc;

        const s = document.getElementById('ending-screen');
        if (s) {
            s.classList.remove('hidden');
            setTimeout(() => s.classList.add('opacity-100'), 10);
        }
    },

    hideEnding() {
        const s = document.getElementById('ending-screen');
        if (s) {
            s.classList.replace('opacity-100', 'opacity-0');
            setTimeout(() => s.classList.add('hidden'), 1000);
        }
    },

    renderScriptInfo(script) {
        const m = script.meta || {};
        const setText = (id, text) => { const el = document.getElementById(id); if (el) el.innerText = text || ''; };
        setText('info-title', m.title || "Unknown Script");
        setText('info-subtitle', m.subtitle || "");
        setText('info-desc', m.desc || "No description provided.");
        setText('info-copyright', m.copyright || "");
        setText('info-updated', m.updatedAt ? "Updated: " + new Date(m.updatedAt).toLocaleDateString() : "");

        const tagsContainer = document.getElementById('info-tags');
        if (tagsContainer) {
            tagsContainer.innerHTML = '';
            if (m.tags && Array.isArray(m.tags)) {
                m.tags.forEach(tag => {
                    const span = document.createElement('span');
                    // Use Component
                    span.innerHTML = ScriptTag({ tag });
                    tagsContainer.appendChild(span.firstElementChild);
                });
            }
        }

        const grid = document.getElementById('meta-details-grid');
        if (grid) {
            grid.innerHTML = '';
            const fields = [{ k: 'writer', l: 'Author' }, { k: 'version', l: 'Version' }, { k: 'difficulty', l: 'Difficulty' }, { k: 'estimatedPlayTime', l: 'Play Time (min)' }, { k: 'language', l: 'Language' }, { k: 'ageRating', l: 'Age Rating' }];
            fields.forEach(f => {
                if (m[f.k]) {
                    const div = document.createElement('div');
                    div.className = "meta-item";
                    // Use Component
                    div.innerHTML = ScriptInfoMeta({ label: f.l, value: m[f.k] });
                    grid.appendChild(div);
                }
            });
        }
    }
};