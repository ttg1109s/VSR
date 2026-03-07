// htdocs/engine/modules/entity/Faker.js
import { API } from '../../../api/index.js';

export const FakerSystem = {
    redirectTarget(targetId) {
        if (this.state.faker && this.state.faker.active && targetId === this.state.faker.targetId) {
            return 'player';
        }
        return targetId;
    },

    calculateSyncStat(val, min, max, pMin, pMax) {
        if (max === undefined || min === undefined || pMin === undefined || pMax === undefined) return pMin || 0;
        if (max === min) return pMin;

        const ratio = (val - min) / (max - min);
        const newVal = pMin + ratio * (pMax - pMin);

        return Math.max(pMin, Math.min(pMax, newVal));
    },

    async enterFaker(targetString) {
        // [Lifecycle] Strict: Exit -> Clean -> Enter
        if (this.state.faker && this.state.faker.active) {
            this.exitFaker();
        }

        // Parse Target: "mode:targetId"
        const parts = targetString.split(':');
        const mode = parts[0];
        const targetId = parts[1];

        if (!mode || !targetId) {
            API.render.notification.add("Lỗi Faker", "Sai định dạng target (mode:id)", "error");
            return;
        }

        const validModes = ['soul', 'mask', 'swap'];
        if (!validModes.includes(mode)) {
            API.render.notification.add("Lỗi Faker", `Mode không hợp lệ: ${mode}`, "error");
            return;
        }

        const player = this.state.characters.player;
        const target = this.state.characters[targetId];

        if (!target) {
            API.render.notification.add("Lỗi Faker", "Mục tiêu không tồn tại", "error");
            return;
        }

        // --- SETUP ---
        if (!this.state.faker) this.state.faker = {};
        this.state.faker.active = true;
        this.state.faker.targetId = targetId;
        this.state.faker.mode = mode; // Save mode for exit logic

        // Backup Player Data
        this.state.faker.backupPlayer = {
            set: JSON.parse(JSON.stringify(player.set || {})),
            stats: JSON.parse(JSON.stringify(player.stats || {})),
            entryCharacter: this.state.meta.entryCharacter
        };

        console.log(`[Faker] Enter: ${mode} -> ${targetId}`);

        if (mode === 'swap') {
            // --- SWAP MODE ---
            this.state.meta.entryCharacter = targetId;
            API.render.notification.add("Chuyển sinh", `Bạn đã trở thành ${target.set.name}`, "success");

        } else if (mode === 'mask') {
            // --- MASK MODE ---
            player.set.name = target.set.name;
            player.set.desc = target.set.desc;
            player.set.relationship = target.set.relationship;
            API.render.notification.add("Cải trang", `Bạn đang khoác lên mình ${target.set.name}`, "info");

        } else {
            // --- SOUL MODE (Default) ---
            if (player.stats && target.stats) {
                this._syncStats(player, target);
            }
            API.render.notification.add("Đoạt xá", `Đã chiếm lấy cơ thể ${target.set.name}`, "magic");
        }

        API.render.components.closePlayerCard();
        API.render.components.updatePlayerCard();
        if (this.render) this.render();
    },

    exitFaker() {
        if (!this.state.faker || !this.state.faker.active || !this.state.faker.backupPlayer) return;

        const mode = this.state.faker.mode || 'soul';
        const backup = this.state.faker.backupPlayer;
        const player = this.state.characters.player;
        const targetId = this.state.faker.targetId;
        const target = this.state.characters[targetId];

        console.log(`[Faker] Exit: ${mode}`);

        if (mode === 'swap') {
            // --- REVERT SWAP ---
            this.state.meta.entryCharacter = backup.entryCharacter || 'player';
            API.render.notification.add("Hoàn trả", "Trở về nhân vật gốc", "info");

        } else if (mode === 'mask') {
            // --- REVERT MASK ---
            player.set.name = backup.set.name;
            player.set.desc = backup.set.desc;
            player.set.relationship = backup.set.relationship;
            API.render.notification.add("Gỡ bỏ", "Tháo bỏ lớp ngụy trang", "info");

        } else {
            // --- REVERT SOUL ---
            if (player.stats && target && target.stats) {
                this._syncStats(player, target, true); // Reverse
            }
            API.render.notification.add("Thoát xác", "Trở về cơ thể gốc", "info");
        }

        // Reset State
        this.state.faker.active = false;
        this.state.faker.targetId = null;
        this.state.faker.backupPlayer = null;
        this.state.faker.mode = null;

        API.render.components.closePlayerCard();
        API.render.components.updatePlayerCard();

        if (targetId && this.scheduleCharacterMove) {
            this.scheduleCharacterMove(targetId);
        }

        if (this.render) this.render();
    },

    _syncStats(source, target, reverse = false) {
        const npcLink = target.set && target.set.linkEffect === true;

        if (!source.stats || !target.stats) return;

        Object.keys(source.stats).forEach(key => {
            const sStat = source.stats[key];
            const tStat = target.stats[key];

            if (npcLink && tStat) {
                if (reverse) {
                    // Reverse: NPC (Target) -> Player (Source)
                    const newVal = this.calculateSyncStat(
                        tStat.current,
                        0, tStat.max,
                        0, sStat.max
                    );
                    sStat.current = Math.round(newVal);
                } else {
                    // Forward: Player (Source) -> NPC (Target)
                    const newVal = this.calculateSyncStat(
                        sStat.current,
                        0, sStat.max,
                        0, tStat.max
                    );
                    tStat.current = Math.round(newVal);
                }
            }
        });
    }
};
