import { GridPosition, Terrain, Actor, ActorState, World } from "./Models"; // Added ActorState and World
import { Hex, OffsetCoord } from "../Hex"; // Added Hex and OffsetCoord
import { warn } from "../utils/Logger";

const MAX_RANGE = 10; // Define maximum visibility range for the old `visibility` function. Not directly used by getVisibleWorldForPlayer.

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


// Helper to convert GridPosition to Hex for odd-q offset (flat-topped hexes)
// Assumes GridPosition.x is row index, GridPosition.y is column index
// This is duplicative of the one in Rules.ts - should be consolidated
function gridPositionToHex(pos: GridPosition): Hex {
    const q = pos.y; // column is q
    const r = pos.x - (pos.y - (pos.y & 1)) / 2; // row is x, convert to axial r for odd-q
    return new Hex(q, r, -q - r);
}

const DEFAULT_SIGHT_RANGE = 7; // Default sight range if actor has no weapon or weapon has no range

export function getVisibleWorldForPlayer(
    world: { terrain: Terrain[][], actors: Actor[] }, // Simplified World type for input
    playerId: number
): { terrain: Terrain[][], actors: Actor[] } {
    const playerActors = world.actors.filter(actor => actor.owner === playerId && actor.state !== ActorState.DEAD);

    if (playerActors.length === 0) {
        const unexploredTerrain = world.terrain.map(row => row.map(() => Terrain.UNEXPLORED));
        return { terrain: unexploredTerrain, actors: [] };
    }

    // Initialize a 2D boolean array for combined visibility, matching terrain dimensions
    const visibleMap: boolean[][] = world.terrain.map(row => row.map(() => false));

    // For each of the player's actors, calculate its LoS to all hexes within its sight range
    for (const actor of playerActors) {
        const actorHex = gridPositionToHex(actor.pos);
        const sightRange = (actor.weapon && typeof actor.weapon.range === 'number') ? actor.weapon.range : DEFAULT_SIGHT_RANGE;

        for (let r = 0; r < world.terrain.length; r++) {
            for (let c = 0; c < world.terrain[r].length; c++) {
                const targetGridPos: GridPosition = { x: r, y: c };
                const targetHex = gridPositionToHex(targetGridPos);

                if (actorHex.distance(targetHex) <= sightRange) {
                    if (hasLineOfSight(actorHex, targetHex, world.terrain, world.actors, hexToGridPosition)) {
                        visibleMap[r][c] = true;
                    }
                }
            }
        }
    }

    // Filter terrain based on the visibleMap
    const filteredTerrain = world.terrain.map((row, r) =>
        row.map((tile, c) => (visibleMap[r][c] ? tile : Terrain.UNEXPLORED))
    );

    // Filter actors: include player's own actors + any other actor on a visible tile
    const filteredActors = world.actors.filter(actor => {
        if (actor.owner === playerId) {
            return true; // Always include player's own actors
        }
        // For other actors, check if their position is on the visibleMap
        if (within(actor.pos.x, actor.pos.y, visibleMap) && visibleMap[actor.pos.x][actor.pos.y]) {
            // TODO: Potentially redact information for enemy actors if they are not fully identified.
            // For now, include them fully if visible.
            return true;
        }
        return false;
    });

    return { terrain: filteredTerrain, actors: filteredActors };
}
