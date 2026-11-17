// Identity switching is runtime state. Scenario source data is never mutated here.
export const FakerSystem = {
    redirectTarget(targetId) {
        const faker = this.api.engine.state.getRuntimeSnapshot('faker') || {};
        return faker.active && targetId === faker.targetId ? (this.api.engine.state.getRuntime('entryCharacter') || 'player') : targetId;
    },

    calculateSyncStat(val, min, max, pMin, pMax) {
        if (max === undefined || min === undefined || pMin === undefined || pMax === undefined) return pMin || 0;
        if (max === min) return pMin;
        const ratio = (val - min) / (max - min);
        const newVal = pMin + ratio * (pMax - pMin);
        return Math.max(pMin, Math.min(pMax, newVal));
    },

    async enterFaker(targetString) {
        const state = this.api.engine.state;
        if (typeof targetString !== 'string') {
            this.api.presentation.notification.add("Lỗi Faker", "Sai định dạng target (mode:id)", "danger");
            return;
        }

        const separator = targetString.indexOf(':');
        const mode = separator >= 0 ? targetString.slice(0, separator) : '';
        const targetId = separator >= 0 ? targetString.slice(separator + 1) : '';
        if (!mode || !targetId || targetId.includes(':')) {
            this.api.presentation.notification.add("Lỗi Faker", "Sai định dạng target (mode:id)", "danger");
            return;
        }
        if (!['soul', 'mask', 'swap'].includes(mode)) {
            this.api.presentation.notification.add("Lỗi Faker", `Mode không hợp lệ: ${mode}`, "danger");
            return;
        }

        // Validate before leaving the current identity. A bad target must never
        // tear down a valid active Faker session.
        const requestedTarget = state.getRuntimeSnapshot('characters.[id]', { id: targetId });
        if (!requestedTarget) {
            this.api.presentation.notification.add("Lỗi Faker", "Mục tiêu không tồn tại", "danger");
            return;
        }

        const activeFaker = state.getRuntimeSnapshot('faker') || {};
        if (activeFaker.active) this.exitFaker();

        // Resolve the body only after the previous mode has restored it.
        const playerId = state.getRuntime('entryCharacter') || 'player';
        const player = state.getRuntimeSnapshot('characters.[id]', { id: playerId });
        const target = state.getRuntimeSnapshot('characters.[id]', { id: targetId });
        if (!player || !target) {
            this.api.presentation.notification.add("Lỗi Faker", "Không thể xác định nhân vật nguồn hoặc mục tiêu", "danger");
            return;
        }

        state.update('faker', current => ({
            ...(current || {}),
            active: true,
            targetId,
            mode,
            backupPlayer: {
                set: JSON.parse(JSON.stringify(player?.set || {})),
                stats: JSON.parse(JSON.stringify(player?.stats || {})),
                characterId: playerId,
                entryCharacter: state.getRuntime('entryCharacter') || 'player'
            }
        }));

        console.log(`[Faker] Enter: ${mode} -> ${targetId}`);
        if (mode === 'swap') {
            state.set('entryCharacter', targetId);
            this.api.presentation.notification.add("Chuyển sinh", `Bạn đã trở thành ${target.set?.name || target.meta?.name}`, "success");
        } else if (mode === 'mask') {
            state.update('characters.[id].set', current => ({
                ...(current || {}),
                name: target.set?.name || target.meta?.name,
                desc: target.set?.desc
            }), { id: playerId });
            this.api.presentation.notification.add("Cải trang", `Bạn đang khoác lên mình ${target.set?.name || target.meta?.name}`, "info");
        } else {
            this._syncStats(playerId, targetId);
            this.api.presentation.notification.add("Đoạt xá", `Đã chiếm lấy cơ thể ${target.set?.name || target.meta?.name}`, "special");
        }

        this.api.presentation.components.closePlayerCard();
        this.api.presentation.components.updatePlayerCard();
        this.syncCharacterMovementIdentity?.();
        if (this.commitState) this.commitState('identity.changed');
    },

    exitFaker() {
        const state = this.api.engine.state;
        const faker = state.getRuntimeSnapshot('faker') || {};
        if (!faker.active || !faker.backupPlayer) return;

        const mode = faker.mode || 'soul';
        const backup = faker.backupPlayer;
        const targetId = faker.targetId;
        const target = state.getRuntimeSnapshot('characters.[id]', { id: targetId });
        const playerId = backup.characterId || backup.entryCharacter || 'player';
        console.log(`[Faker] Exit: ${mode}`);

        if (mode === 'swap') {
            state.set('entryCharacter', backup.entryCharacter || 'player');
            this.api.presentation.notification.add("Hoàn trả", "Trở về nhân vật gốc", "info");
        } else if (mode === 'mask') {
            state.update('characters.[id].set', current => ({
                ...(current || {}),
                name: backup.set?.name,
                desc: backup.set?.desc
            }), { id: playerId });
            this.api.presentation.notification.add("Gỡ bỏ", "Tháo bỏ lớp ngụy trang", "info");
        } else {
            if (target?.stats) this._syncStats(playerId, targetId, true);
            this.api.presentation.notification.add("Thoát xác", "Trở về cơ thể gốc", "info");
        }

        state.update('faker', current => ({
            ...(current || {}),
            active: false,
            targetId: null,
            backupPlayer: null,
            mode: null
        }));

        this.api.presentation.components.closePlayerCard();
        this.api.presentation.components.updatePlayerCard();
        this.syncCharacterMovementIdentity?.();
        if (this.commitState) this.commitState('identity.changed');
    },

    _syncStats(sourceId, targetId, reverse = false) {
        const state = this.api.engine.state;
        state.update('characters', characters => {
            const source = characters?.[sourceId];
            const target = characters?.[targetId];
            const targetLinksStats = target?.set?.linkEffect === true;
            if (!source?.stats || !target?.stats) return characters;

            Object.keys(source.stats).forEach(key => {
                const sourceStat = source.stats[key];
                const targetStat = target.stats[key];
                if (!targetLinksStats || !targetStat) return;
                if (reverse) {
                    sourceStat.current = Math.round(this.calculateSyncStat(
                        targetStat.current, 0, targetStat.max, 0, sourceStat.max
                    ));
                } else {
                    targetStat.current = Math.round(this.calculateSyncStat(
                        sourceStat.current, 0, sourceStat.max, 0, targetStat.max
                    ));
                }
            });
            return characters;
        });
    }
};
