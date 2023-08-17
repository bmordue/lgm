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
	    const path = findPath(from, {x: x, y: y}, terrain);
	    if (path.filter((p) => terrain[p.x][p.y] === Terrain.BLOCKED).length !== 0) {
		    visible[x][y] = false;
	    } else {
		    visible[x][y] = true;
	    }
        }
    }

    return visible;
}

export function blockingLineOfSight(start: GridPosition, end: GridPosition, blocking: Array<GridPosition>): Array<GridPosition> {
    const path = findPath(start, end, blocking);
    const blockingLine = path.filter((position) => blocking.some((block) => block.x === position.x && block.y === position.y));
    return blockingLine;
}

export function findNextStep(start: GridPosition, goal: GridPosition): GridPosition {
	const vector = { x: goal.x - start.x, y: goal.y - start.y };
	let nextStep = { x: start.x, y: start.y };
	if (Math.abs(vector.x) > Math.abs(vector.y)) {
	nextStep.x = start.x + 1;
 export function blockingLineOfSight(start: GridPosition, end: GridPosition, blocking: Array<GridPosition>): Array<GridPosition> {
     const path = findPath(start, end, terrain);
     const blockingLine = path.filter((position) => blocking.some((block) => block.x === position.x && block.y === position.y));
     return blockingLine;
 }
 
 export function findPath(start: GridPosition, goal: GridPosition, terrain: Terrain[][]): GridPosition[] {
     let current = { x: start.x, y: start.y };
     const path: GridPosition[] = [];
     let done = false;
     let maxSteps = terrain.length + terrain[0].length; // obviously not the best way to do this, but is above the max possible steps
     let steps = 0;
     while (!done) {
         if (current.x === goal.x && current.y === goal.y) {
             done = true;
         }
         steps++;
         if (steps > maxSteps) {
             done = true;
         }
         path.push(current);
         current = findNextStep(current, goal);
    if (terrain[current.x][current.y] === Terrain.BLOCKED) {
        done = true;
    }
}
}

export {};
}

// Add a statement or declaration here to fix the syntax error
export {};
}