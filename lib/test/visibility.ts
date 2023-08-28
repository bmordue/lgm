import { visibility, findNextStep } from '../service/Visibility';
import { generateTerrain } from '../service/Rules';
import { Terrain, GridPosition } from '../service/Models';
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

