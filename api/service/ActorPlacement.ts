import { Actor, GridPosition, Terrain } from './Models';

/**
 * A candidate region of the map that a player formation should spawn near.
 *
 * `origin` is the top-left (minimum x/y) coordinate of the formation box, i.e.
 * the spawn position that will be returned for this zone when it is available.
 * `priority` is reserved for future weighting; all standard zones are equal
 * priority so that every player receives a balanced starting position.
 */
export interface SpawnZone {
    name: string;
    origin: GridPosition;
    priority?: number;
}

/**
 * Result of scoring a single candidate spawn position.
 *
 * All component scores are normalised to the range 0-1 so that they can be
 * combined into a single weighted `score`.
 */
export interface ScoredPosition {
    pos: GridPosition;
    score: number;
    distanceScore: number;
    terrainScore: number;
    centralityScore: number;
}

const DISTANCE_WEIGHT = 10;
const DISTANCE_SCORE_WEIGHT = 0.5;
const TERRAIN_SCORE_WEIGHT = 0.3;
const CENTRALITY_SCORE_WEIGHT = 0.2;

/**
 * Build the ordered list of spawn zones for a given player count.
 *
 * The mapping guarantees fair, well-separated starting regions:
 * - 2 players: opposite corners (NW, SE)
 * - 3 players: triangular distribution (N, SW, SE)
 * - 4 players: all four corners (NW, SE, NE, SW)
 * - 5-8 players: corners first, then perimeter edge midpoints
 *
 * @param playerCount Number of players in the game.
 * @param worldSize Dimensions of the world terrain grid.
 * @param formationSize Width/height of a player's square formation.
 * @returns Ordered spawn zones; index corresponds to player join order.
 */
export function getSpawnZonesForPlayerCount(
    playerCount: number,
    worldSize: { width: number; height: number },
    formationSize: number
): SpawnZone[] {
    const maxX = Math.max(worldSize.width - formationSize, 0);
    const maxY = Math.max(worldSize.height - formationSize, 0);
    const midX = Math.floor(maxX / 2);
    const midY = Math.floor(maxY / 2);

    const zones = {
        NW: { name: 'NW', origin: { x: 0, y: 0 }, priority: 10 },
        SE: { name: 'SE', origin: { x: maxX, y: maxY }, priority: 10 },
        NE: { name: 'NE', origin: { x: 0, y: maxY }, priority: 10 },
        SW: { name: 'SW', origin: { x: maxX, y: 0 }, priority: 10 },
        N: { name: 'N', origin: { x: 0, y: midY }, priority: 10 },
        S: { name: 'S', origin: { x: maxX, y: midY }, priority: 10 },
        W: { name: 'W', origin: { x: midX, y: 0 }, priority: 10 },
        E: { name: 'E', origin: { x: midX, y: maxY }, priority: 10 }
    };

    if (playerCount <= 2) {
        return [zones.NW, zones.SE];
    }

    if (playerCount === 3) {
        return [zones.N, zones.SW, zones.SE];
    }

    if (playerCount === 4) {
        return [zones.NW, zones.SE, zones.NE, zones.SW];
    }

    return [zones.NW, zones.SE, zones.NE, zones.SW, zones.N, zones.S, zones.W, zones.E].slice(0, playerCount);
}

/**
 * Derive the spawn origin (minimum x/y) of each existing player's formation.
 *
 * Formation actors are stored individually, so the top-left origin of a group
 * is reconstructed from the minimum x and y coordinates of its actors.
 *
 * @param existingActors All actors currently on the map.
 * @returns One origin per owning player, in first-seen order.
 */
export function getPlayerSpawnOrigins(existingActors: Actor[]): GridPosition[] {
    const originsByOwner = new Map<number, GridPosition>();

    for (const actor of existingActors) {
        const currentOrigin = originsByOwner.get(actor.owner);
        if (!currentOrigin) {
            originsByOwner.set(actor.owner, { x: actor.pos.x, y: actor.pos.y });
            continue;
        }

        originsByOwner.set(actor.owner, {
            x: Math.min(currentOrigin.x, actor.pos.x),
            y: Math.min(currentOrigin.y, actor.pos.y)
        });
    }

    return Array.from(originsByOwner.values());
}

/**
 * Check whether a square formation can be placed with its top-left corner at
 * (x, y).
 *
 * A position is valid only when the entire formation is in bounds, every cell
 * is {@link Terrain.EMPTY}, and no existing actor already occupies the box.
 *
 * @param x Top-left x coordinate of the formation.
 * @param y Top-left y coordinate of the formation.
 * @param size Width/height of the square formation.
 * @param terrain The world terrain grid.
 * @param existingActors Actors already placed on the map.
 * @returns `true` when the formation fits without overlapping terrain or actors.
 */
export function isValidSpawnArea(
    x: number,
    y: number,
    size: number,
    terrain: Terrain[][],
    existingActors: Actor[]
): boolean {
    if (x < 0 || y < 0 || x + size > terrain.length || y + size > terrain[0].length) {
        return false;
    }

    for (let row = 0; row < size; row++) {
        for (let col = 0; col < size; col++) {
            if (terrain[x + row][y + col] !== Terrain.EMPTY) {
                return false;
            }
        }
    }

    return !existingActors.some(actor =>
        actor.pos.x >= x &&
        actor.pos.x < x + size &&
        actor.pos.y >= y &&
        actor.pos.y < y + size
    );
}

function squaredDistance(from: GridPosition, to: GridPosition): number {
    return Math.pow(from.x - to.x, 2) + Math.pow(from.y - to.y, 2);
}

/**
 * Score a valid candidate spawn position using a weighted combination of
 * fairness heuristics.
 *
 * Components (all normalised to 0-1):
 * - `distanceScore`: distance from the nearest existing player, so positions
 *   further from opponents score higher. Weighted 0.5.
 * - `terrainScore`: fraction of the formation that sits on {@link Terrain.EMPTY}.
 *   Weighted 0.3.
 * - `centralityScore`: proximity to the world centre. Weighted 0.2.
 *
 * This is a general-purpose heuristic; {@link findOptimalSpawnPosition} uses it
 * to break ties while preserving the zone-anchored, corner-balanced selection.
 *
 * @param pos Candidate top-left position of the formation.
 * @param size Width/height of the square formation.
 * @param terrain The world terrain grid.
 * @param existingPlayerPositions Origins of players already placed.
 * @param worldCenter Centre of the world grid.
 * @returns The candidate position together with its component and total scores.
 */
export function scorePosition(
    pos: GridPosition,
    size: number,
    terrain: Terrain[][],
    existingPlayerPositions: GridPosition[],
    worldCenter: GridPosition
): ScoredPosition {
    const maxDimension = Math.max(terrain.length, terrain[0].length, 1);
    const distanceScore = existingPlayerPositions.length === 0
        ? 0
        : Math.min(
            Math.min(...existingPlayerPositions.map(p => Math.sqrt(squaredDistance(p, pos)))) / maxDimension,
            1
        );

    let emptyCells = 0;
    for (let row = 0; row < size; row++) {
        for (let col = 0; col < size; col++) {
            if (terrain[pos.x + row] && terrain[pos.x + row][pos.y + col] === Terrain.EMPTY) {
                emptyCells++;
            }
        }
    }
    const terrainScore = size > 0 ? emptyCells / (size * size) : 0;

    const maxCenterDistance = Math.sqrt(
        Math.pow(maxDimension / 2, 2) + Math.pow(maxDimension / 2, 2)
    ) || 1;
    const distFromCenter = Math.sqrt(squaredDistance(pos, worldCenter));
    const centralityScore = Math.max(0, 1 - (distFromCenter / maxCenterDistance));

    const score =
        (distanceScore * DISTANCE_SCORE_WEIGHT) +
        (terrainScore * TERRAIN_SCORE_WEIGHT) +
        (centralityScore * CENTRALITY_SCORE_WEIGHT);

    return { pos, score, distanceScore, terrainScore, centralityScore };
}

/**
 * Find the best valid spawn origin for a player's formation.
 *
 * Considers every in-bounds origin whose formation fits on {@link Terrain.EMPTY}
 * terrain without overlapping existing actors. Positions are ranked primarily
 * by distance from existing players (to keep spawns spread out) and their
 * proximity to the preferred spawn zone (to keep players anchored to fair,
 * balanced corners/edges). {@link scorePosition} centrality is used only as a
 * deterministic tie-breaker.
 *
 * When the preferred zone is blocked or occupied, the search naturally falls
 * back to the best available position across the whole map. Returns `undefined`
 * only when no valid formation can fit anywhere.
 *
 * @param terrain The world terrain grid.
 * @param formationSize Width/height of the square formation.
 * @param existingActors Actors already placed on the map.
 * @param existingPlayerOrigins Origins of players already placed.
 * @param preferredZone Optional zone that this player should spawn near.
 * @returns The chosen top-left origin, or `undefined` if the map is full.
 */
export function findOptimalSpawnPosition(
    terrain: Terrain[][],
    formationSize: number,
    existingActors: Actor[],
    existingPlayerOrigins: GridPosition[],
    preferredZone?: SpawnZone
): GridPosition | undefined {
    let bestOrigin: GridPosition | undefined;
    let bestScore = Number.NEGATIVE_INFINITY;

    for (let x = 0; x <= terrain.length - formationSize; x++) {
        for (let y = 0; y <= terrain[0].length - formationSize; y++) {
            if (!isValidSpawnArea(x, y, formationSize, terrain, existingActors)) {
                continue;
            }

            const origin = { x, y };
            const distanceScore = existingPlayerOrigins.length === 0
                ? 0
                : Math.min(...existingPlayerOrigins.map(pos => squaredDistance(pos, origin)));
            const preferredZonePenalty = preferredZone
                ? squaredDistance(preferredZone.origin, origin)
                : 0;
            const score = distanceScore * DISTANCE_WEIGHT - preferredZonePenalty;

            const isBetter = !bestOrigin
                || score > bestScore
                || (score === bestScore && (x < bestOrigin.x || (x === bestOrigin.x && y < bestOrigin.y)));

            if (isBetter) {
                bestOrigin = origin;
                bestScore = score;
            }
        }
    }

    return bestOrigin;
}

/**
 * @deprecated Use {@link findOptimalSpawnPosition}; retained as a thin alias so
 * existing callers keep working.
 */
export function findSpawnOrigin(
    terrain: Terrain[][],
    formationSize: number,
    existingActors: Actor[],
    existingPlayerOrigins: GridPosition[],
    preferredZone?: SpawnZone
): GridPosition | undefined {
    return findOptimalSpawnPosition(
        terrain,
        formationSize,
        existingActors,
        existingPlayerOrigins,
        preferredZone
    );
}
