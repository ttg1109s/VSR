/**
 * components/PasswordUI.js
 * Chứa các Template HTML riêng biệt cho từng loại mật khẩu.
 * Đảm bảo mọi button/input đều có pointer-events-auto.
 */

// 1. STRING PASSWORD (Terminal Style)
export const StringTemplate = ({ title, desc, value, hintIndices, hint }) => `
    <div class="flex flex-col items-center gap-6 w-full max-w-[95vw] pointer-events-auto">
        <div class="text-center space-y-2">
            <h3 class="text-xl font-bold text-emerald-400 tracking-widest uppercase glow-text">${title || "SECURITY TERMINAL"}</h3>
            <p class="text-xs text-slate-400 font-mono">${desc || "Enter access phrase to proceed."}</p>
        </div>
        
        <div class="pw-main-card w-full min-w-[300px] bg-black/80 p-6 rounded-xl border border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.1)] overflow-x-auto">
            <div class="flex flex-nowrap gap-2 justify-start md:justify-center mb-2 min-w-min" id="pw-string-inputs">
                ${Array.from({ length: value ? value.length : 6 }).map((_, i) => {
    const finalHints = hintIndices || hint;
    const isHint = finalHints && finalHints.includes(i);
    return `<input type="text" maxlength="1" 
                        class="pw-char-input w-10 h-12 text-center bg-[#1a1a1a] border ${isHint ? 'border-emerald-500 text-emerald-500' : 'border-white/10 text-white'} rounded focus:outline-none focus:border-emerald-400 font-mono text-xl uppercase transition-all shrink-0"
                        data-index="${i}" ${isHint ? 'disabled' : ''} value="${isHint ? value[i] : ''}">`;
}).join('')}
            </div>
             <p class="text-[10px] text-slate-500 text-center mt-4 sticky left-0 right-0">TYPE THE PHRASE USING YOUR KEYBOARD</p>
        </div>

        <div class="flex gap-4">
             <button id="pw-cancel-btn" class="px-6 py-2 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors uppercase text-xs font-bold tracking-wider">Close</button>
             <button id="pw-submit-btn" class="px-6 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/50 transition-all uppercase text-xs font-bold tracking-wider">Check</button>
        </div>
    </div>
`;

// 2. NUMBER: KEYBOARD (Classic Numpad)
export const NumpadTemplate = ({ title, desc, length }) => `
    <div class="flex flex-col items-center gap-6 w-full max-w-sm pointer-events-auto">
        <div class="text-center space-y-2">
            <h3 class="text-lg font-bold text-white tracking-wider">${title || "ACCESS CODE"}</h3>
            <p class="text-xs text-slate-400">${desc || "Enter numeric passcode."}</p>
        </div>

        <div class="pw-main-card bg-[#202020] p-6 rounded-2xl border border-white/10 shadow-2xl w-full min-w-[300px]">
            <!-- Display -->
            <div class="mb-6 h-12 bg-black/50 rounded-lg border border-white/5 flex items-center justify-start gap-3 overflow-x-auto whitespace-nowrap px-4" id="numpad-display-container">
                ${Array.from({ length: length || 4 }).map((_, i) => `<div class="w-3 h-3 rounded-full bg-slate-700 transition-colors pw-dot shrink-0" id="pw-dot-${i}"></div>`).join('')}
            </div>

            <!-- Keypad -->
            <div class="grid grid-cols-3 gap-3 select-none">
                ${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => `
                    <button type="button" class="numpad-btn h-14 rounded-lg bg-[#333] hover:bg-[#444] active:scale-95 transition-all text-white font-mono text-xl font-bold shadow-md border-b-2 border-black/30" data-value="${n}">${n}</button>
                `).join('')}
                <button type="button" class="numpad-btn h-14 rounded-lg bg-red-900/20 hover:bg-red-900/40 text-red-400 font-bold border-b-2 border-black/30" data-value="Clear">CLR</button>
                <button type="button" class="numpad-btn h-14 rounded-lg bg-[#333] hover:bg-[#444] text-white font-mono text-xl font-bold border-b-2 border-black/30" data-value="0">0</button>
                <button type="button" class="numpad-btn h-14 rounded-lg bg-green-900/20 hover:bg-green-900/40 text-green-400 font-bold border-b-2 border-black/30" data-value="OK">OK</button>
            </div>
        </div>
        <div class="mt-4">
             <button id="pw-cancel-btn" class="px-6 py-2 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors uppercase text-xs font-bold tracking-wider">Close</button>
        </div>
    </div>
`;

// 3. NUMBER: COMBINATION (Rolling Wheels)
export const CombinationTemplate = ({ title, desc, length, initial }) => `
    <div class="flex flex-col items-center gap-8 w-full max-w-[95vw] pointer-events-auto">
        <div class="text-center">
            <h3 class="text-xl font-bold text-amber-500 uppercase tracking-widest border-b border-amber-500/30 pb-2 mb-1">${title || "COMBINATION LOCK"}</h3>
             <p class="text-xs text-amber-700/70 font-mono">${desc || "Align the cylinders to unlock."}</p>
        </div>

        <div class="pw-main-card w-full min-w-[300px] overflow-x-auto bg-black/60 rounded-xl border border-amber-900/50 shadow-[inset_0_0_20px_rgba(0,0,0,1)] select-none">
             <div class="flex gap-2 p-4 justify-start md:justify-center min-w-min">
            ${Array.from({ length: length || 4 }).map((_, i) => `
                <div class="wheel-container flex flex-col items-center gap-2 bg-[#151515] p-2 rounded border border-white/5 relative overflow-hidden group shrink-0" data-index="${i}">
                    <button type="button" class="btn-wheel-up p-2 text-slate-500 hover:text-amber-400 transition-colors active:scale-90"><span class="material-icons-round">expand_less</span></button>
                    <div class="w-12 h-16 bg-gradient-to-b from-black via-[#333] to-black flex items-center justify-center border-y border-white/10 relative">
                        <span class="wheel-digit text-3xl font-mono font-bold text-white z-10">${initial ? initial[i] : '0'}</span>
                        <div class="absolute inset-0 bg-gradient-to-b from-black/80 via-transparent to-black/80 pointer-events-none"></div>
                    </div>
                    <button type="button" class="btn-wheel-down p-2 text-slate-500 hover:text-amber-400 transition-colors active:scale-90"><span class="material-icons-round">expand_more</span></button>
                </div>
            `).join('')}
            </div>
        </div>

        <div class="flex gap-4 mt-2">
             <button id="pw-cancel-btn" class="px-6 py-2 rounded border border-slate-600 text-slate-400 hover:text-white hover:border-white transition-colors text-xs font-bold uppercase">Close</button>
             <button id="pw-submit-btn" class="px-8 py-2 rounded bg-amber-700 hover:bg-amber-600 text-white shadow-lg transition-all text-sm font-bold uppercase tracking-widest">Check</button>
        </div>
    </div>
`;

// 4. NUMBER: MECHANICA (Switches/Binary)
export const MechanicaTemplate = ({ title, desc, length }) => `
    <div class="flex flex-col items-center gap-6 w-full max-w-xl pointer-events-auto">
        <div class="bg-slate-800 p-1 rounded-full border border-slate-600 mb-4 shadow-lg">
             <div class="px-4 py-1 text-[10px] font-mono text-slate-400 uppercase tracking-widest">${title || "CIRCUIT BREAKER"}</div>
        </div>

        <div class="pw-main-card bg-[#1a1a1a] p-8 rounded-lg border-2 border-slate-700 shadow-2xl relative w-full flex justify-center gap-4 select-none">
            <!-- Screws UI -->
            <div class="absolute top-2 left-2 w-3 h-3 rounded-full bg-slate-600 border border-slate-400 flex items-center justify-center"><div class="w-full h-0.5 bg-slate-800 rotate-45"></div></div>
            <div class="absolute top-2 right-2 w-3 h-3 rounded-full bg-slate-600 border border-slate-400 flex items-center justify-center"><div class="w-full h-0.5 bg-slate-800 rotate-45"></div></div>
            <div class="absolute bottom-2 left-2 w-3 h-3 rounded-full bg-slate-600 border border-slate-400 flex items-center justify-center"><div class="w-full h-0.5 bg-slate-800 rotate-45"></div></div>
            <div class="absolute bottom-2 right-2 w-3 h-3 rounded-full bg-slate-600 border border-slate-400 flex items-center justify-center"><div class="w-full h-0.5 bg-slate-800 rotate-45"></div></div>

            ${Array.from({ length: length || 5 }).map((_, i) => `
                <div class="mechanica-switch-group flex flex-col items-center gap-3">
                    <div class="w-2 h-2 rounded-full bg-black shadow-[inset_0_0_2px_rgba(255,255,255,0.5)] indicator-light transition-colors duration-300" id="mech-light-${i}"></div>
                    <div class="relative w-12 h-24 bg-black rounded-full border-2 border-[#333] shadow-inner p-1 cursor-pointer mechanica-switch transition-all group" data-index="${i}" data-state="0">
                        <div class="switch-handle w-full h-10 bg-gradient-to-b from-slate-400 to-slate-600 rounded-full shadow-md transform transition-transform duration-300 translate-y-10 group-hover:from-slate-300 group-hover:to-slate-500"></div>
                    </div>
                    <span class="font-mono text-[10px] text-slate-500">${i + 1}</span>
                </div>
            `).join('')}
        </div>

        <div class="text-center">
            <p class="text-xs text-slate-400 font-mono mb-4">${desc || "Configure the switches to the correct sequence."}</p>
            <div class="flex gap-4 justify-center">
                <button id="pw-cancel-btn" class="px-4 py-2 text-xs font-bold text-slate-500 hover:text-white uppercase">Close</button>
                <button id="pw-submit-btn" class="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded shadow-lg text-xs font-bold uppercase border-b-4 border-slate-900 active:border-b-0 active:translate-y-1 transition-all">Check</button>
            </div>
        </div>
    </div>
`;

// 5. NUMBER: ROTARY DIAL (Fixed & Improved Logic)
export const RotaryTemplate = ({ title, desc }) => {
    // LAYOUT LOGIC:
    // ... (Comment details about angles, see RotaryStrategy)

    const numberMap = [
        { n: 1, angle: 0 },
        { n: 2, angle: -30 },
        { n: 3, angle: -60 },
        { n: 4, angle: -90 },
        { n: 5, angle: -120 },
        { n: 6, angle: -150 },
        { n: 7, angle: 180 },
        { n: 8, angle: 150 },
        { n: 9, angle: 120 },
        { n: 0, angle: 90 }
    ];

    return `
    <div class="flex flex-col items-center justify-center w-full h-full pointer-events-auto select-none " id="rotary-container">
        <h3 class="text-white font-serif italic text-2xl mb-2 drop-shadow-lg select-none">${title || "Rotary Dial"}</h3>
        <p class="text-[10px] text-slate-400 mb-4 opacity-70 uppercase tracking-widest text-center max-w-xs">${desc || "Hold the knob to spin. Release to select."}</p>
        
        <div class="pw-main-card relative w-[320px] h-[320px] rounded-full bg-gradient-to-br from-[#2a2a2a] to-black border-4 border-[#444] shadow-2xl flex items-center justify-center select-none">
            
            <!-- Center Label (Static) -->
            <div class="absolute inset-0 m-auto w-32 h-32 rounded-full bg-white flex items-center justify-center border-4 border-[#ccc] z-20 pointer-events-none shadow-lg">
                <div class="text-center">
                    <div class="text-[10px] text-slate-500 uppercase tracking-widest mb-1">INPUT</div>
                    <div id="rotary-display" class="text-2xl font-bold font-mono text-black tracking-widest min-w-[100px] border-b border-black/20 pb-1 h-8"></div>
                </div>
            </div>
            
            <!-- #rotary-dial: STATIC Container (Visual Only now, events on Knob) -->
            <div id="rotary-dial" class="absolute inset-0 rounded-full z-0 pointer-events-none">
                 
                 <!-- #rotary-ring: Rotating Visual Layer (Numbers Only) -->
                 <!-- Initial pos: 0deg. No Overlap with 45deg Knob. -->
                 <div id="rotary-ring" class="absolute inset-0 rounded-full will-change-transform pointer-events-none" style="transform: rotate(0deg);">
                     ${numberMap.map((item) => {
        return `
                            <div class="rotary-number absolute top-1/2 left-1/2 w-10 h-10 -ml-5 -mt-5 rounded-full bg-black/40 border border-white/5 flex items-center justify-center text-xl font-bold text-slate-300 select-none z-10 transition-all duration-300"
                                 style="transform: rotate(${item.angle}deg) translate(125px) rotate(${-item.angle}deg);"
                                 data-value="${item.n}" data-angle="${item.angle}">
                                 ${item.n}
                            </div>
                         `;
    }).join('')}
                 </div>

                 <!-- #rotary-knob: STATIC Trigger Button (High Z-Index) -->
                 <!-- Positioned at Bottom Right (approx 45deg from center) -->
                 <!-- translate(125px) at 45deg rotation equivalent position -->
                 <!-- Important: pointer-events-auto so it captures clicks -->
                 <div id="rotary-knob" class="absolute top-1/2 left-1/2 w-16 h-16 -ml-8 -mt-8 rounded-full bg-white shadow-[0_0_20px_rgba(255,255,255,0.8)] flex items-center justify-center pointer-events-auto cursor-pointer hover:bg-emerald-50 transition-transform active:scale-95 border-4 border-slate-200 z-50"
                      style="transform: rotate(45deg) translate(125px) rotate(-45deg);">
                    <div class="w-3 h-3 bg-black/20 rounded-full"></div>
                 </div>

            </div>
            
            <!-- Target Indicator (Highlight) -->
            <div id="rotary-highlight" class="absolute inset-0 pointer-events-none opacity-0 transition-opacity duration-200 z-10">
                <div class="absolute top-1/2 left-1/2 w-20 h-20 -ml-10 -mt-10 bg-emerald-500/20 rounded-full blur-xl border border-emerald-400/30" id="highlight-blob"></div>
            </div>

        </div>
        
        <div class="flex gap-4 mt-8 z-40">
             <button id="rotary-clear" class="px-5 py-2 rounded-full border border-white/20 text-white/70 hover:bg-white/10 hover:text-white transition-colors text-xs font-bold uppercase tracking-wider">Reset Input</button>
             <button id="pw-submit-btn" class="px-8 py-2 rounded-full bg-white text-black font-bold hover:bg-slate-200 transition-colors shadow-lg text-sm uppercase tracking-widest">Call</button>
             <button id="pw-cancel-btn" class="px-5 py-2 text-white/50 hover:text-red-400 transition-colors text-xs font-bold uppercase tracking-wider">Close</button>
        </div>
    </div>
`};

// 6. FIND WAY (Pathfinding Grid)
export const FindWayTemplate = ({ title, desc, gridW, gridH }) => `
    <div class="flex flex-col items-center gap-4 w-full max-w-2xl pointer-events-auto select-none">
        <div class="flex justify-between items-end w-full border-b border-blue-500/30 pb-2 mb-2">
            <div>
                <h3 class="text-lg font-bold text-blue-400 font-mono uppercase">${title || "NEURAL LINK"}</h3>
                <p class="text-xs text-blue-300/60">${desc || "Connect Start to Target."}</p>
            </div>
            <button id="pw-reset-way" class="text-xs text-blue-400 hover:text-white underline px-2 py-1">Reset Path</button>
        </div>

        <div class="pw-main-card bg-black/80 p-4 rounded-lg border border-blue-900/50 shadow-[0_0_30px_rgba(37,99,235,0.1)] relative">
            <div id="findway-grid" class="grid gap-1" style="grid-template-columns: repeat(${gridW}, minmax(0, 1fr));">
                ${Array.from({ length: gridW * gridH }).map((_, i) => {
    const x = i % gridW;
    const y = Math.floor(i / gridW);
    return `<div class="fw-cell w-10 h-10 md:w-12 md:h-12 bg-[#0f172a] border border-[#1e293b] hover:border-blue-500/50 transition-colors rounded-sm cursor-pointer relative flex items-center justify-center font-mono font-bold text-sm text-white select-none" data-x="${x}" data-y="${y}"></div>`;
}).join('')}
            </div>
            
            <div class="absolute inset-0 bg-gradient-to-b from-blue-500/5 to-transparent pointer-events-none animate-scanline"></div>
        </div>

        <div class="flex gap-4 mt-2">
             <button id="pw-cancel-btn" class="px-6 py-2 border border-blue-900 text-blue-500 hover:text-white hover:border-blue-500 transition-colors rounded text-xs font-bold uppercase tracking-widest">Close</button>
             <button id="pw-submit-btn" class="px-8 py-2 bg-blue-700 hover:bg-blue-600 text-white rounded shadow-lg shadow-blue-900/50 transition-all text-xs font-bold uppercase tracking-widest">Check</button>
        </div>
    </div>
`;

// 7. PUZZLE (Sliding/Swap Tiles)
// 7. PUZZLE (Sliding/Swap Tiles)
export const PuzzleTemplate = ({ title, desc, rows, cols, ratio }) => {
    // Parse ratio string "w:h" back to value for CSS
    const [w, h] = (ratio || "1:1").split(':');

    return `
    <div class="flex flex-col items-center gap-4 w-full h-full max-h-screen p-4 pointer-events-auto select-none overflow-hidden">
        <div class="text-center shrink-0 z-20">
            <h3 class="text-lg md:text-xl font-bold text-pink-500 font-serif tracking-widest drop-shadow-md">${title || "FRAGMENTED MEMORY"}</h3>
            <p class="text-[10px] md:text-xs text-pink-300/70">${desc || "Slide tiles to reconstruct the image."}</p>
        </div>

        <div class="pw-main-card flex items-center justify-center w-full max-w-[90vw] md:max-w-[80vh] grow overflow-hidden animate-fade-in">
            <div id="puzzle-grid" class="relative w-full max-h-full bg-[#1a1a1a] border-4 border-pink-500/20 shadow-2xl rounded-lg overflow-hidden shrink-0" 
                 style="aspect-ratio: ${w} / ${h};">
                <style>
                    .cyber-spinner {
                        width: 64px;
                        height: 64px;
                        border: 4px solid rgba(236, 72, 153, 0.1);
                        border-left-color: #ec4899;
                        border-right-color: #ec4899;
                        border-radius: 50%;
                        animation: cyber-spin 1s linear infinite, cyber-pulse 2s ease-in-out infinite;
                        box-shadow: 0 0 15px #ec4899, inset 0 0 15px #ec4899;
                    }
                    @keyframes cyber-spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
                    @keyframes cyber-pulse { 0%, 100% { opacity: 1; box-shadow: 0 0 15px #ec4899; } 50% { opacity: 0.7; box-shadow: 0 0 5px #ec4899; } }
                    .loading-text { font-family: 'Courier New', monospace; letter-spacing: 2px; animation: text-blink 1s steps(2) infinite; }
                    @keyframes text-blink { 0% { opacity: 1; } 50% { opacity: 0.5; } }
                </style>
                <!-- Tiles injected here -->
                <div id="puzzle-loading" class="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/90 backdrop-blur-md transition-opacity duration-500">
                    <div class="cyber-spinner mb-4"></div>
                    <div class="loading-text text-pink-500 text-xs font-bold">INITIALIZING SYSTEM...</div>
                    <div id="loading-status" class="text-pink-300/50 text-[10px] mt-2">Connecting...</div>
                </div>
            </div>
        </div>

        <div class="flex gap-4 shrink-0 z-20 pb-2">
             <button id="pw-cancel-btn" class="px-6 py-2 rounded-full border border-pink-900 bg-black/50 text-pink-700 hover:text-pink-400 hover:border-pink-500 transition-colors text-xs font-bold backdrop-blur-sm">Close</button>
             <button id="pw-submit-btn" class="px-8 py-2 rounded-full bg-pink-700 hover:bg-pink-600 text-white shadow-lg shadow-pink-900/50 transition-all text-xs font-bold tracking-widest">Check</button>
        </div>
    </div>
`};

// 8. SWITCH (4-Level Switches)
export const SwitchTemplate = ({ title, desc, length }) => `
    <div class="flex flex-col items-center gap-6 w-full max-w-xl pointer-events-auto select-none">
        <div class="text-center space-y-2 mb-2">
            <h3 class="text-lg font-bold text-gray-200 tracking-wider font-mono">${title || "POWER ARRAY"}</h3>
            <p class="text-xs text-gray-400 font-mono">${desc || "Adjust power levels."}</p>
        </div>

        <div class="pw-main-card bg-[#151515] p-6 rounded-xl border border-gray-700 shadow-2xl flex justify-center gap-6 md:gap-8">
            ${Array.from({ length: length || 3 }).map((_, i) => `
                <div class="switch-unit flex flex-col items-center gap-3">
                    <!-- Status Light -->
                    <div class="w-3 h-3 rounded-full bg-black border border-gray-700 shadow-inner transition-colors duration-300" id="sw-light-${i}"></div>
                    
                    <!-- Switch Track -->
                    <div class="relative w-12 h-64 bg-gray-900 rounded border border-gray-700 shadow-inner cursor-pointer switch-track" data-index="${i}">
                        <!-- Tick Marks (9 levels = 8 intervals) -->
                        <div class="absolute inset-0 flex flex-col justify-between py-2 px-3 pointer-events-none z-0 opacity-30">
                            ${Array.from({ length: 9 }).map(() => `<span class="w-full h-px bg-gray-500"></span>`).join('')}
                        </div>
                        
                        <!-- Handle (Height ~10% for 9 levels) -->
                        <div class="switch-handle absolute left-1 right-1 h-[10%] bg-gradient-to-b from-gray-500 to-gray-700 rounded border border-gray-400 shadow-lg transition-all duration-200 z-10"
                             style="bottom: 0%;" data-level="0">
                             <div class="w-full h-full flex items-center justify-center">
                                <div class="w-6 h-0.5 bg-black/30 rounded-full"></div>
                             </div>
                        </div>
                    </div>

                    <!-- Value Display -->
                    <span class="font-mono text-sm text-blue-400 font-bold" id="sw-val-${i}">0</span>
                </div>
            `).join('')}
        </div>

        <div class="flex gap-4 mt-2">
             <button id="pw-cancel-btn" class="px-6 py-2 border border-gray-600 text-gray-400 hover:text-white hover:border-white transition-colors rounded text-xs font-bold uppercase">Close</button>
             <button id="pw-submit-btn" class="px-8 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded shadow-lg transition-all text-xs font-bold uppercase tracking-widest">Check</button>
        </div>
    </div>
`;