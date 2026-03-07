import { PasswordStrategy } from './Base.js';

export class PuzzleStrategy extends PasswordStrategy {
    constructor(system) {
        super(system);
        this.rows = 3;
        this.cols = 3;
        this.tiles = [];
        this.imageUrl = null;
        this.emptyTile = null; // Track the empty tile {r, c}
    }

    show(actionDef, uniqueId, passDef) {

        // Calculate Grid Config (Mirroring Render Logic)
        const level = passDef.level || 'easy';
        let ratio = passDef.ratio;

        // Handle ratio format
        if (typeof ratio === 'string' && ratio.includes(':')) {
            ratio = ratio.split(':').map(Number);
        }
        if (!Array.isArray(ratio) || ratio.length !== 2) {
            ratio = [1, 1];
        }
        const [rW, rH] = ratio;

        const levelMap = {
            "easy": 9,      // ~3x3
            "medium": 16,   // ~4x4
            "hard": 25,     // ~5x5
            "very hard": 36,// ~6x6
            "god": 64       // ~8x8
        };
        const targetTiles = levelMap[level] || 9;

        // Calculate rows/cols
        let r = Math.sqrt(targetTiles * rH / rW);
        let c = r * (rW / rH);

        this.rows = Math.max(2, Math.round(r));
        this.cols = Math.max(2, Math.round(c));

        this.imageUrl = passDef?.url;

        // Reset tiles
        this.initTiles();

        // Shuffle ONLY if it's a new session or forced. 
        // For now, always shuffle on show as per previous behavior, 
        // but using "Solvable Shuffle".
        this.shuffleTiles();

        // Pass full data to Render
        super.show(actionDef, uniqueId, {
            ...passDef,
            type: 'puzzle',
            tiles: this.tiles,
            rows: this.rows,
            cols: this.cols,
            imageUrl: this.imageUrl,
            title: passDef?.title || "SECURITY PUZZLE",
            desc: passDef?.desc || "Slide tiles to reconstruct the image.",
            value: "solved" // Default correct token for puzzle
        });
    }

    // checkVerify removed - Base/Render handles "solved" string check.

    initTiles() {
        this.tiles = [];
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                // [MOD] Empty tile is now at 0,0 (Top-Left)
                const isEmpty = (r === 0) && (c === 0);
                const tile = {
                    id: isEmpty ? 'empty' : `tile_${r}_${c}`,
                    correctR: r,
                    correctC: c,
                    currentR: r,
                    currentC: c,
                    isEmpty: isEmpty
                };
                this.tiles.push(tile);
                if (isEmpty) this.emptyTile = tile;
            }
        }
    }

    shuffleTiles() {
        // "Reverse Walk" Shuffle to ensure solvability
        // Perform N random VALID moves from the solved state.
        const moves = 100; // Sufficient randomness
        let lastMove = null; // Prevent undoing immediately

        for (let i = 0; i < moves; i++) {
            const validNeighbors = this.getValidNeighbors(this.emptyTile);

            // Filter out 'lastMove' to avoid simple back-and-forth toggling
            let candidates = validNeighbors;
            if (validNeighbors.length > 1 && lastMove) {
                candidates = validNeighbors.filter(t => t.id !== lastMove.id);
            }

            // Pick random neighbor
            const target = candidates[Math.floor(Math.random() * candidates.length)];

            // Swap logic (Slide)
            this.swap(this.emptyTile, target);
            lastMove = target; // target was the tile that moved into empty slot
        }
    }

    getValidNeighbors(emptyTile) {
        const { currentR, currentC } = emptyTile;
        const neighbors = [];

        // Find tiles adjacent to empty slot (Up, Down, Left, Right)
        this.tiles.forEach(tile => {
            if (tile.isEmpty) return;
            const dr = Math.abs(tile.currentR - currentR);
            const dc = Math.abs(tile.currentC - currentC);
            if (dr + dc === 1) {
                neighbors.push(tile);
            }
        });
        return neighbors;
    }

    swap(t1, t2) {
        // Swap positions
        const tempR = t1.currentR; const tempC = t1.currentC;
        t1.currentR = t2.currentR; t1.currentC = t2.currentC;
        t2.currentR = tempR; t2.currentC = tempC;
    }
}