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
        const f = e.target.files[0];
        if (!f) return;

        const r = new FileReader();
        r.onload = (e) => {
            try {
                this.script = JSON.parse(e.target.result);

                if (!this.script.meta) {
                    throw new Error("Dữ liệu thiếu thông tin 'meta' bắt buộc.");
                }

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