import { GridPosition, Terrain, Actor } from "./Models"; // Added Actor
import { Hex, OffsetCoord } from "../Hex"; // Added Hex and OffsetCoord
import { warn } from "../utils/Logger";

// Helper to convert Hex to GridPosition for odd-q offset (flat-topped hexes)
// Assumes GridPosition.x is row index, GridPosition.y is column index
function hexToGridPosition(hex: Hex): GridPosition {
    const col: number = hex.q; // y-coordinate in GridPosition
    // For odd-q, RedBlobGames: row = r + (q + (q&1)*offset) / 2. Where ODD offset = -1.
    // So, row = r + (q - (q&1)) / 2
    const row: number = hex.r + (hex.q - (hex.q & 1)) / 2; // x-coordinate in GridPosition
    return { x: row, y: col };
}

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
      if (terrain[x][y] === Terrain.BLOCKED) {
        // don't check visibility from blocked terrain
        continue;
      }
      const path = findPath(from, { x: x, y: y }, terrain);
      if (
        path.filter((p) => terrain[p.x][p.y] === Terrain.BLOCKED).length !== 0
      ) {
        visible[x][y] = false;
      } else {
        visible[x][y] = true;
      }
    }
  }

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
  const maxSteps = terrain.length + terrain[0].length; // obviously not the best way to do this, but is above the max possible steps
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
  return path;
}

export function hasLineOfSight(
    startHex: Hex,
    endHex: Hex,
    terrain: Terrain[][], // Expected to be terrain[row][col]
    actors: Actor[],
    // Optional mapper for flexibility, defaults to our odd-q assumption
    hexToGridMapper: (h: Hex) => GridPosition = hexToGridPosition
): boolean {
    const pathHexes: Hex[] = startHex.linedraw(endHex);

    if (pathHexes.length === 0) {
        // This case should ideally not be reached if startHex.linedraw is robust.
        // If startHex and endHex are the same, linedraw usually returns [startHex].
        // Returning true for 0 length path implies no obstruction.
        return true;
    }

    for (let i = 0; i < pathHexes.length; i++) {
        const currentHex = pathHexes[i];

        // The first hex in the path is the startHex. We don't check for obstructions at the viewpoint itself.
        if (i === 0) {
            continue;
        }

        const gridPos = hexToGridMapper(currentHex);

        // Check if the current hex on the path is within map boundaries.
        // The existing 'within(x, y, grid)' function expects x as row index, y as column index.
        if (!within(gridPos.x, gridPos.y, terrain)) {
            // A hex on the line is off-map, so LoS is blocked by map edge.
            return false;
        }

        // Check terrain for blockage.
        // terrain[row][col] which is terrain[gridPos.x][gridPos.y]
        if (terrain[gridPos.x][gridPos.y] === Terrain.BLOCKED) {
            return false; // LoS blocked by terrain
        }

        // Check for blocking units on the current hex,
        // but only if this hex is not the final destination (endHex).
        // Units on the endHex itself do not block LoS *to* that hex.
        if (i < pathHexes.length - 1) {
            for (const actor of actors) {
                // Assuming actor.pos is a GridPosition {x: row, y: col}
                if (actor.pos.x === gridPos.x && actor.pos.y === gridPos.y) {
                    // Future: Could check actor.state === ActorState.ALIVE
                    // Future: Could consider unit size based on CombatSystem.md definitions
                    return false; // LoS blocked by an actor
                }
            }
        }
    }
    // If the loop completes, no obstructions were found along the path.
    return true;
}
