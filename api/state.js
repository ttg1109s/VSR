/**
 * @file api/state.js
 * @class State
 * @description Quản lý truy xuất dữ liệu Global State thông qua Schema Mapping.
 * Giúp tách biệt Logic UI khỏi cấu trúc dữ liệu JSON thô.
 */

// Bảng ánh xạ 1:1 từ Key (Schema) -> Path (JSON Structure)
// Được convert chính xác từ file cau_truc_schema.txt
const SCHEMA_MAP = {
    // --- CONFIG & META ---
    'ageRating': 'meta.ageRating',
    'blurhash': 'meta.cover.blurhash',
    'brokenDisable': 'config.maxInventory.brokenDisable',
    'copyright': 'meta.copyright',
    'cover': 'meta.cover.url', // Note: key 'cover' map vào url
    'createdAt': 'meta.createdAt',
    'defaultNotice': 'config.defaultNotice',
    'desc': 'meta.desc', // Lưu ý: có nhiều key 'desc', logic get sẽ ưu tiên context hoặc key cụ thể
    'difficulty': 'meta.difficulty',
    'entryCharacter': 'meta.entryCharacter',
    'entryScene': 'meta.entryScene',
    'estimatedPlayTime': 'meta.estimatedPlayTime',
    'fakerMode': 'config.fakerMode',
    'language': 'meta.language',
    'license': 'meta.license',
    'maxCharacterMoving': 'config.maxCharacterMoving',
    'maxHandOn': 'config.maxInventory.maxHandOn',

    // [VÍ DỤ IDX] Truy cập phần tử cụ thể trong mảng đa chiều hoặc mảng đơn
    'maxInventory': 'config.maxInventory',

    'minAutomationNextStep': 'config.minAutomationNextStep',
    'minCharacterMoving': 'config.maxInventory.minCharacterMoving',
    'minTransition': 'config.minTransition',
    'navContact': 'config.navContact',
    'navInventory': 'config.navInventory',
    'notes': 'meta.notes',
    'ratio': 'meta.cover.ratio',
    'stopEffectWhenChat': 'config.stopEffectWhenChat',
    'studio': 'meta.studio',
    'subtitle': 'meta.subtitle',

    // [VÍ DỤ IDX] Lấy tag thứ [idx]. VD: get('tags', { idx: 0 }) -> lấy tag đầu tiên
    'tags': 'meta.tags.[idx]',

    'title': 'meta.title',
    'updatedAt': 'meta.updatedAt',
    'version': 'meta.version',
    'writer': 'meta.writer',

    // --- GLOBAL STATES ---
    'globalState.type': 'globalStates.[id].type',
    'globalState.value': 'globalStates.[id].value',

    // --- AUTOMATION (RUNTIME) ---
    // [FIX] Sửa path từ 'templates' (tĩnh) sang 'automations' (động - runtime state)
    // Để lấy đúng trạng thái thực tế khi game đang chạy
    'automation.active': 'automations.[id].active',
    'automation.banClick': 'automations.[id].banClick',
    'automation.countCurrent': 'automations.[id].countCurrent',
    'automation.move': 'automations.[id].move',
    'automation.moveDirection': 'automations.[id].moveDirection',
    'automation.numberCycleAllow': 'automations.[id].numberCycleAllow',
    'automation.runInfinity': 'automations.[id].runInfinity',
    'automation.stepIndex': 'automations.[id].stepIndex', // Bước hiện tại đang chạy

    // --- ITEM INFO ---
    'item.stats': 'itemInfo.[id].stats',
    'item.stat.current': 'itemInfo.[id].stats.[statId].current',
    'item.stat.max': 'itemInfo.[id].stats.[statId].max',
    'item.stat.label': 'itemInfo.[id].stats.[statId].label',
    'item.stat.color': 'itemInfo.[id].stats.[statId].color',

    // Short alias
    'item.color': 'itemInfo.[id].stats.[statId].color',
    'item.label': 'itemInfo.[id].stats.[statId].label',

    'item.current': 'itemInfo.[id].usage.current', // Ưu tiên Usage cho Item
    'item.max': 'itemInfo.[id].usage.max',
    'item.desc': 'itemInfo.[id].desc',
    'item.icon': 'itemInfo.[id].icon',
    'item.name': 'itemInfo.[id].name',

    // --- SCENES & ROUTERS ---
    'scene.activeRouterId': 'scenes.[id].set.activeRouterId',
    'scene.blocked': 'scenes.[id].set.blocked',
    'scene.title': 'scenes.[id].meta.title', // hoặc scenes.[id].title (legacy)
    'scene.desc': 'scenes.[id].meta.desc',
    'scene.cover': 'scenes.[id].meta.cover.url',
    'scene.music': 'scenes.[id].meta.music.url',
    'scene.ambience': 'scenes.[id].meta.ambience.url',
    'scene.transition': 'scenes.[id].set.transition',
    'scene.parent': 'scenes.[id].meta.parentScene',

    'router.actions': 'scenes.[sceneId].routers.[routerId].actions',
    'router.blocked': 'scenes.[sceneId].routers.[routerId].set.blocked',
    'router.countVisited': 'scenes.[sceneId].routers.[routerId].set.countVisited',
    'router.cover': 'scenes.[sceneId].routers.[routerId].meta.cover',
    'router.desc': 'scenes.[sceneId].routers.[routerId].meta.desc',
    'router.overlay': 'scenes.[sceneId].routers.[routerId].set.overlay',
    'router.sceneID': 'scenes.[sceneId].routers.[routerId].meta.sceneID',
    'router.timer': 'scenes.[sceneId].routers.[routerId].set.timer',
    'router.visited': 'scenes.[sceneId].routers.[routerId].set.visited',

    // --- ACTIONS ---
    'action.buttonIcon': 'actions.[id].meta.buttonIcon',
    'action.buttonLabel': 'actions.[id].meta.buttonLabel',
    'action.cooldown': 'actions.[id].set.cooldown',
    'action.countClicks': 'actions.[id].set.countClicks',
    'action.countFails': 'actions.[id].set.countFails',
    'action.desc': 'actions.[id].meta.desc',
    'action.display': 'actions.[id].set.display',
    'action.password': 'actions.[id].set.password',
    'action.requirement': 'actions.[id].set.requirement',
    'action.thumb': 'actions.[id].meta.thumb',
    'action.title': 'actions.[id].meta.title',
    'action.type': 'actions.[id].set.type',
    'action.target': 'actions.[id].set.target',

    // --- CHAT ---
    'chat.sender': 'chat.[id].meta.sender',
    'chat.entry': 'chat.[id].meta.entry',
    'chat.loop': 'chat.[id].meta.loop',
    'chat.title': 'chat.[id].meta.title',
    'chat.to': 'chat.[id].meta.to', // New field
    'chat.bookmark': 'chats.[id].bookmark',
    // [VÍ DỤ IDX] idx ở đây là số thứ tự dòng chat trong block
    'chat.block.text': 'chat.[chatId].block.[blockId].line.[idx].text',
    // [VÍ DỤ IDX] idx ở đây là số thứ tự lựa chọn (choice 0, choice 1...)
    'chat.choice.text': 'chat.[chatId].choice.[choiceId].[idx].text',

    'chat.data': 'chats.[id]',
    'chat.history': 'chatHistory.[id]',

    // --- CHARACTERS ---
    'char.avatar': 'characters.[id].meta.avatar',
    'char.desc': 'characters.[id].meta.desc',
    'char.name': 'characters.[id].meta.name',
    'char.inventory': 'characters.[id].inventory',
    'char.stats': 'characters.[id].stats',
    'char.stat.current': 'characters.[id].stats.[statId].current',
    'char.stat.max': 'characters.[id].stats.[statId].max',
    'char.stat.label': 'characters.[id].stats.[statId].label',
    'char.stat.color': 'characters.[id].stats.[statId].color',

    // Alias tiện dụng ([id] thay vì [charId] để đồng bộ)
    'char.current': 'characters.[id].stats.[statId].current',
    'char.max': 'characters.[id].stats.[statId].max',

    'char.scene_id': 'characters.[id].place.scene_id',
    'char.currentIndex': 'characters.[id].place.currentIndex',
    'char.alert': 'characters.[id].set.alert',
    'char.moving': 'characters.[id].set.moving',

    // --- PASSWORDS ---
    'pass.number.value': 'passwords.number.[id].value',
    'pass.string.value': 'passwords.string.[id].value',

    // --- ENDINGS ---
    'ending.title': 'endings.[id].title',
    'ending.desc': 'endings.[id].desc',
};

export default class State {

    /**
     * @method get
     * @static
     * @description Lấy dữ liệu từ Global State dựa trên Schema Key.
     * * @param {string} key - Key đại diện trong Schema (ví dụ: 'action.title') HOẶC đường dẫn trực tiếp.
     * @param {Object} [context] - Dữ liệu điền vào placeholder (ví dụ: { id: 'act_1', idx: 0 }).
     * @returns {*} Giá trị tìm được hoặc undefined.
     * * @example
     * // Lấy title của Action có ID là 'act_01'
     * API.engine.state.get('action.title', { id: 'act_01' });
     * * // Lấy tag thứ 2 (index 1) của kịch bản
     * API.engine.state.get('tags', { idx: 1 });
     */
    static get(key, context = {}) {
        const globalState = window.engine?.state;
        if (!globalState) {
            console.warn("[State] Engine state chưa khởi tạo.");
            return undefined;
        }

        // 1. Tìm Path trong Schema Map
        let path = SCHEMA_MAP[key];

        // 2. Nếu không có trong Map, coi key chính là path (Fallback cho các path tự do)
        if (!path) {
            // console.debug(`[State] Key "${key}" không có trong Schema Map, dùng trực tiếp.`);
            path = key;
        }

        // 3. Resolve Path với Context
        return this._resolve(globalState, path, context);
    }

    /**
     * @method _resolve
     * @private
     * @description Phân giải đường dẫn chứa placeholder [var].
     */
    static _resolve(state, path, context) {
        if (!path) return undefined;

        // Tách chuỗi: "actions.[id].meta.title" -> ["actions", "[id]", "meta", "title"]
        const segments = path.split('.');
        let current = state;

        for (const seg of segments) {
            if (current === undefined || current === null) return undefined;

            // Kiểm tra xem segment có phải là placeholder dạng [xxx] không
            if (seg.startsWith('[') && seg.endsWith(']')) {
                // Lấy tên biến: "[id]" -> "id"
                const varName = seg.slice(1, -1);

                // Lấy giá trị thực từ context
                const contextValue = context[varName];

                if (contextValue === undefined) {
                    console.warn(`[State] Thiếu context "${varName}" để resolve path: "${path}"`);
                    return undefined;
                }

                current = current[contextValue];
            } else {
                // Property bình thường
                current = current[seg];
            }
        }

        return current;
    }
}