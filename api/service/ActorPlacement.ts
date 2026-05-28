import { Actor, GridPosition, Terrain } from './Models';

export interface SpawnZone {
    name: string;
    origin: GridPosition;
}

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
        NW: { name: 'NW', origin: { x: 0, y: 0 } },
        SE: { name: 'SE', origin: { x: maxX, y: maxY } },
        NE: { name: 'NE', origin: { x: 0, y: maxY } },
        SW: { name: 'SW', origin: { x: maxX, y: 0 } },
        N: { name: 'N', origin: { x: 0, y: midY } },
        S: { name: 'S', origin: { x: maxX, y: midY } },
        W: { name: 'W', origin: { x: midX, y: 0 } },
        E: { name: 'E', origin: { x: midX, y: maxY } }
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

export function findSpawnOrigin(
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
            const score = distanceScore * 10 - preferredZonePenalty;

            if (!bestOrigin
                || score > bestScore
                || (score === bestScore && (x < bestOrigin.x || (x === bestOrigin.x && y < bestOrigin.y)))) {
                bestOrigin = origin;
                bestScore = score;
            }
        }
    }

    return bestOrigin;
}
