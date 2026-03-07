/**
 * @file password/Base.js
 * @description Lớp cơ sở cho hệ thống Password.
 * Refactored to use HTML UI (render/modules/password.js) instead of Canvas.
 */

import { PasswordRender } from '../render/modules/password.js';

export class PasswordStrategy {
    constructor(system) {
        this.system = system;
        this.active = false;
    }

    /**
     * Hiển thị giao diện nhập password
     * @param {object} actionDef - Định nghĩa action
     * @param {string} uniqueId - ID duy nhất
     * @param {object} passDef - Định nghĩa password (type, value, hint, currentAttempts, retryMax)
     */
    async show(actionDef, uniqueId, passDef) {
        this.active = true;

        // Xác định loại password
        const type = passDef.type || 'string';

        try {
            // Render UI
            // PasswordRender now handles user interaction loop (retry, shake) internally
            const result = await PasswordRender.show(type, passDef);

            // Update attempts if returned
            if (result && typeof result.attempts === 'number') {
                this.system.updateAttempts(result.attempts);
            }

            // Handle Status
            if (result && result.status === 'success') {
                this.onSuccess();
            } else if (result && result.status === 'fail_max') {
                this.onFail();
            } else if (result && result.status === 'close') {
                // User closed manually (counts as attempt but no immediate fail)
                this.system.cancel();
            } else {
                // Cancel / Other
                this.system.cancel();
            }

        } catch (e) {
            console.error(`[PasswordStrategy] Error:`, e);
            this.system.cancel();
        }

        this.active = false;
    }

    // checkVerify no longer needed here as Render handles it for immediate feedback

    hide() {
        this.active = false;
        PasswordRender.close();
    }

    onSuccess() {
        // Delay nhẹ để UI đóng mượt mà (Managed by Render actually, but good to have safety)
        setTimeout(() => {
            this.system.finish(true);
        }, 100);
    }

    onFail() {
        setTimeout(() => {
            this.system.finish(false);
        }, 100);
    }
}
