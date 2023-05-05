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

    // const data = [];
    // for (let x = 0; x < 3; x++) {
    //     data.push(new Array(3));
    //     for (let y = 0; y < 3; y++) {
    //         const viz = new Array(terrain.length);
    //         for (let i = 0; i < terrain.length; i++) {
    //             viz[i] = new Array(terrain[0].length);
    //             for (let j = 0; j < terrain[0].length; j++) {
    //                 viz[i][j] = terrain[i][j] === Terrain.EMPTY;
    //             }
    //         }
    //         data[x][y] = viz;
    //     }
    // }

    // writeFileSync("expectedVisible.json", JSON.stringify(data));
    // console.log("wrote some test data!");

    const expectedVisible = JSON.parse(readFileSync("expectedVisible.json", "utf-8"));

    // for (let x = 0; x < terrain.length; x++) {
    //     for (let y = 0; y < terrain[x].length; y++) {
    for (let x = 0; x < 3; x++) {
        for (let y = 0; y < 3; y++) {
            it(`should calculate visibility from (${x}, ${y})`, () => {
                const visible = visibility({ x: x, y: y }, terrain);

                assert.deepEqual(visible, expectedVisible[x][y]);
                // writeFileSync(`visibility-${x}-${y}.svg`, visibilitySvg(terrain, visible, x, y));
                //                logVisibility(x, y, visible);
            });

        }
    }
});