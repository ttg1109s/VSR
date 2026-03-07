export class Loop {
    /**
     * @param {number} time - Thời gian lặp (ms)
     * @param {function} callback - Hàm thực thi
     * @param {string} mode - 'interval' (setInterval) hoặc 'timeout' (setTimeout bù giờ)
     * @param {number} count - Số lần chạy (0 = vô hạn)
     */
    constructor(time = 0, callback = () => { }, mode = 'interval', count = 0) {
        this.time = time;
        this.callback = callback;
        this.mode = mode;
        this.count = count;
        this.currentCount = 0;

        this.timerId = null;
        this.isRunning = false;
        this.isBusy = false;
        this.expected = 0;
        this.lastTick = 0;
        this.isPaused = false;
        this.remainingTime = 0;
    }

    #tickCount() {
        if (!this.isRunning) return false;
        this.currentCount++;

        if (this.count > 0 && this.currentCount >= this.count) {
            this.disabled();
            return false;
        }
        return true;
    }

    #runInterval() {
        if (this.timerId) clearInterval(this.timerId);

        this.timerId = setInterval(() => {
            if (!this.isRunning || this.isPaused) return;
            if (this.isBusy) return;
            this.isBusy = true;
            this.lastTick = Date.now();

            try {
                this.callback();
            } catch (error) {
                console.error("TaskManager Interval Error:", error);
            }

            this.#tickCount();
            this.isBusy = false;
        }, Math.max(10, this.time));
    }

    #runTimeout() {
        if (!this.isRunning) return;

        const now = Date.now();
        const drift = now - this.expected;

        if (drift > this.time) {
            this.expected = now;
        }

        try {
            this.callback();
        } catch (error) {
            console.error("TaskManager Timeout Error:", error);
        }

        if (!this.#tickCount()) return;

        this.expected += this.time;
        const nextDelay = Math.max(10, this.time - drift);

        this.timerId = setTimeout(() => {
            if (this.isRunning) this.#runTimeout();
        }, nextDelay);
    }

    enabled() {
        if (typeof this.callback !== 'function') {
            console.error("TaskManager: Callback must be a function");
            return;
        }
        if (this.time <= 0) {
            console.error("TaskManager: Time must be greater than 0");
            return;
        }

        if (this.isRunning) return;
        this.isRunning = true;
        this.isPaused = false;
        this.currentCount = 0;
        this.isBusy = false;
        this.lastTick = Date.now();

        if (this.mode === 'interval') {
            this.#runInterval();
        } else if (this.mode === 'timeout') {
            this.expected = Date.now() + this.time;
            this.timerId = setTimeout(() => {
                if (this.isRunning) this.#runTimeout();
            }, this.time);
        }
    }

    disabled() {
        this.isRunning = false;
        this.isPaused = false;
        if (this.timerId) {
            if (this.mode === 'interval') clearInterval(this.timerId);
            else clearTimeout(this.timerId);
            this.timerId = null;
        }
    }

    pause() {
        if (!this.isRunning || this.isPaused) return;
        this.isPaused = true;

        const now = Date.now();
        if (this.mode === 'timeout') {
            this.remainingTime = Math.max(0, this.expected - now);
            clearTimeout(this.timerId);
        } else {
            this.remainingTime = Math.max(0, this.time - (now - this.lastTick));
            clearInterval(this.timerId);
        }
        this.timerId = null;
    }

    resume() {
        if (!this.isRunning || !this.isPaused) return;
        this.isPaused = false;

        this.timerId = setTimeout(() => {
            if (!this.isRunning || this.isPaused) return;

            if (this.isBusy) return;
            this.isBusy = true;
            this.lastTick = Date.now();
            try { this.callback(); } catch (e) { console.error("TaskManager Resume Error:", e); }
            const continueLoop = this.#tickCount();
            this.isBusy = false;

            if (!continueLoop) return;

            if (this.mode === 'interval') {
                this.#runInterval();
            } else {
                this.expected = Date.now() + this.time;
                this.#runTimeout();
            }
        }, this.remainingTime);
    }
}

export class TaskManager {
    constructor(plan = {}, delayEnd = 120) {
        this.plan = plan;
        this.running = {};
        this.delayEnd = delayEnd;
    }

    #validate(taskName, config) {
        const { time, exe, mode, count } = config;

        if (!taskName) {
            console.error("TaskManager: Task name is required");
            return false;
        }

        // [FIX CRITICAL] Không bao giờ throw lỗi "Task already exists"
        // Thay vào đó, âm thầm kill task cũ và overwrite
        if (this.plan[taskName]) {
            this.kill(taskName);
        }

        if (typeof time !== 'number' || time <= 0) {
            console.error(`TaskManager: Invalid time for task ${taskName}`);
            return false;
        }
        if (typeof exe !== 'function') {
            console.error(`TaskManager: Executor must be a function for task ${taskName}`);
            return false;
        }

        return true;
    }

    operator(taskName, mode) {
        const taskLoop = this.plan[taskName];
        if (!taskLoop) return;

        if (mode === 'enabled') {
            if (!this.running[taskName]) {
                this.running[taskName] = true;
                taskLoop.enabled();
            }
        } else if (mode === 'disabled') {
            if (this.running[taskName]) {
                this.running[taskName] = false;
                taskLoop.disabled();
            }
        }
    }

    addNew(taskName, config) {
        if (!this.#validate(taskName, config)) return; // Validate trả về false thay vì throw

        this.plan[taskName] = new Loop(
            config.time,
            config.exe,
            config.mode,
            config.count ?? 0
        );
        this.running[taskName] = false;
    }

    kill(taskName) {
        if (!this.plan[taskName]) return;
        this.operator(taskName, 'disabled');
        delete this.plan[taskName];
        delete this.running[taskName];
    }

    killAll() {
        Object.keys(this.plan).forEach(taskName => this.kill(taskName));
    }

    pause(taskName) {
        const taskLoop = this.plan[taskName];
        if (taskLoop && this.running[taskName]) {
            taskLoop.pause();
        }
    }

    resume(taskName) {
        const taskLoop = this.plan[taskName];
        if (taskLoop && this.running[taskName]) {
            taskLoop.resume();
        }
    }
}