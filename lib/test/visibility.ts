import { visibility, findNextStep, findPath } from '../service/Visibility';
import { generateTerrain } from '../service/Rules';
import { Terrain, GridPosition } from '../service/Models';
import { readFileSync } from 'fs';
import assert = require('assert');


function logVisibility(fromX, fromY, grid) {
    for (let x = 0; x < grid.length; x++) {
        let line = '';
        for (let y = 0; y < grid[x].length; y++) {
            if (fromX === x && fromY === y) {
                line += 'o';
            } else {
                line += grid[x][y] ? '.' : ' ';
            }
        }
        console.log(line);
    }
}

function logTerrain(terrain) {
    for (let x = 0; x < terrain.length; x++) {
        let line = '';
        for (let y = 0; y < terrain[x].length; y++) {
            line += terrain[x][y] === Terrain.BLOCKED ? 'X' : '.';
        }
        console.log(line);
    }
}

describe("visibility tests", async () => {
    const terrain: Terrain[][] = await generateTerrain();

    logTerrain(terrain);
    console.log();

    const expectedVisible = JSON.parse(readFileSync("expectedVisible.json", "utf-8"));

    //    logVisibility(0, 0, expectedVisible[0][0]);
    //   writeFileSync("exp_vis_0_0.svg", visibilitySvg(terrain, expectedVisible[0][0], 0, 0));

    for (let x = 0; x < 3; x++) {
        for (let y = 0; y < 3; y++) {
            if (x == 0 && y == 0) {
                continue;
            }
            it(`should calculate visibility from (${x}, ${y})`, () => {
                const visible = visibility({ x: x, y: y }, terrain);

                assert.deepEqual(visible, expectedVisible[x][y]);
                // writeFileSync(`visibility-${x}-${y}.svg`, visibilitySvg(terrain, visible, x, y));
                //logVisibility(x, y, visible);
                //writeFileSync(`exp-vis-${x}-${y}.svg`, visibilitySvg(terrain, expectedVisible[x][y], x, y));
            });

        }
    }

    it("should calculate visibility from (0, 0)", () => {
        const visible = visibility({ x: 0, y: 0 }, terrain);

        assert.deepEqual(visible, expectedVisible[0][0]);
        //writeFileSync(`visibility-0-0.svg`, visibilitySvg(terrain, visible, 0, 0));
        //writeFileSync(`exp-vis-0-0.svg`, visibilitySvg(terrain, expectedVisible[0][0], 0, 0));
    });
});

describe("path finding", async () => {
    // const terrain: Terrain[][] = await generateTerrain();

    it("should find a path", () => {
        const start = { x: 0, y: 0 };
        const goal = { x: 2, y: 2 };

        const path: GridPosition[] = [start];
        let current = start;
        while (current.x != goal.x && current.y != goal.y) {
            current = findNextStep(current, goal);
            path.push(current);
        }
        path.push(goal);
        assert.deepEqual(path, [{ x: 0, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }, { x: 1, y: 2 }, { x: 2, y: 2 }]);
    });
});


describe("visibility (claude)", () => {

    it("should throw error if start point is not within grid", () => {
        const terrain: Terrain[][] = [[Terrain.EMPTY]];
        const start: GridPosition = { x: 1, y: 0 };
        assert.throws(() => visibility(start, terrain));
    });

    it("should handle empty grid", () => {
        const terrain: Terrain[][] = [];
        const start = { x: 0, y: 0 };
        assert.deepEqual(visibility(start, terrain), []);
    });

    it("should mark all non-blocked as visible", () => {
        const terrain = [
            [Terrain.EMPTY, Terrain.EMPTY],
            [Terrain.EMPTY, Terrain.EMPTY]
        ];
        const start = { x: 0, y: 0 };
        const expected = [
            [true, true],
            [true, true]
        ];
        assert.deepEqual(visibility(start, terrain), expected);
    });

});

describe("findPath", () => {

    it("should return a path from start to goal", () => {
        const start = { x: 0, y: 0 };
        const goal = { x: 1, y: 1 };
        const terrain = [
            [Terrain.EMPTY, Terrain.EMPTY],
            [Terrain.EMPTY, Terrain.EMPTY]
        ];

        const expectedPath = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }];

        assert.deepEqual(findPath(start, goal, terrain), expectedPath);
    });

});
