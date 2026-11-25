export const ConfigSystem = {
    defaultConfig: {
        fakerMode: "soul",
        minTransition: 2,
        minAutomationNextStep: 2,
        maxCharacterMoving: 10,
        maxInventory: [],
        maxHandOn: 10,
        brokenDisable: false,
        minCharacterMoving: 30,
        stopEffectWhenChat: false,
        navContact: true,
        navInventory: true,
        defaultNotice: true
    },

    getConfig(key) {
        if (typeof key !== 'string' || !key) return undefined;
        const mapped = this.api?.engine?.state?.get(key);
        if (mapped !== undefined) return mapped;
        const configured = this.api?.engine?.state?.getFrom('runtime', 'config.[key]', { key });
        return configured !== undefined ? configured : this.defaultConfig[key];
    },

    setConfig(key, value) {
        if (typeof key !== 'string' || !key || key.includes('.')) {
            throw new TypeError('Config key must be a non-empty string without dots.');
        }
        this.api.engine.state.set('config.[key]', value, { key });
    }
};
