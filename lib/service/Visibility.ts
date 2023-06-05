import { GridPosition, Terrain } from "./Models";
import { warn } from "../utils/Logger";

function within(x: number, y: number, grid: Array<Array<unknown>>): boolean {
    if (!grid || !grid.length) {
        return false;
    }

    return x >= 0
        && y >= 0
        && x < grid.length
        && y < grid[0].length; // assumes a square grid
}

// TODO: doesn't work -- start with bad implementations, work towards correct
export function visibility(from: GridPosition, terrain: Terrain[][]): boolean[][] {
    if (!within(from.x, from.y, terrain)) {
        throw new Error(`Starting point (${from.x},${from.y}) is not within the terrain grid`);
    }

    if (terrain[from.x][from.y] === Terrain.BLOCKED) {
        warn(`Shouldn't be checking visibility FROM blocked terrain (${from.x},${from.y})`);
    }

    const visible: boolean[][] = [];
    for (let x = 0; x < terrain.length; x++) {
        visible.push(new Array<boolean>(terrain[x].length));
        for (let y = 0; y < terrain[x].length; y++) {
            if (terrain[x][y] === Terrain.BLOCKED) {
                visible[x][y] = false;
            } else visible[x][y] = true;
        }
    }

    // for each element in the visible grid
    // check whether it is visible from the starting point
    // if it is, set it to true
    // if not, set it to false
    for (let x = 0; x < visible.length; x++) {
        for (let y = 0; y < visible[x].length; y++) {
            if (terrain[x][y] === Terrain.BLOCKED) {    // don't check visibility from blocked terrain
                continue;
            }
            // check line of sight from the from GridPosition to the current GridPosition
            // if there is line of sight, set visible[x][y] to true
            // if not, set it to false
            const vector = { x: x - from.x, y: y - from.y };
            const distance = Math.sqrt(vector.x * vector.x + vector.y * vector.y);
            const step = { x: vector.x / distance, y: vector.y / distance };
            let current = { x: from.x, y: from.y };
            let visibleFromHere = true;
            while (current.x !== x && current.y !== y) {
                current = { x: current.x + step.x, y: current.y + step.y };
                if (terrain[Math.floor(current.x)][Math.floor(current.y)] === Terrain.BLOCKED) {
                    visibleFromHere = false;
                    break;
                }
            }
            visible[x][y] = visibleFromHere;    
        }
    }
    

    return visible;
}

export function blockingLineOfSight(start: GridPosition, end: GridPosition, blocking: Array<GridPosition>): Array<GridPosition> {
    const vector = { x: end.x - start.x, y: end.y - start.y };
    return [];
}