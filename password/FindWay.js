import { PasswordStrategy } from './Base.js';

export class FindWayStrategy extends PasswordStrategy {
    constructor(system) {
        super(system);
        this.gridW = 5;
        this.gridH = 5;
    }

    show(actionDef, uniqueId, passDef) {
        let area = passDef?.area || [5, 5];
        this.gridW = area[0];
        this.gridH = area[1];
        const startPos = passDef?.start || [0, 0];
        const targetPos = passDef?.target || [this.gridW - 1, this.gridH - 1];

        // Lấy đúng path chuẩn từ schema 'street' để verify
        this.correctPath = passDef?.street || [];

        super.show(actionDef, uniqueId, {
            ...passDef,
            type: 'find_way',
            gridW: this.gridW,
            gridH: this.gridH,
            startPos: startPos,
            targetPos: targetPos,
            title: "NEURAL LINK",
            desc: "Draw the correct connection path.",
            value: JSON.stringify(this.correctPath) // Pass expected value for Render verification
        });
    }

    // verify method removed as Base/Render handle it now via value comparison
}