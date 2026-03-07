import { API } from '../../api/index.js';

export const ConfigSystem = {
    defaultConfig: {
        fakerMode: "soul",
        minTransition: 2,
        minAutomationNextStep: 2,
        maxCharacterMoving: 10,
        maxInventory: [], // Schema: [[limit, char_id]] or just simple limit logic
        maxHandOn: 10,
        brokenDisable: false,
        minCharacterMoving: 30,
        stopEffectWhenChat: false,
        navContact: true,
        navInventory: true,
        defaultNotice: true
    },

    getConfig(key) {
        // [FIXED] Try to get via API first (using Schema)
        // This ensures if there is a mapped key (e.g. 'fakerMode'), it is retrieved correctly via state manager
        const apiVal = API.engine.state.get(key);
        if (apiVal !== undefined) {
            return apiVal;
        }

        // Fallback to direct state config or default
        if (this.state && this.state.config && this.state.config[key] !== undefined) {
            return this.state.config[key];
        }
        return this.defaultConfig[key];
    },

    setConfig(key, value) {
        if (!this.state.config) {
            this.state.config = {};
        }
        this.state.config[key] = value;
    }
};