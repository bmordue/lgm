import { visibility } from '../service/Visibility';
import { generateTerrain } from '../service/Rules';
import { inspect } from 'util';
import { Terrain } from '../service/Models';

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

    // for (let x = 0; x < terrain.length; x++) {
    //     for (let y = 0; y < terrain[x].length; y++) {
    for (let x = 0; x < 3; x++) {
        for (let y = 0; y < 3; y++) {
            it(`should calculate visibility from (${x}, ${y})`, () => {
                const visible = visibility({ x: x, y: y }, terrain);

                logVisibility(x, y, visible);
            });

        }
    }
});