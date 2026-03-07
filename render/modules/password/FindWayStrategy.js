import { BaseStrategy } from './BaseStrategy.js';
import { FindWayTemplate } from '../../../components/PasswordUI.js';

export class FindWayStrategy extends BaseStrategy {
    init() {
        this.internalState = [];
        // Removed isDrawing logic

        // Parse config
        // Default 5x5 if not specified
        this.gridW = this.config.area ? this.config.area[0] : 5;
        this.gridH = this.config.area ? this.config.area[1] : 5;
        this.startPos = this.config.start || [0, 0];
        this.targetPos = this.config.target || [this.gridW - 1, this.gridH - 1];

        // Start point is always the first point in path
        this.internalState.push(this.startPos);
    }

    getHTML() {
        return FindWayTemplate({
            ...this.config,
            gridW: this.gridW,
            gridH: this.gridH
        });
    }

    postRender() {
        // 1. Mark Static Start/Target
        // Start is 0
        this.markCell(this.startPos[0], this.startPos[1], 'fw-start', 0);
        this.markCell(this.targetPos[0], this.targetPos[1], 'fw-target');

        // 2. Visually select Start as first path node
        this.markCell(this.startPos[0], this.startPos[1], 'fw-path');

        // 3. Bind Grid Events
        const grid = this.container.querySelector('#findway-grid');
        if (grid) {
            // Strictly use Click for step-by-step
            grid.addEventListener('click', (e) => this.handleClickCell(e));
        }

        // 4. Bind Reset Button
        const resetBtn = this.container.querySelector('#pw-reset-way');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => this.resetPath());
        }
    }

    // --- Interaction Handlers ---

    handleClickCell(e) {
        const cell = e.target.closest('.fw-cell');
        if (!cell) return;

        this.tryAddPoint(cell);
    }

    // --- Logic ---

    tryAddPoint(cell) {
        const x = parseInt(cell.dataset.x);
        const y = parseInt(cell.dataset.y);

        // Check if point matches any existing point
        const existingIndex = this.internalState.findIndex(p => p[0] === x && p[1] === y);

        if (existingIndex !== -1) {
            // Backtracking: If we click a previous point, cut the path back to that point
            // Exception: If it is the last point, do nothing
            if (existingIndex === this.internalState.length - 1) return;

            this.trimPath(existingIndex + 1);
            return;
        }

        // Check Adjacency (Up/Down/Left/Right + Diagonals)
        const last = this.internalState[this.internalState.length - 1];
        if (!last) return;

        const dx = Math.abs(x - last[0]);
        const dy = Math.abs(y - last[1]);

        // Adjacent including diagonals: dx <= 1 and dy <= 1 (and not same cell)
        // dx=0, dy=0 is handled by the existingIndex check above, but for safety:
        if (dx <= 1 && dy <= 1 && (dx > 0 || dy > 0)) {
            // Valid move
            this.internalState.push([x, y]);
            const stepNum = this.internalState.length - 1;
            this.markCell(x, y, 'fw-path', stepNum);
        } else {
            // Special: Restart if Start is clicked specifically
            const isStart = this.startPos[0] === x && this.startPos[1] === y;
            if (isStart) {
                this.resetPath();
            }
        }
    }

    trimPath(fromIndex) {
        // Unmark cells that are being removed
        for (let i = fromIndex; i < this.internalState.length; i++) {
            const [x, y] = this.internalState[i];
            // Only unmark valid coordinates (sanity check)
            if (x !== undefined && y !== undefined) {
                this.unmarkCell(x, y, 'fw-path');
            }
        }
        // Slice state
        this.internalState = this.internalState.slice(0, fromIndex);
    }

    resetPath() {
        // Clear all path visuals
        this.internalState.forEach(([x, y]) => this.unmarkCell(x, y, 'fw-path'));

        // Reset state to just start
        this.internalState = [this.startPos];

        // Re-mark start
        this.markCell(this.startPos[0], this.startPos[1], 'fw-path', 0);
    }

    // --- Helpers ---

    markCell(x, y, cls, text) {
        const cell = this.container.querySelector(`.fw-cell[data-x="${x}"][data-y="${y}"]`);
        if (cell) {
            cell.classList.add(cls);
            if (text !== undefined && text !== null) {
                cell.innerText = text;
            }
        }
    }

    unmarkCell(x, y, cls) {
        const cell = this.container.querySelector(`.fw-cell[data-x="${x}"][data-y="${y}"]`);
        if (cell) {
            cell.classList.remove(cls);
            cell.innerText = ''; // Clear text
        }
    }

    // --- Base Reqs ---

    handleClick(e, target) {
        return false;
    }

    getValue() {
        return JSON.stringify(this.internalState);
    }
}
