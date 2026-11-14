// app.js

import { GameEngine } from './engine/GameEngine.js';
import { UIController } from './render/ui.js';
import { TaskManager } from './plugin/taskmanager.js';

// Import VFX từ vị trí mới
import { vfx } from './render/vfx/index.js';

// Import API Bridge
import { API } from './api/index.js';

class AppController {
    constructor() {
        this.script = null;
        this.currentScreen = 'home';
    }

    showScreen(id) {
        this.currentScreen = id;
        // [Refactor] Sử dụng API Navigation
        if (API.render.navigation) API.render.navigation.switchScreen(id);
    }

    loadDemo() {
        try {
            if (typeof DEMO_SCRIPT === 'undefined') {
                console.warn("DEMO_SCRIPT is undefined. Ensure demo_script.js is loaded.");
                // [Refactor] Sử dụng API Notification
                API.render.notification.alert("Missing Data", "Không tìm thấy dữ liệu DEMO_SCRIPT.", "warn");
                return;
            }

            this.script = JSON.parse(JSON.stringify(DEMO_SCRIPT));
            // [Refactor] Sử dụng API Setup
            if (API.render.setup) API.render.setup.scriptInfo(this.script);
            this.showScreen('info');
        } catch (err) {
            console.error(err);
            API.render.notification.alert("Error", "Lỗi tải demo: " + err.message, "danger");
        }
    }

    importScript(e) {
        const input = e?.target;
        const f = input?.files?.[0];
        if (!f) return;
        if (f.size > 5 * 1024 * 1024) {
            API.render.notification.alert("Import Error", "Tệp kịch bản vượt quá giới hạn 5 MB.", "danger");
            input.value = '';
            return;
        }
        if (f.type && f.type !== 'application/json' && !/\.json$/i.test(f.name || '')) {
            API.render.notification.alert("Import Error", "Chỉ chấp nhận tệp JSON.", "danger");
            input.value = '';
            return;
        }

        const r = new FileReader();
        r.onerror = () => API.render.notification.alert("Import Error", "Không thể đọc tệp JSON.", "danger");
        r.onload = (e) => {
            try {
                const parsed = JSON.parse(e.target.result);
                if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed) ||
                    !parsed.meta || typeof parsed.meta !== 'object' || Array.isArray(parsed.meta)) {
                    throw new Error("Cấu trúc kịch bản không hợp lệ: cần object gốc và meta dạng object.");
                }
                this.script = parsed;

                // [Refactor] Sử dụng API Setup
                if (API.render.setup) API.render.setup.scriptInfo(this.script);
                this.showScreen('info');
                e.target.value = ''; // Reset input
            } catch (err) {
                API.render.notification.alert("Import Error", "File JSON không hợp lệ:\n" + err.message, "danger");
            }
        };
        r.readAsText(f);
    }

    startGame() {
        try {
            // Sử dụng API để init engine
            if (API.engine) API.engine.init(this.script);
            if (window.ui && window.ui.applyConfig) window.ui.applyConfig();
            this.showScreen('game');
        } catch (err) {
            console.error(err);
            API.render.notification.alert("Runtime Error", "Lỗi khởi chạy kịch bản:\n" + err.message, "danger");
        }
    }
}

// Global initialization
// Thêm try-catch để đảm bảo nếu class lỗi thì vẫn log ra được
try {
    window.taskManager = new TaskManager();
    window.vfx = vfx; // VFX instance
    window.ui = new UIController();
    window.app = new AppController();
    window.engine = new GameEngine();
    window.API = API;

    console.log("--> App initialized on window.app", window.app);
} catch (e) {
    console.error("FATAL: Failed to initialize globals", e);
}

window.onload = () => {
    // Setup DOM elements (Toast container)
    if (!document.getElementById('toast-container')) {
        const tc = document.createElement('div');
        tc.id = 'toast-container';
        document.body.appendChild(tc);
    }
    console.log("App DOM loaded");
};