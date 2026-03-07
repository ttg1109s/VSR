/**
 * @class Mouse
 * @description Handles mouse interactions, drag & drop, and animations using Vanilla JS.
 * Replaces the original jQuery-based implementation.
 */
export default class Mouse {
    constructor() {
        this.isDragging = false;
        this.dragTarget = null;
        this.offset = { x: 0, y: 0 };
        this.originalOffset = null;
        this.map = {};
        this.eventHandlers = []; // Stores attached events for cleanup
        this.appShow = false;
        this.appShowing = false;
        this.appShowHeight = 0;
        this.window = {
            'land-details': true,
            'weather': true,
        };

        // Custom config for drag boundaries
        this.dragConfig = {
            leftBoundary: 1.5,
            rightBoundary: 2.5,
            topBoundary: 1.2,
            bottomBoundary: 2.5
        };

        // State management for elements (replaces jQuery .data)
        this.elementStates = new WeakMap();

        // Bind methods to ensure 'this' context
        this._handleMouseDown = this._handleMouseDown.bind(this);
        this._handleMouseMove = this._handleMouseMove.bind(this);
        this._handleMouseUp = this._handleMouseUp.bind(this);
    }

    /**
     * Sets the current event type (e.g., 'click', 'mousedown').
     * @param {string} event 
     * @returns {Mouse}
     */
    hand(event) {
        this.currentEvent = event;
        return this;
    }

    /**
     * Sets the target selector for the event.
     * @param {string} selector 
     * @returns {Mouse}
     */
    where(selector) {
        if (!this.map) {
            this.map = {};
        }
        this.map[selector] = selector;
        this.currentSelector = selector;
        return this;
    }

    /**
     * Attaches an action to the current event and selector.
     * @param {Function|string} action 
     * @returns {Mouse}
     */
    do(action) {
        if (!this.currentSelector) {
            console.warn('Selector must be defined before attaching an action.');
            return this;
        }

        const handlerWrapper = (e) => {
            const target = e.target.closest(this.currentSelector);
            if (target) {
                if (typeof action === 'function') {
                    action.call(this, e, target);
                } else if (typeof action === 'string' && typeof this[action] === 'function') {
                    this[action].call(this, e, target);
                }
            }
        };

        // Store for cleanup
        this.eventHandlers.push({
            event: this.currentEvent,
            selector: this.currentSelector,
            handler: handlerWrapper
        });

        document.addEventListener(this.currentEvent, handlerWrapper);

        return this;
    }

    /**
     * Removes all attached event listeners.
     */
    destroy() {
        for (const record of this.eventHandlers) {
            document.removeEventListener(record.event, record.handler);
        }
        this.eventHandlers = [];
        console.log('All mouse events destroyed.');
    }

    /**
     * Helper to retrieve element state.
     * @param {HTMLElement} element 
     */
    _getState(element) {
        if (!this.elementStates.has(element)) {
            this.elementStates.set(element, {});
        }
        return this.elementStates.get(element);
    }

    /**
     * Enables or disables drag functionality.
     * @param {boolean} enable 
     * @param {Function} dragCallback 
     * @param {Object} config 
     * @returns {Mouse}
     */
    drag(enable, dragCallback = null, config = { leftBoundary: 1.5, rightBoundary: 2.5, topBoundary: 1.2, bottomBoundary: 2.5 }) {
        if (!this.currentSelector) {
            console.warn('Selector must be defined before enabling drag.');
            return this;
        }

        this.dragConfig = { ...this.dragConfig, ...config };
        this.dragCallback = dragCallback;

        if (enable) {
            document.addEventListener('mousedown', this._handleMouseDown);
            document.addEventListener('mousemove', this._handleMouseMove);
            document.addEventListener('mouseup', this._handleMouseUp);
        } else {
            document.removeEventListener('mousedown', this._handleMouseDown);
            document.removeEventListener('mousemove', this._handleMouseMove);
            document.removeEventListener('mouseup', this._handleMouseUp);
        }

        return this;
    }

    _handleMouseDown(e) {
        const target = e.target.closest(this.currentSelector);
        if (target) {
            this.startDrag(target, e);
            // Prevent default to stop text selection, but allow input interaction if needed
            if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
                e.preventDefault();
            }
        }
    }

    _handleMouseMove(e) {
        if (this.isDragging) {
            this.performDrag(e);
            if (typeof this.dragCallback === 'function') {
                this.dragCallback(e);
            }
        }
    }

    _handleMouseUp(e) {
        if (this.isDragging) {
            this.stopDrag();
        }
    }

    startDrag(target, e) {
        this.isDragging = true;
        this.dragTarget = target;

        // Save original position if not saved
        const state = this._getState(target);
        if (!state.originalPosition) {
            // Check if element is positioned deeply or relatively
            const rect = target.getBoundingClientRect();
            // Saving relative offsets for cleaner "comeback" logic might depend on CSS context
            // For now, we assume absolute/fixed or we save current computed styles
            const computedStyle = window.getComputedStyle(target);
            state.originalPosition = {
                top: parseFloat(computedStyle.top) || 0,
                left: parseFloat(computedStyle.left) || 0,
                position: computedStyle.position
            };
        }

        const rect = target.getBoundingClientRect();
        this.offset = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };

        target.style.cursor = 'grabbing';
        target.style.zIndex = '1000'; // Bring to front
    }

    performDrag(e) {
        if (!this.dragTarget) return;

        // Simple drag implementation
        // For more complex boundary logic (using dragConfig), strict calculations would be needed.
        // Here we just follow the mouse with the calculated offset.

        // Note: This simple implementation assumes absolute positioning relative to the viewport or offset parent.
        // Adjust coordinate calculation if target is nested in a relative container.

        const x = e.clientX - this.offset.x;
        const y = e.clientY - this.offset.y;

        this.dragTarget.style.position = 'absolute'; // Ensure absolute to move freely
        this.dragTarget.style.left = `${x}px`;
        this.dragTarget.style.top = `${y}px`;
    }

    stopDrag() {
        if (this.dragTarget) {
            this.dragTarget.style.cursor = '';
            this.dragTarget.style.zIndex = '';
        }
        this.isDragging = false;
        this.dragTarget = null;
    }

    /**
     * Enables "return to original position" functionality on interaction end.
     * @param {boolean} enable 
     * @param {Function} callback 
     * @returns {Mouse}
     */
    comeback(enable, callback = null) {
        if (!this.currentSelector) {
            console.warn('Selector must be defined before enabling comeback.');
            return this;
        }

        // We hook into the same mouseup listener flow or add a specific one.
        // Since `drag` uses global mouseup, we can add a specific handler for this selector.

        const comebackHandler = (e) => {
            const target = e.target.closest(this.currentSelector);
            if (target && !this.isDragging) { // Trigger only after drag releases
                // Note: logic is tricky here because stopDrag clears isDragging.
                // We might need to listen to the end of a drag specifically.
                // Alternative: Check if element has moved.
            }
        };

        // Better approach: Modify 'stopDrag' or attach a separate listener that checks state
        // For simplicity reusing the logic from the original file which attached mouseup to selector.

        const handleComeback = (e) => {
            const target = e.target.closest(this.currentSelector);
            if (!target) return;

            const state = this._getState(target);
            if (state.originalPosition) {
                // Use Web Animations API
                const currentLeft = parseFloat(target.style.left) || 0;
                const currentTop = parseFloat(target.style.top) || 0;
                const destLeft = state.originalPosition.left;
                const destTop = state.originalPosition.top;

                const keyframes = [
                    { left: `${currentLeft}px`, top: `${currentTop}px` },
                    { left: `${destLeft}px`, top: `${destTop}px` }
                ];

                const animation = target.animate(keyframes, {
                    duration: 300,
                    easing: 'ease-out'
                });

                animation.onfinish = () => {
                    target.style.left = `${destLeft}px`;
                    target.style.top = `${destTop}px`;
                    if (typeof callback === 'function') callback();
                };
            }
        };

        if (enable) {
            // We listen to mouseup on the document to catch releases anywhere, 
            // but we only care if it was the target. 
            // Actually, the original code listened on selector.
            // Let's attach a specific "drag end" listener logic.
            // For now, attaching to the element itself for mouseup is risky if mouse drifted off.
            // We will rely on our global mouseup to trigger this if we were dragging this specific target.

            // To properly integrate with the class structure, we can wrap the stopDrag to trigger comeback
            const originalStopDrag = this.stopDrag.bind(this);
            this.stopDrag = () => {
                const target = this.dragTarget;
                originalStopDrag();
                if (target && target.matches(this.currentSelector)) {
                    // Trigger comeback
                    handleComeback({ target: target }); // Mock event object
                }
            };
        }

        return this;
    }
}
