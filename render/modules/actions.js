// Quản lý Action rendering, chi tiết action và Cooldown
import { API } from '../../api/index.js';
import { ActionCard } from '../../components/ActionCard.js?v=5';

const DefaultActionIcons = {
    to_scene: 'directions_walk',
    swap_router: 'swap_horiz',
    get_item: 'pan_tool',
    faker: 'face_retouching_natural',
    default: 'touch_app'
};

export const actionMethods = {
    _viewMode: 'grid',

    toggleActionView(mode) {
        if (mode !== 'grid' && mode !== 'list') return;
        this._viewMode = mode;
        const btnGrid = document.getElementById('btn-view-grid');
        const btnList = document.getElementById('btn-view-list');
        if (btnGrid) btnGrid.className = `p-1.5 rounded-md transition-colors ${mode === 'grid' ? 'text-white bg-white/10' : 'text-slate-500 hover:text-white hover:bg-white/5'}`;
        if (btnList) btnList.className = `p-1.5 rounded-md transition-colors ${mode === 'list' ? 'text-white bg-white/10' : 'text-slate-500 hover:text-white hover:bg-white/5'}`;

        const container = document.getElementById('actions-list');
        if (container) {
            if (mode === 'list') {
                container.classList.add('view-list', 'grid-cols-1');
                container.classList.remove('grid-cols-2', 'md:grid-cols-3', 'lg:grid-cols-4', 'xl:grid-cols-5');
            } else {
                container.classList.remove('view-list', 'grid-cols-1');
                container.classList.add('grid-cols-2', 'md:grid-cols-3', 'lg:grid-cols-4', 'xl:grid-cols-5', 'gap-4');
                container.classList.remove('gap-3');
            }
            // Trigger re-render to update component HTML structure
            if (API.engine && API.engine.state && API.engine.state.sceneId) {
                const sId = API.engine.state.sceneId;
                const rId = API.engine.state.scenes[sId].activeRouterId;
                const actions = API.engine.getActions(sId, rId);
                this.renderActions(actions, sId, rId);
            }
        }
    },

    // --- COMPATIBILITY & UTILS ---
    ensureActionInfoModal() {
        // Global popover is now static in HTML, no need to create dynamic modal
    },

    closeActionDetail() {
        const pop = document.getElementById('global-popover');
        if (pop) pop.classList.remove('active');
    },

    // --- NEW POPOVER LOGIC ---
    handlePopover(e, show) {
        const pop = document.getElementById('global-popover');
        if (!pop) return;

        if (!show) {
            pop.classList.remove('active');
            return;
        }

        const target = e.currentTarget;
        const title = target.dataset.popTitle;
        const desc = target.dataset.popDesc;
        const thumb = target.dataset.popThumb;

        document.getElementById('pop-title').innerText = title || "";
        document.getElementById('pop-desc').innerText = desc || "No description.";

        const thumbEl = document.getElementById('pop-thumb');
        if (thumb) {
            thumbEl.style.backgroundImage = `url('${thumb}')`;
            thumbEl.style.display = 'block';
        } else {
            thumbEl.style.display = 'none';
        }

        // Positioning
        const rect = target.getBoundingClientRect();
        // Default: Top-Right of cursor/icon
        let top = rect.top - 10;
        let left = rect.right + 10;

        // Boundary Check (Right edge)
        if (left + 280 > window.innerWidth) {
            left = rect.left - 290; // Flip to left
        }
        // Boundary Check (Bottom edge)
        if (top + 150 > window.innerHeight) {
            top = window.innerHeight - 160;
        }

        pop.style.top = `${top}px`;
        pop.style.left = `${left}px`;
        pop.classList.add('active');
    },

    renderActions(actions, sId, rId) {
        const container = document.getElementById('actions-list');
        if (!container) return;

        const currentContext = `${sId}_${rId}`;
        const scrollTarget = document.getElementById('rp-body');
        let savedScrollTop = container.scrollTop;
        let savedPanelScroll = scrollTarget ? scrollTarget.scrollTop : 0;
        const shouldPreserveScroll = (this._lastRenderContext === currentContext);

        if (shouldPreserveScroll) {
            const prevHeight = container.offsetHeight;
            if (prevHeight > 0) container.style.minHeight = `${prevHeight}px`;
        } else {
            savedScrollTop = 0;
            savedPanelScroll = 0;
            container.scrollTop = 0;
            if (scrollTarget) scrollTarget.scrollTop = 0;
        }

        this._lastRenderContext = currentContext;
        container.innerHTML = '';

        if (this._viewMode === 'list') {
            container.classList.add('view-list', 'grid-cols-1');
            container.classList.remove('grid-cols-2', 'md:grid-cols-3', 'lg:grid-cols-4', 'xl:grid-cols-5');
        } else {
            container.classList.remove('view-list', 'grid-cols-1');
            container.classList.add('grid-cols-2', 'md:grid-cols-3', 'lg:grid-cols-4', 'xl:grid-cols-5', 'gap-4');
            container.classList.remove('gap-3');
        }

        // Update Buttons
        const btnGrid = document.getElementById('btn-view-grid');
        const btnList = document.getElementById('btn-view-list');
        if (btnGrid) btnGrid.className = `p-1.5 rounded-md transition-colors ${this._viewMode === 'grid' ? 'text-white bg-white/10' : 'text-slate-500 hover:text-white hover:bg-white/5'}`;
        if (btnList) btnList.className = `p-1.5 rounded-md transition-colors ${this._viewMode === 'list' ? 'text-white bg-white/10' : 'text-slate-500 hover:text-white hover:bg-white/5'}`;

        const fakerState = (API.engine.state.getFakerState && API.engine.state.getFakerState()) || { active: false };
        const isFakerActive = fakerState?.active;

        actions.forEach((act) => {
            const uId = `${sId}_${rId}_${act.id}`;
            const state = API.engine.state.getActionState(uId);

            if (state?.display === 'hide' || act.set.display === 'hide') return;

            let styleClass = "";
            let statusBadge = "";

            /* --- Permission Logic --- */
            const entryChar = String(API.engine.state.meta?.entryCharacter || 'player');
            const rawAllow = act.set.charAllow;
            const charAllowList = Array.isArray(rawAllow) ? rawAllow.map(c => String(c)) : [];
            const fakerMode = API.engine.getConfig ? API.engine.getConfig('fakerMode') : 'soul';
            let actingIds = new Set([entryChar]);

            if (isFakerActive) {
                const targetId = String(fakerState.targetId);
                if (fakerMode === 'mask' || fakerMode === 'swap') actingIds.add(targetId);
            }

            let isAllowed = true;
            if (charAllowList.length > 0) {
                const actingArray = Array.from(actingIds);
                const hasPermission = actingArray.some(id => charAllowList.includes(id));
                if (!hasPermission) isAllowed = false;
            }

            if (!isAllowed) {
                // Modified style for Restricted
                styleClass = "border-amber-500/30 bg-amber-900/10";
                statusBadge = `<div class="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-amber-600/80 text-white text-[10px] font-bold uppercase tracking-wider border border-white/10 shadow-sm z-20">Restricted</div>`;
            }

            const isLocked = state?.display === 'locked' || act.set.display === 'locked';
            const meta = act.meta; const set = act.set;

            let iconStr = meta.buttonIcon;
            if (!iconStr) {
                if (set.password) iconStr = 'pin';
                else iconStr = DefaultActionIcons[set.type] || DefaultActionIcons.default;
            }

            const isMat = /^[a-z0-9_]+$/.test(iconStr);
            const iconHtml = isMat ? `<span class="material-icons-round text-lg">${iconStr}</span>` : `<span class="text-lg font-bold">${iconStr}</span>`;

            // [MEDIA SUPPORT] Resolve thumb ID & Detect Video
            let thumbUrl = meta.thumb;
            let isVideo = false;

            if (thumbUrl) {
                let tUrl = thumbUrl;
                let forceVideo = false;

                if (tUrl.startsWith('photo:')) {
                    tUrl = tUrl.substring(6);
                } else if (tUrl.startsWith('video:')) {
                    tUrl = tUrl.substring(6);
                    forceVideo = true;
                }

                // Resolve ID to URL if not path
                if (!tUrl.includes('/') && !tUrl.startsWith('http') && API.engine && API.engine.src && API.engine.src.media) {
                    const mediaDef = API.engine.src.media[tUrl];
                    if (mediaDef && mediaDef.url) {
                        tUrl = mediaDef.url;
                        // Auto-detect if definition says it's video (and not forced to photo)
                        if (mediaDef.type === 'video' || forceVideo) {
                            isVideo = true;
                        }
                    }
                } else if (forceVideo) {
                    isVideo = true;
                }
                thumbUrl = tUrl;
            }
            if (!thumbUrl) thumbUrl = 'assets/images/thumbnail.png';

            let cooldownHTML = '';
            if (state && state.cooldownEnd && state.cooldownEnd > Date.now()) {
                const total = state.cooldownDuration * 1000;
                cooldownHTML = `
                <div class="action-cooldown-overlay absolute inset-0 bg-black/60 z-20 flex items-center justify-center pointer-events-none backdrop-blur-[3px]" 
                     data-end="${state.cooldownEnd}" 
                     data-total="${total}">
                     <div class="relative w-12 h-12 animate-pulse-slow">
                        <svg class="w-full h-full -rotate-90" viewBox="0 0 36 36">
                            <path class="text-white/10" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" stroke-width="3" />
                            <path class="text-sky-500 cd-bar-circle transition-all duration-300" stroke-dasharray="100, 100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" stroke-width="3" />
                        </svg>
                        <span class="absolute inset-0 flex items-center justify-center text-[10px] font-bold font-mono cd-text drop-shadow"></span>
                     </div>
                </div>`;
            }

            // Explicitly pass restricted boolean
            const isRestricted = !isAllowed;

            // [DESC READ LOGIC]
            const allDescRead = API.engine.getConfig && API.engine.getConfig('allDescRead');
            let showHint = false;

            // Does this action effectively require reading?
            const requiresRead = (allDescRead || set.readDesc === true) && !!meta.desc;

            // Has it been read in state?
            const hasBeenRead = state?.readDesc === true;

            if (requiresRead && !hasBeenRead && set.clickHintDesc > 0) {
                if (!this._clickAttempts) this._clickAttempts = {};
                const attempts = this._clickAttempts[uId] || 0;
                if (attempts >= set.clickHintDesc) {
                    showHint = true;
                }
            }

            const tempContainer = document.createElement('div');
            // Pass viewMode, restricted, matches video/hint to Component
            tempContainer.innerHTML = ActionCard({
                uId, meta, set, isLocked, isFakerActive, styleClass, statusBadge, cooldownHTML, thumbUrl, iconHtml,
                viewMode: this._viewMode || 'grid',
                restricted: isRestricted,
                isVideo: isVideo,
                showHint: showHint
            });
            const card = tempContainer.firstElementChild;

            // Attach Popover Events
            const infoBtn = card.querySelector('.info-trigger');
            if (infoBtn) {

                infoBtn.onmouseenter = (e) => {
                    this.handlePopover(e, true);
                    // [LOGIC] Mark as read on hover via Engine
                    if (requiresRead && !hasBeenRead) {
                        API.engine.action.markAsRead(uId);

                        // If we had a hint showing, remove valid visual feedback immediately
                        if (showHint) {
                            const btn = e.currentTarget;
                            btn.classList.remove('animate-bounce', 'text-yellow-400');
                        }
                    }
                };

                infoBtn.onmouseleave = (e) => this.handlePopover(e, false);
                // Also support click for mobile (toggle)
                infoBtn.onclick = (e) => {
                    e.stopPropagation();
                };
            }

            card.querySelector('.action-trigger').onclick = async () => {
                // Check Lock/Restricted first (Render level check for UI feedback)
                if (isLocked || isRestricted) {
                    this.shakeCard(uId);
                    const msg = isRestricted ? "Nhân vật của bạn không thể thực hiện hành động này." : "Hành động này hiện đang bị khóa.";
                    API.render.notification.add(isRestricted ? "Restricted" : "Locked", msg, "warn");
                    return;
                }

                // [SOUND SUPPORT] Trigger Sound
                if (set.sound) {
                    API.render.vfx.exec('sound', 'sfx', { src: set.sound });
                }

                // Call Engine Trigger
                const result = await API.engine.action.trigger(act.id, uId);

                // Handle Result
                if (result && result.success === false) {
                    if (result.reason === 'not_read') {
                        this.shakeCard(uId);
                        API.render.notification.add("Notice", "Vui lòng xem thông tin hành động trước.", "warn");

                        // Count attempt locally for Hint
                        if (!this._clickAttempts) this._clickAttempts = {};
                        if (!this._clickAttempts[uId]) this._clickAttempts[uId] = 0;
                        this._clickAttempts[uId]++;

                        // Check hint threshold
                        if (set.clickHintDesc > 0 && this._clickAttempts[uId] >= set.clickHintDesc) {
                            this.renderActions(actions, sId, rId);
                        }
                    } else if (result.reason === 'permission_denied') {
                        // Already handled by Engine notification, but we can shake again if needed
                    }
                }
            };
            container.appendChild(card);
        });

        container.style.minHeight = '';
        if (shouldPreserveScroll) {
            requestAnimationFrame(() => {
                const scrollTarget = document.getElementById('rp-body');
                if (scrollTarget) scrollTarget.scrollTop = savedPanelScroll;
                container.scrollTop = savedScrollTop;
            });
        }
    },

    updateCooldownVisuals() {
        const overlays = document.querySelectorAll('.action-cooldown-overlay');
        if (overlays.length === 0) return;
        const now = Date.now();
        overlays.forEach(el => {
            const end = parseInt(el.dataset.end);
            const total = parseInt(el.dataset.total);
            const remaining = end - now;
            if (remaining <= 0) { el.remove(); } else {
                const percent = Math.min(100, Math.max(0, (remaining / total) * 100));
                const seconds = Math.ceil(remaining / 1000);

                const bar = el.querySelector('.cd-bar-circle');
                const text = el.querySelector('.cd-text');

                if (bar) bar.setAttribute('stroke-dasharray', `${percent}, 100`);
                if (text) text.innerText = `${seconds}`;
            }
        });
    },

    shakeCard(uniqueId) {
        const card = document.getElementById(`card-${uniqueId}`);
        if (card) {
            card.classList.remove('shake-hard');
            void card.offsetWidth;
            card.classList.add('shake-hard');
        }
    }
};