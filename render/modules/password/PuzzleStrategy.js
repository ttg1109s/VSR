import { BaseStrategy } from './BaseStrategy.js';
import { PuzzleTemplate } from '../../../components/PasswordUI.js';

export class PuzzleStrategy extends BaseStrategy {
    init() {
        this._calculateGrid();
        if (this.config.tiles && this.config.tiles.length > 0) {
            this.internalState = JSON.parse(JSON.stringify(this.config.tiles));
        } else {
            this.internalState = this._generateTiles();
        }
    }

    _calculateGrid() {
        // Defaults
        const level = this.config.level || 'easy';

        console.log("[PuzzleStrategy] Init Config:", this.config);

        let ratio = this.config.ratio;
        // Robustness: Handle "3:4" string input or [3,4] array
        if (typeof ratio === 'string' && ratio.includes(':')) {
            ratio = ratio.split(':').map(Number);
        }

        // Ratio is now [w, h] array. Default to [1,1] if not present or invalid.
        if (!Array.isArray(ratio) || ratio.length !== 2) {
            console.warn("[PuzzleStrategy] Invalid/Missing ratio, defaulting to [1,1]. Input:", this.config.ratio);
            ratio = [1, 1];
        }
        const [rW, rH] = ratio;

        // Define base tile counts (total tiles approx)
        const levelMap = {
            "easy": 9,      // ~3x3
            "medium": 16,   // ~4x4
            "hard": 25,     // ~5x5
            "very hard": 36,// ~6x6
            "god": 64       // ~8x8
        };

        const targetTiles = levelMap[level] || 9;

        // Calculate rows/cols to roughly match targetTiles while respecting aspect ratio
        let r = Math.sqrt(targetTiles * rH / rW);
        let c = r * (rW / rH);

        // Round to nearest integer
        this.config.rows = Math.max(2, Math.round(r));
        this.config.cols = Math.max(2, Math.round(c));

        console.log(`[PuzzleStrategy] Calculated Grid: ${this.config.rows}x${this.config.cols} for Level: ${level}, Ratio: ${rW}:${rH}`);
    }

    getHTML() {
        // Convert array to string format expected by UI for Aspect Ratio class
        let ratioArr = this.config.ratio;

        // Ensure ratioArr is valid array for display logic
        if (typeof ratioArr === 'string' && ratioArr.includes(':')) {
            ratioArr = ratioArr.split(':').map(Number);
        }
        if (!Array.isArray(ratioArr) || ratioArr.length !== 2) {
            ratioArr = [1, 1];
        }

        const ratioStr = `${ratioArr[0]}:${ratioArr[1]}`;

        return PuzzleTemplate({
            ...this.config,
            ratio: ratioStr
        });
    }

    postRender() {
        const container = document.getElementById('puzzle-grid');
        const loader = document.getElementById('puzzle-loading');
        const statusText = document.getElementById('loading-status');

        if (container && this.config.imageUrl) {
            // 1. Start Loading
            if (statusText) statusText.innerText = "Downloading Assets...";

            const img = new Image();
            img.src = this.config.imageUrl;

            img.onload = () => {
                // 2. Logic Verification Simulation
                if (statusText) statusText.innerText = "Verifying Integrity...";

                // Short delay to show the "Verification" step (UX)
                setTimeout(() => {
                    this._renderPuzzleTiles();

                    // 3. Reveal
                    if (statusText) statusText.innerText = "Ready.";
                    if (loader) {
                        loader.style.opacity = '0';
                        setTimeout(() => loader.remove(), 500);
                    }
                }, 800);
            };

            img.onerror = () => {
                if (statusText) {
                    statusText.innerText = "Connection Failed.";
                    statusText.classList.add('text-red-500');
                }
                console.error("Failed to load puzzle image:", this.config.imageUrl);

                // Fallback to numbers after error
                setTimeout(() => {
                    this._renderPuzzleTiles();
                    if (loader) {
                        loader.style.opacity = '0';
                        setTimeout(() => loader.remove(), 500);
                    }
                }, 1500);
            };
        } else {
            // No image, just render
            if (loader) loader.remove();
            this._renderPuzzleTiles();
        }
    }

    _generateTiles() {
        const rows = this.config.rows;
        const cols = this.config.cols;
        let tiles = [];

        // 1. Create Solved State
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                // [MOD] Enforce Empty at 0,0 (Top-Left)
                tiles.push({
                    id: `${r}-${c}`,
                    correctR: r,
                    correctC: c,
                    currentR: r,
                    currentC: c,
                    isEmpty: (r === 0 && c === 0)
                });
            }
        }

        // 2. Shuffle by simulating moves (maintains solvability)
        const moves = rows * cols * 5; // Enough random moves
        let emptyInfo = tiles.find(t => t.isEmpty);
        let currentR = emptyInfo.currentR;
        let currentC = emptyInfo.currentC;

        for (let i = 0; i < moves; i++) {
            const neighbors = [];
            if (currentR > 0) neighbors.push({ r: currentR - 1, c: currentC });
            if (currentR < rows - 1) neighbors.push({ r: currentR + 1, c: currentC });
            if (currentC > 0) neighbors.push({ r: currentR, c: currentC - 1 });
            if (currentC < cols - 1) neighbors.push({ r: currentR, c: currentC + 1 });

            // Pick random neighbor
            const move = neighbors[Math.floor(Math.random() * neighbors.length)];

            // Swap
            const pipeTile = tiles.find(t => t.currentR === move.r && t.currentC === move.c);

            // Swap coords
            pipeTile.currentR = currentR;
            pipeTile.currentC = currentC;

            emptyInfo.currentR = move.r;
            emptyInfo.currentC = move.c;

            currentR = move.r;
            currentC = move.c;
        }

        return tiles;
    }

    handleClick(e, target) {
        const puzzleTile = target.closest('.puzzle-tile');
        if (puzzleTile) {
            this._handlePuzzleClick(target);
            return true;
        }
        return false;
    }

    _handlePuzzleClick(target) {
        const tileDiv = target.closest('.puzzle-tile');
        if (!tileDiv) return;

        const tileId = tileDiv.dataset.id;
        const clickedTile = this.internalState.find(t => t.id === tileId);

        if (!clickedTile || clickedTile.isEmpty) return;

        const emptyTile = this.internalState.find(t => t.isEmpty);
        if (!emptyTile) return;

        const dr = Math.abs(clickedTile.currentR - emptyTile.currentR);
        const dc = Math.abs(clickedTile.currentC - emptyTile.currentC);

        if (dr + dc === 1) {
            const tempR = clickedTile.currentR; const tempC = clickedTile.currentC;
            clickedTile.currentR = emptyTile.currentR; clickedTile.currentC = emptyTile.currentC;
            emptyTile.currentR = tempR; emptyTile.currentC = tempC;

            this._renderPuzzleTiles();
        }
    }

    _renderPuzzleTiles() {
        const data = this.config;
        const container = document.getElementById('puzzle-grid');
        if (!container) return;

        // Use percentage based sizing for perfect responsiveness
        const cellW = 100 / data.cols;
        const cellH = 100 / data.rows;

        this.internalState.forEach(tile => {
            if (tile.isEmpty) {
                console.log(`[Puzzle Render] EMPTY TILE FOUND at Correct: [${tile.correctR}, ${tile.correctC}] Current: [${tile.currentR}, ${tile.currentC}]`);
                return;
            }

            let div = document.getElementById(`puz-tile-${tile.id}`);

            if (!div) {
                div = document.createElement('div');
                div.id = `puz-tile-${tile.id}`;
                div.className = "puzzle-tile absolute transition-all duration-300 ease-in-out cursor-pointer shadow-[inset_0_0_0_1px_rgba(255,255,255,0.1)] hover:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.5)] z-10 box-border block";
                div.dataset.id = tile.id;

                // IMPORTANT: Use exact percentages, but subtract a tiny slice to avoid sub-pixel overlapping glitches if needed.
                // However, box-border and inset shadows are cleaner.
                div.style.width = `${cellW}%`;
                div.style.height = `${cellH}%`;

                if (data.imageUrl) {
                    // Center Crop Technique:
                    // Use an inner div that acts as the "Full Image" behind the "Window" (Tile)
                    // The inner div creates a context essentially size of the FULL puzzle, and we 'background-size: cover' it.
                    // This creates a perfect consistent crop across all tiles.
                    const inner = document.createElement('div');
                    inner.style.position = 'absolute';
                    inner.style.width = `${data.cols * 100}%`;
                    inner.style.height = `${data.rows * 100}%`;
                    inner.style.left = `-${tile.correctC * 100}%`;
                    inner.style.top = `-${tile.correctR * 100}%`;
                    inner.style.backgroundImage = `url('${data.imageUrl}')`;
                    inner.style.backgroundSize = 'cover';
                    inner.style.backgroundPosition = 'center';
                    inner.style.pointerEvents = 'none'; // Click passes through to tile

                    div.appendChild(inner);

                    // Ensure parent clips the overflow
                    div.style.overflow = 'hidden';

                } else {
                    div.className += " flex items-center justify-center text-white font-mono text-xl bg-[#333]";
                    div.innerText = `${tile.correctR},${tile.correctC}`;
                }

                container.appendChild(div);
            }

            div.style.left = `${tile.currentC * cellW}%`;
            div.style.top = `${tile.currentR * cellH}%`;
        });
    }

    getValue() {
        // ... (unchanged)
        const isSolved = this.internalState.every(t => t.currentR === t.correctR && t.currentC === t.correctC);
        return isSolved ? (this.config.value || "solved") : "unsolved";
    }
}
