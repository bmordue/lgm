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
        export function findPath(start: GridPosition, goal: GridPosition, terrain: Terrain[][]): GridPosition[] {
            // Existing code for the function
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
            } else {
                nextStep.y = start.y + 1;
            }
            return nextStep;
        }
        
        // Add a declaration or statement here to resolve the syntax error
        // Add a declaration or statement here to resolve the syntax error
        }
        }