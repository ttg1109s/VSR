import { PasswordStrategy } from './Base.js';

export class NumberStrategy extends PasswordStrategy {
    constructor(system) {
        super(system);
    }

    show(actionDef, uniqueId, passDef) {
        // [CRITICAL] Lấy display mode từ schema.
        // Schema V9.2: properties: { display: { enum: ["keyboard", "mechanica", "combination", "rotary_dial"] } }
        const displayMode = passDef.display || 'keyboard';

        console.log(`[NumberStrategy] Mode: ${displayMode}`);

        let extraData = {};

        if (displayMode === 'combination') {
            // Combination cần chuỗi số initial
            const valStr = passDef.value ? String(passDef.value) : "0000";
            extraData.length = valStr.length;
            extraData.initial = "0".repeat(valStr.length);
        }
        else if (displayMode === 'mechanica') {
            // Mechanica cần mảng binary
            const valStr = passDef.value ? String(passDef.value) : "00000";
            extraData.length = valStr.length;
        }
        else if (displayMode === 'rotary_dial') {
            extraData.length = 12; // Limit độ dài
        }
        else {
            // Keyboard (Default)
            const valStr = passDef.value ? String(passDef.value) : "0000";
            extraData.length = valStr.length;
        }

        // Gọi UI Render với type là 'number' và kèm displayMode
        super.show(actionDef, uniqueId, {
            ...passDef,
            type: 'number',
            displayMode: displayMode,
            ...extraData
        });
    }
}