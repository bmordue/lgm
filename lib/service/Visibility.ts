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

export function visibility(from: GridPosition, terrain: Terrain[][]): boolean[][] {
    if (!within(from.x, from.y, terrain)) {
        throw new Error(`Starting point (${from.x},${from.y}) is not within the terrain grid`);
    }

    if (terrain[from.x][from.y] === Terrain.BLOCKED) {
        warn(`Shouldn't be checking visibility FROM blocked terrain (${from.x},${from.y})`);
    }

    const visible: boolean[][] = new Array(terrain.length).fill(new Array(terrain[0].length).fill(true));

    // for each cell in terrain
    // draw lines from pos to that cell
    // check whether they are blocked by any terrain.blocked
    return visible;
}