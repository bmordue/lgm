import { visibility } from '../service/Visibility';
import { generateTerrain } from '../service/Rules';
import { inspect } from 'util';
import { Terrain } from '../service/Models';
import { visibilitySvg } from '../utils/Draw';
import { readFileSync, writeFileSync } from 'fs';
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

    logVisibility(0, 0, expectedVisible[0][0]);
    writeFileSync("exp_vis_0_0.svg", visibilitySvg(terrain, expectedVisible[0][0], 0, 0));

    for (let x = 0; x < 3; x++) {
        for (let y = 0; y < 3; y++) {
            xit(`should calculate visibility from (${x}, ${y})`, () => {
                const visible = visibility({ x: x, y: y }, terrain);

                assert.deepEqual(visible, expectedVisible[x][y]);
                // writeFileSync(`visibility-${x}-${y}.svg`, visibilitySvg(terrain, visible, x, y));
                //                logVisibility(x, y, visible);
            });

        }
    }
});