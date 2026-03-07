import { PasswordStrategy } from './Base.js';

export class SwitchStrategy extends PasswordStrategy {
    constructor(system) {
        super(system);
    }

    show(actionDef, uniqueId, passDef) {
        // Switch password type
        // Value: e.g. "0123" (str)
        // User expects N switches.
        const valStr = passDef.value ? String(passDef.value) : "0000";

        // Pass data to UI
        super.show(actionDef, uniqueId, {
            ...passDef,
            type: 'switch', // This tells UI to load SwitchStrategy (UI side)
            length: valStr.length,
            value: valStr
        });
    }
}
