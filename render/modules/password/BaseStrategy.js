/**
 * BaseStrategy.js
 * Abstract base class for all password strategies.
 */
export class BaseStrategy {
    constructor(container, config) {
        this.container = container;
        this.config = config;
        this.internalState = null;
    }

    /**
     * Initializes the internal state based on config.
     */
    init() {
        // Override in subclass
    }

    /**
     * Returns the HTML string to be rendered.
     */
    getHTML() {
        return `<div class="text-white">BaseStrategy HTML</div>`;
    }

    /**
     * Called after HTML is injected into the DOM.
     * Use for setting up focus, specific event listeners if absolutely necessary (stateful libs), etc.
     */
    postRender() {
        // Override in subclass
    }

    /**
     * Handles delegated click events from the main controller.
     * @param {Event} e 
     * @param {HTMLElement} target 
     */
    handleClick(e, target) {
        // Override in subclass
    }

    /**
     * Handles delegated input events.
     * @param {Event} e 
     * @param {HTMLElement} target 
     */
    handleInput(e, target) {
        // Override in subclass
    }

    /**
     * Handles delegated keydown events.
     * @param {Event} e 
     * @param {HTMLElement} target 
     */
    handleKeydown(e, target) {
        // Override in subclass
    }

    /**
     * Returns the current value of the password input to be verified.
     */
    getValue() {
        return this.internalState;
    }
}
