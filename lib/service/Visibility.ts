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
    // const visible: boolean[][] = new Array(terrain.length).fill(new Array(terrain[0].length).fill(true));

    // // for each cell in terrain
    // for (let x = 0; x < terrain.length; x++) {
    //     for (let y = 0; y < terrain[x].length; y++) {
    //         if (terrain[x][y] === Terrain.BLOCKED) {
    //             visible[x][y] = false;
    //         }
    //     }
    // }
    // draw lines from pos to that cell
    // check whether they are blocked by any terrain.blocked

    return visible;
}

export function blockingLineOfSight(start: GridPosition, end: GridPosition, blocking: Array<GridPosition>): Array<GridPosition> {
    const vector = { x: end.x - start.x, y: end.y - start.y };
    return [];
}