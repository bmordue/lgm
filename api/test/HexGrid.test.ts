import assert = require("assert");
import {
    calculateHexDistance,
    gridPositionToHex,
    hexToGridPosition
} from "../service/HexGrid";

describe("HexGrid", () => {
    it("round trips grid positions through hex coordinates", () => {
        const positions = [
            { x: 0, y: 0 },
            { x: 3, y: 4 },
            { x: 8, y: 7 }
        ];

        for (const position of positions) {
            assert.deepStrictEqual(hexToGridPosition(gridPositionToHex(position)), position);
        }
    });

    it("calculates symmetric hex-grid distances", () => {
        const first = { x: 2, y: 7 };
        const second = { x: 8, y: 3 };

        assert.strictEqual(
            calculateHexDistance(first, second),
            calculateHexDistance(second, first)
        );
    });
});
