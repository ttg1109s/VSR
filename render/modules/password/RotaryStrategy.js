import { BaseStrategy } from './BaseStrategy.js';
import { RotaryTemplate } from '../../../components/PasswordUI.js';

export class RotaryStrategy extends BaseStrategy {
    init() {
        this.internalState = "";
        this.isRotating = false;

        // Cấu hình Kim Chỉ (Marker)
        // Knob ở góc 45 độ (Bottom Right)
        this.markerAngle = 45;

        this.dial = null;
        this.ring = null;
        this.knob = null;
        this.dialCenter = { x: 0, y: 0 };

        this.currentDialRotation = 0; // Góc bàn số hiện tại
    }

    getHTML() {
        return RotaryTemplate(this.config);
    }

    postRender() {
        this.dial = document.getElementById('rotary-dial'); // Wrapper
        this.ring = document.getElementById('rotary-ring'); // Rotating Visuals
        this.knob = document.getElementById('rotary-knob'); // Static Trigger
        this.container = document.getElementById('rotary-container');

        if (!this.ring || !this.knob) {
            console.error('[Rotary Debug] LỖI: Không tìm thấy element #rotary-ring hoặc #rotary-knob');
            return;
        }

        console.log('[Rotary Debug] Init xong. Trigger: Knob.');

        // Mouse Events on KNOB
        this.knob.addEventListener('mousedown', (e) => this._onPressStart(e));
        // Prevent native drag which swallows mouseup
        this.knob.addEventListener('dragstart', (e) => e.preventDefault());

        // Robust Release: Catch it on knob, document, or window
        this.knob.addEventListener('mouseup', (e) => this._onRelease(e));
        document.addEventListener('mouseup', (e) => this._onRelease(e));

        // Touch Events
        this.knob.addEventListener('touchstart', (e) => this._onPressStart(e));
        window.addEventListener('touchend', (e) => this._onRelease(e));
        this.knob.addEventListener('touchend', (e) => this._onRelease(e));

        // Cập nhật tâm xoay
        this._updateCenter();
        window.addEventListener('resize', () => this._updateCenter());
    }

    _updateCenter() {
        if (!this.dial) return;
        const rect = this.dial.getBoundingClientRect();
        this.dialCenter = {
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2
        };
    }

    // 1. SỰ KIỆN NHẤN (MouseDown vào KNOB) -> XOAY RING
    _onPressStart(e) {
        e.preventDefault();
        if (this.isRotating) return;

        this.isRotating = true;
        console.log('[Rotary Debug] -> Knob HOLD - Start Spinning Ring');

        // Prepare animation
        this.ring.classList.remove('transition-transform', 'duration-500', 'ease-out');

        // Start Loop
        this._spinLoop();
    }

    _spinLoop() {
        if (!this.isRotating) return;

        // Tốc độ xoay
        const speed = 2;
        this.currentDialRotation += speed;

        // Apply rotation to RING
        this.ring.style.transform = `rotate(${this.currentDialRotation}deg)`;

        this.animationFrameId = requestAnimationFrame(() => this._spinLoop());
    }

    // 2. SỰ KIỆN NHẢ (MouseUp GLOBAL) -> DỪNG
    _onRelease(e) {
        if (!this.isRotating) return;

        console.log('[Rotary Debug] -> Knob RELEASE - Stop Spinning');

        this.isRotating = false;
        if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);

        // --- CHECK INPUT ---
        this._checkInput();

        // --- RESET RING TO 0deg (Home) ---
        console.log('[Rotary Debug] Animation: Reset Ring to 0deg');
        requestAnimationFrame(() => {
            this.ring.classList.add('transition-transform', 'duration-500', 'ease-out');
            this.ring.style.transform = `rotate(0deg)`;
            this.currentDialRotation = 0;
        });
    }

    _checkInput() {
        // Chuẩn hóa góc bàn số về khoảng 0-360
        let dialRot = this.currentDialRotation % 360;
        if (dialRot > 180) dialRot -= 360;
        if (dialRot <= -180) dialRot += 360;

        console.log(`[Rotary Debug] Góc bàn số lúc nhả: ${dialRot.toFixed(2)}`);

        const threshold = 15; // Sai số cho phép (+- 15 độ)
        const numberEls = this.container.querySelectorAll('.rotary-number');

        let hitNumber = null;

        for (let el of numberEls) {
            const n = parseInt(el.dataset.value);
            const originalPos = parseFloat(el.dataset.angle);

            // Pos = Góc Gốc + Góc Xoay Bàn
            let currentPos = (originalPos + dialRot) % 360;
            if (currentPos > 180) currentPos -= 360;
            if (currentPos <= -180) currentPos += 360;

            // So sánh vị trí thực tế này với Kim Chỉ (Marker)
            let diff = Math.abs(currentPos - this.markerAngle);
            if (diff > 180) diff = 360 - diff;

            if (diff < threshold) {
                console.log(`[Rotary Debug] >>> TRÚNG! Số ${n} khớp Kim chỉ! (Diff: ${diff.toFixed(2)})`);
                hitNumber = n;
                break;
            }
        }

        if (hitNumber !== null) {
            this._triggerInput(hitNumber);
        } else {
            console.log('[Rotary Debug] Không trúng số nào.');
        }
    }

    _triggerInput(val) {
        // Logic input số
        console.log(`[Rotary Debug] INPUT: ${val}`);

        this._addInput(val);

        // Hiệu ứng Visual Feedback
        const flash = document.getElementById('rotary-flash');
        if (flash) {
            flash.classList.remove('bg-emerald-500/0');
            flash.classList.add('bg-emerald-500/50');
            setTimeout(() => {
                flash.classList.remove('bg-emerald-500/50');
                flash.classList.add('bg-emerald-500/0');
            }, 200);
        }
    }

    handleClick(e, target) {
        if (target.closest('#rotary-clear')) {
            console.log('[Rotary Debug] Reset Input');
            this.internalState = "";
            const display = document.getElementById('rotary-display');
            if (display) {
                display.innerText = "";
                display.classList.add('animate-pw-shake');
                setTimeout(() => display.classList.remove('animate-pw-shake'), 400);
            }
            return true;
        }
        return false;
    }

    _addInput(val) {
        if (this.internalState.length < 12) {
            this.internalState += val;
            const display = document.getElementById('rotary-display');
            if (display) {
                display.innerText = this.internalState;
                display.classList.remove('scale-110');
                void display.offsetWidth;
                display.classList.add('scale-110', 'transition-transform');
                setTimeout(() => display.classList.remove('scale-110'), 100);
            }
        }
    }

    getValue() {
        return this.internalState;
    }
}