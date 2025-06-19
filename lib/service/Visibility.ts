import { GridPosition, Terrain } from "./Models";
import { warn } from "../utils/Logger";

const MAX_RANGE = 10; // Define maximum visibility range

export function within(
  x: number,
  y: number,
  grid: Array<Array<unknown>>
): boolean {
  if (!grid || !grid.length) {
    return false;
  }

  return x >= 0 && y >= 0 && x < grid.length && y < grid[0].length; // assumes a square grid
}

export function visibility(
  from: GridPosition,
  terrain: Terrain[][]
): boolean[][] {
  if (!within(from.x, from.y, terrain)) {
    throw new Error(
      `Starting point (${from.x},${from.y}) is not within the terrain grid`
    );
  }

  if (terrain[from.x][from.y] === Terrain.BLOCKED) {
    warn(
      `Shouldn't be checking visibility FROM blocked terrain (${from.x},${from.y})`
    );
  }

  const visible: boolean[][] = Array(terrain.length)
    .fill(null)
    .map(() => Array(terrain[0].length).fill(false));

  for (let x = 0; x < terrain.length; x++) {
    for (let y = 0; y < terrain[x].length; y++) {
      const distance = Math.sqrt(Math.pow(from.x - x, 2) + Math.pow(from.y - y, 2));
      if (distance > MAX_RANGE) {
        visible[x][y] = false;
        continue;
      }

      if (from.x === x && from.y === y) {
        visible[x][y] = true;
        continue;
      }

      const path = findPath(from, { x: x, y: y }, terrain);

      let occluded = false;
      // Check intermediate points on the path for blocking terrain.
      // The path includes 'from' and goes up to, but doesn't necessarily include, '{x,y}' if blocked.
      // Or it might include {x,y} if path is clear or {x,y} is the first blockage.

      // Iterate up to path.length - 1 to check segments leading to the tile BEFORE the target.
      // If target tile itself is blocked, path might end there.
      // Or if an intermediate tile is blocked, path ends there.
      for (let i = 0; i < path.length; i++) {
        const pos = path[i];
        // If this path segment is the target tile itself, don't check it for occlusion.
        // Occlusion is by tiles *between* 'from' and 'target'.
        if (pos.x === x && pos.y === y) {
          break;
        }
        // If an intermediate tile on the path is blocked
        if (terrain[pos.x][pos.y] === Terrain.BLOCKED) {
          occluded = true;
          break;
        }
      }

      if (!occluded) {
        // If not occluded by an intermediate tile, the target tile (x,y) is visible.
        // This is true whether terrain[x][y] is EMPTY or BLOCKED.
        // We also need to ensure that the path actually REACHED the target tile,
        // otherwise findPath stopped short due to a blockage that IS the target tile.
        const lastPathElement = path[path.length-1];
        if(lastPathElement.x === x && lastPathElement.y === y) {
            visible[x][y] = true;
        } else {
            // Path did not reach (x,y) because (x,y) itself is blocked and findPath stops there.
            // In this case, (x,y) is visible because the blockage is seen.
            // Or an intermediate tile was blocked, which should have been caught by `occluded = true`
            // This branch needs care. If lastPathElement is not (x,y) AND not occluded,
            // it implies (x,y) itself is the first blocker on the path.
            if (terrain[x][y] === Terrain.BLOCKED && path.some(p => p.x ===x && p.y ===y)) {
                 visible[x][y] = true; // The blocking tile (x,y) is visible
            } else {
                 visible[x][y] = false; // Should have been caught by occluded logic or distance check
            }
        }
      } else {
        visible[x][y] = false; // Occluded by an intermediate tile
      }
    }
  }
  visible[from.x][from.y] = true; // Ensure starting point is always visible
  return visible;
}

function blockingLineOfSight(
  start: GridPosition,
  end: GridPosition,
  terrainGrid: Terrain[][]
): Array<GridPosition> {
  const path = findPath(start, end, terrainGrid);
  const blockingLine = path.filter(
    (position) => terrainGrid[position.x][position.y] === Terrain.BLOCKED
  );
  return blockingLine;
}

export function findNextStep(
  start: GridPosition,
  goal: GridPosition
): GridPosition {
  const vector = { x: goal.x - start.x, y: goal.y - start.y };
  const nextStep = { x: start.x, y: start.y };
  if (Math.abs(vector.x) > Math.abs(vector.y)) {
    nextStep.x = start.x + Math.sign(vector.x);
  } else {
    nextStep.y = start.y + Math.sign(vector.y);
  }
  return nextStep;
}

export function findPath(
  start: GridPosition,
  goal: GridPosition,
  terrain: Terrain[][]
): GridPosition[] {
  let current = { x: start.x, y: start.y };
  const path: GridPosition[] = [];
  let done = false;
  // Max steps: sum of dimensions is a safe upper bound for non-diagonal-heavy paths
  const maxSteps = terrain.length + terrain[0].length;
  let steps = 0;

  while (!done) {
    path.push({x: current.x, y: current.y}); // Push current position

    if (current.x === goal.x && current.y === goal.y) {
      done = true; // Reached goal
      continue;
    }

    if (terrain[current.x][current.y] === Terrain.BLOCKED && (current.x !== start.x || current.y !== start.y)) {
      done = true; // Hit a blocked tile (unless it's the start tile itself)
      continue;
    }

    steps++;
    if (steps > maxSteps) {
      // warn(`findPath exceeded maxSteps from (${start.x},${start.y}) to (${goal.x},${goal.y})`);
      done = true; // Safety break
      continue;
    }

    current = findNextStep(current, goal);

    // Check if next step is out of bounds
    if (!within(current.x, current.y, terrain)) {
        // warn(`findPath next step out of bounds from (${start.x},${start.y}) to (${goal.x},${goal.y}) -> next was (${current.x},${current.y})`);
        done = true; // Stop if out of bounds
        // Do not add 'current' to path as it's invalid.
        // The path will end at the last valid position.
        continue;
    }
  }
  return path;
}
