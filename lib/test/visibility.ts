import { visibility } from '../service/Visibility';
import { generateTerrain } from '../service/Rules';
import { inspect } from 'util';
import { Terrain } from '../service/Models';

function logVisibility(grid) {
    for (let x = 0; x < grid.length; x++) {
        let line = '';
        for (let y = 0; y < grid[x].length; y++) {
            line += grid[x][y] === true ? '.' : ' ';
        }
        console.log(line);
    }
}

describe("visibility tests", async () => {
    const terrain: Terrain[][] = await generateTerrain();

    // for (let x = 0; x < terrain.length; x++) {
    //     for (let y = 0; y < terrain[x].length; y++) {
    for (let x = 0; x < 3; x++) {
        for (let y = 0; y < 3; y++) {
            it(`should calculate visibility from (${x}, ${y})`, () => {
                const visible = visibility({ x: x, y: y }, terrain);

                logVisibility(visible);
            });

        }
    }
});