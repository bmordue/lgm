# Implementation Plan: Replace Actor Placement Algorithm

**Issue ID**: lgm-k92
**Priority**: P2
**Type**: Chore

## 1. Summary

Replace the current actor placement algorithm in `Rules.ts` with an intelligent spawn system that ensures better distribution of actors across the map, considers terrain, and provides more strategic starting positions for players.

## 2. Problem

The current actor placement algorithm in `api/service/Rules.ts` (starting at line 489) has several issues:

### Current Implementation Limitations
- **Random Shuffling**: Uses random position shuffling which can lead to clustering
- **Simple Area Check**: Only checks if a 3x3 area is empty, doesn't consider:
  - Terrain types (may spawn on blocked terrain)
  - Distance from other players (can spawn too close to enemies)
  - Strategic value of positions (high ground, cover, resources)
  - Map symmetry and fairness
- **Poor Fallback**: Fallback is a simple systematic scan, still doesn't consider strategic value
- **No Player Distribution**: Doesn't ensure players spawn far apart from each other
- **Terrain Ignoring**: Doesn't validate that spawned actors are on valid terrain

### Specific Code Issues
From `api/service/Rules.ts:489-588`:
```typescript
// Current approach:
1. Generate all possible 3x3 positions
2. Shuffle randomly
3. Pick first empty one
4. Fallback to systematic scan if fails
```

This can result in:
- Players spawning adjacent to each other
- Actors spawning on BLOCKED terrain
- Unfair advantages based on luck
- Clustered spawns instead of distributed

## 3. Current State Analysis

### Existing Implementation
- **Grid Size**: 3x3 actor spawn grid (9 actors)
- **Terrain**: 20x20 hexagonal grid
- **Attempts**: 50 max attempts
- **Validation**: Only checks if area is empty
- **Fallback**: Systematic scan from (0,0)

### Terrain Types
From `Models.ts`:
```typescript
enum Terrain {
    EMPTY,    // Valid spawn location
    BLOCKED,  // Invalid - should not spawn here
    UNEXPLORED // Needs clarification if valid
}
```

### World Structure
- 20x20 grid = 400 hexes total
- Each player needs 3x3 = 9 hexes
- Max ~44 player groups theoretically
- Current max players per game is 8
- 8 players × 9 actors = 72 hexes needed (~18% of map)

## 4. Proposed Solution

Implement an intelligent spawn system with:

1. **Terrain Validation**: Only spawn on EMPTY terrain
2. **Player Distribution**: Ensure players spawn far apart
3. **Strategic Positioning**: Consider tactical value of positions
4. **Fairness**: Balanced starting positions for all players
5. **Predictable Fallback**: Defined spawn zones as fallback

### Algorithm Design

```typescript
SpawnAlgorithm:
1. Define strategic spawn zones (corners, edges)
2. For each player:
   a. Calculate minimum distance from existing players
   b. Filter positions by terrain validity
   c. Score positions by:
      - Distance from other players (higher = better)
      - Terrain mix (variety is good)
      - Centrality (avoid edges in small games)
   d. Select best-scored valid position
3. Return positions or error if not enough space
```

## 5. Implementation Plan

### Phase 1: Analysis and Design (1-2 hours)

#### 1.1 Map Analysis
Research the current world generation:
- How is terrain distributed?
- What percentage is BLOCKED vs EMPTY?
- Is there a pattern to terrain generation?

#### 1.2 Define Spawn Zones
Create strategic spawn zones based on player count:
- 2 players: Opposite corners
- 3 players: Triangular distribution
- 4 players: Four corners
- 5-8 players: Distributed around perimeter

#### 1.3 Scoring Function Design
Define scoring criteria:
```typescript
interface SpawnScore {
    distanceFromPlayers: number;  // Weight: 0.5
    terrainQuality: number;        // Weight: 0.3
    centralityScore: number;       // Weight: 0.2
    totalScore: number;
}
```

### Phase 2: Core Algorithm Implementation (3-4 hours)

#### 2.1 Create Spawn Zone Utility
Create new file `api/service/ActorPlacement.ts`:

```typescript
import { GridPosition, Terrain, Actor } from './Models';

interface SpawnZone {
    name: string;
    centerX: number;
    centerY: number;
    priority: number; // Higher = preferred
}

export function getSpawnZonesForPlayerCount(playerCount: number, worldSize: { width: number, height: number }): SpawnZone[] {
    const { width, height } = worldSize;
    const zones: SpawnZone[] = [];

    switch (playerCount) {
        case 2:
            // Opposite corners
            zones.push(
                { name: 'NW', centerX: 2, centerY: 2, priority: 10 },
                { name: 'SE', centerX: width - 3, centerY: height - 3, priority: 10 }
            );
            break;

        case 3:
            // Triangular distribution
            zones.push(
                { name: 'N', centerX: width / 2, centerY: 2, priority: 10 },
                { name: 'SW', centerX: 2, centerY: height - 3, priority: 10 },
                { name: 'SE', centerX: width - 3, centerY: height - 3, priority: 10 }
            );
            break;

        case 4:
            // Four corners
            zones.push(
                { name: 'NW', centerX: 2, centerY: 2, priority: 10 },
                { name: 'NE', centerX: width - 3, centerY: 2, priority: 10 },
                { name: 'SW', centerX: 2, centerY: height - 3, priority: 10 },
                { name: 'SE', centerX: width - 3, centerY: height - 3, priority: 10 }
            );
            break;

        default:
            // For 5-8 players, distribute around perimeter
            const angleStep = (2 * Math.PI) / playerCount;
            const radius = Math.min(width, height) / 2 - 3;
            const centerX = width / 2;
            const centerY = height / 2;

            for (let i = 0; i < playerCount; i++) {
                const angle = i * angleStep;
                zones.push({
                    name: `Zone${i+1}`,
                    centerX: Math.floor(centerX + radius * Math.cos(angle)),
                    centerY: Math.floor(centerY + radius * Math.sin(angle)),
                    priority: 10
                });
            }
    }

    return zones;
}
```

#### 2.2 Implement Terrain Validation
```typescript
export function isValidSpawnArea(
    x: number,
    y: number,
    size: number,
    terrain: Terrain[][],
    existingActors: Actor[]
): boolean {
    // Check bounds
    if (x < 0 || y < 0 || x + size > terrain.length || y + size > terrain[0].length) {
        return false;
    }

    // Check terrain - all must be EMPTY
    for (let i = 0; i < size; i++) {
        for (let j = 0; j < size; j++) {
            if (terrain[x + i][y + j] !== Terrain.EMPTY) {
                return false;
            }
        }
    }

    // Check no existing actors
    return !existingActors.some(actor =>
        actor.pos.x >= x &&
        actor.pos.x < x + size &&
        actor.pos.y >= y &&
        actor.pos.y < y + size
    );
}
```

#### 2.3 Implement Position Scoring
```typescript
interface ScoredPosition {
    pos: GridPosition;
    score: number;
    distanceScore: number;
    terrainScore: number;
    centralityScore: number;
}

export function scorePosition(
    pos: GridPosition,
    size: number,
    terrain: Terrain[][],
    existingPlayerPositions: GridPosition[],
    worldCenter: GridPosition
): ScoredPosition {
    // Distance from other players (higher is better)
    const minDistance = existingPlayerPositions.length > 0
        ? Math.min(...existingPlayerPositions.map(p =>
            Math.sqrt(Math.pow(p.x - pos.x, 2) + Math.pow(p.y - pos.y, 2))
          ))
        : Infinity;
    const distanceScore = Math.min(minDistance / 20, 1); // Normalize to 0-1

    // Terrain quality (all EMPTY is good)
    const terrainScore = 1.0; // If we got here, terrain is already validated as EMPTY

    // Centrality (distance from world center, normalized)
    const distFromCenter = Math.sqrt(
        Math.pow(pos.x - worldCenter.x, 2) +
        Math.pow(pos.y - worldCenter.y, 2)
    );
    const maxDistFromCenter = Math.sqrt(
        Math.pow(terrain.length / 2, 2) +
        Math.pow(terrain[0].length / 2, 2)
    );
    const centralityScore = 1 - (distFromCenter / maxDistFromCenter); // Closer to center = higher

    // Weighted total
    const score = (distanceScore * 0.5) + (terrainScore * 0.3) + (centralityScore * 0.2);

    return {
        pos,
        score,
        distanceScore,
        terrainScore,
        centralityScore
    };
}
```

#### 2.4 Implement Main Placement Function
```typescript
export async function findOptimalSpawnPosition(
    terrain: Terrain[][],
    existingActors: Actor[],
    existingPlayerPositions: GridPosition[],
    preferredZone?: SpawnZone
): Promise<GridPosition | null> {
    const ACTOR_GRID_SIZE = 3;
    const worldSize = { width: terrain.length, height: terrain[0].length };
    const worldCenter = { x: worldSize.width / 2, y: worldSize.height / 2 };

    const scoredPositions: ScoredPosition[] = [];

    // Define search area (prefer zone if provided, otherwise search all)
    const searchRadius = preferredZone ? 5 : worldSize.width; // Search 5 hexes around preferred zone
    const searchCenterX = preferredZone ? preferredZone.centerX : worldCenter.x;
    const searchCenterY = preferredZone ? preferredZone.centerY : worldCenter.y;

    for (let x = Math.max(0, searchCenterX - searchRadius);
         x <= Math.min(worldSize.width - ACTOR_GRID_SIZE, searchCenterX + searchRadius);
         x++) {
        for (let y = Math.max(0, searchCenterY - searchRadius);
             y <= Math.min(worldSize.height - ACTOR_GRID_SIZE, searchCenterY + searchRadius);
             y++) {

            if (isValidSpawnArea(x, y, ACTOR_GRID_SIZE, terrain, existingActors)) {
                const scored = scorePosition(
                    { x, y },
                    ACTOR_GRID_SIZE,
                    terrain,
                    existingPlayerPositions,
                    worldCenter
                );
                scoredPositions.push(scored);
            }
        }
    }

    if (scoredPositions.length === 0) {
        return null;
    }

    // Sort by score descending and return best
    scoredPositions.sort((a, b) => b.score - a.score);
    return scoredPositions[0].pos;
}
```

### Phase 3: Integration with Rules.ts (2 hours)

#### 3.1 Refactor setupActors Function
Update `api/service/Rules.ts`:

```typescript
import * as ActorPlacement from './ActorPlacement';

export async function setupActors(game: Game, playerId: number) {
    const world = await store.read<World>(store.keys.worlds, game.worldId);
    const existingActorObjects = await Promise.all(
        world.actorIds.map(id => store.read<Actor>(store.keys.actors, id))
    );

    // Get existing player spawn positions
    const existingPlayerPositions: GridPosition[] = [];
    const playerActorGroups = groupActorsByPlayer(existingActorObjects);
    for (const playerGroup of Object.values(playerActorGroups)) {
        if (playerGroup.length > 0) {
            // Use first actor position as reference
            existingPlayerPositions.push(playerGroup[0].pos);
        }
    }

    // Determine preferred spawn zone based on player count and order
    const playerIndex = existingPlayerPositions.length;
    const worldSize = { width: world.terrain.length, height: world.terrain[0].length };
    const zones = ActorPlacement.getSpawnZonesForPlayerCount(
        game.maxPlayers || 4,
        worldSize
    );
    const preferredZone = zones[playerIndex] || undefined;

    // Find optimal position
    const spawnPos = await ActorPlacement.findOptimalSpawnPosition(
        world.terrain,
        existingActorObjects,
        existingPlayerPositions,
        preferredZone
    );

    if (!spawnPos) {
        logger.error(`Actor placement: could not find suitable position for player ${playerId}`);
        return [];
    }

    logger.info(`Actor placement: Player ${playerId} spawning at (${spawnPos.x}, ${spawnPos.y})`);

    // Create actors in 3x3 grid
    const defaultWeapon = getDefaultWeapon();
    const newActorsData: Omit<Actor, 'id'>[] = [];

    for (let i = 0; i < 9; i++) {
        newActorsData.push({
            owner: playerId,
            pos: {
                x: spawnPos.x + Math.floor(i / 3),
                y: spawnPos.y + (i % 3)
            },
            health: 100,
            state: ActorState.ALIVE,
            weapon: defaultWeapon
        });
    }

    const createdActorIds = await Promise.all(
        newActorsData.map(actorData => store.create(store.keys.actors, actorData))
    );

    return createdActorIds;
}

function groupActorsByPlayer(actors: Actor[]): Record<number, Actor[]> {
    return actors.reduce((groups, actor) => {
        if (!groups[actor.owner]) {
            groups[actor.owner] = [];
        }
        groups[actor.owner].push(actor);
        return groups;
    }, {} as Record<number, Actor[]>);
}
```

### Phase 4: Testing (2-3 hours)

#### 4.1 Unit Tests
Create `api/test/ActorPlacement.test.ts`:

```typescript
import { expect } from 'chai';
import * as ActorPlacement from '../service/ActorPlacement';
import { Terrain, Actor, ActorState } from '../service/Models';
import { getDefaultWeapon } from '../config/WeaponsConfig';

describe('ActorPlacement', () => {
    const createEmptyTerrain = (width: number, height: number): Terrain[][] => {
        return Array(width).fill(null).map(() =>
            Array(height).fill(Terrain.EMPTY)
        );
    };

    describe('getSpawnZonesForPlayerCount', () => {
        it('should return 2 opposite zones for 2 players', () => {
            const zones = ActorPlacement.getSpawnZonesForPlayerCount(2, { width: 20, height: 20 });
            expect(zones).to.have.length(2);
            expect(zones[0].name).to.equal('NW');
            expect(zones[1].name).to.equal('SE');
        });

        it('should return 4 corner zones for 4 players', () => {
            const zones = ActorPlacement.getSpawnZonesForPlayerCount(4, { width: 20, height: 20 });
            expect(zones).to.have.length(4);
        });

        it('should distribute 8 players around perimeter', () => {
            const zones = ActorPlacement.getSpawnZonesForPlayerCount(8, { width: 20, height: 20 });
            expect(zones).to.have.length(8);
        });
    });

    describe('isValidSpawnArea', () => {
        it('should return true for empty area', () => {
            const terrain = createEmptyTerrain(20, 20);
            const valid = ActorPlacement.isValidSpawnArea(5, 5, 3, terrain, []);
            expect(valid).to.be.true;
        });

        it('should return false for area with blocked terrain', () => {
            const terrain = createEmptyTerrain(20, 20);
            terrain[6][6] = Terrain.BLOCKED;
            const valid = ActorPlacement.isValidSpawnArea(5, 5, 3, terrain, []);
            expect(valid).to.be.false;
        });

        it('should return false for area with existing actors', () => {
            const terrain = createEmptyTerrain(20, 20);
            const actors: Actor[] = [{
                id: 1,
                pos: { x: 6, y: 6 },
                owner: 1,
                state: ActorState.ALIVE,
                health: 100,
                weapon: getDefaultWeapon()
            }];
            const valid = ActorPlacement.isValidSpawnArea(5, 5, 3, terrain, actors);
            expect(valid).to.be.false;
        });

        it('should return false for out-of-bounds area', () => {
            const terrain = createEmptyTerrain(20, 20);
            const valid = ActorPlacement.isValidSpawnArea(18, 18, 3, terrain, []);
            expect(valid).to.be.false;
        });
    });

    describe('findOptimalSpawnPosition', () => {
        it('should find a position in empty terrain', async () => {
            const terrain = createEmptyTerrain(20, 20);
            const pos = await ActorPlacement.findOptimalSpawnPosition(terrain, [], []);
            expect(pos).to.not.be.null;
            expect(pos.x).to.be.gte(0);
            expect(pos.y).to.be.gte(0);
        });

        it('should maximize distance from existing players', async () => {
            const terrain = createEmptyTerrain(20, 20);
            const existingPlayerPos = [{ x: 2, y: 2 }];
            const pos = await ActorPlacement.findOptimalSpawnPosition(
                terrain,
                [],
                existingPlayerPos
            );

            expect(pos).to.not.be.null;
            const distance = Math.sqrt(
                Math.pow(pos.x - 2, 2) + Math.pow(pos.y - 2, 2)
            );
            expect(distance).to.be.gt(10); // Should be far from existing player
        });

        it('should respect preferred zone', async () => {
            const terrain = createEmptyTerrain(20, 20);
            const preferredZone = { name: 'SE', centerX: 15, centerY: 15, priority: 10 };
            const pos = await ActorPlacement.findOptimalSpawnPosition(
                terrain,
                [],
                [],
                preferredZone
            );

            expect(pos).to.not.be.null;
            // Position should be near preferred zone
            expect(pos.x).to.be.gte(10);
            expect(pos.y).to.be.gte(10);
        });
    });
});
```

#### 4.2 Integration Tests
Add to `api/test/GameLifecycleService.test.ts`:

```typescript
describe('Actor Placement Integration', () => {
    it('should spawn 4 players in different corners', async () => {
        const game = await GameLifecycleService.createGame(4);
        const players = [];

        for (let i = 0; i < 4; i++) {
            const player = await GameLifecycleService.joinGame(
                game.gameId,
                `player${i}`,
                `session${i}`
            );
            players.push(player);
        }

        // Verify all players have actors
        for (const player of players) {
            expect(player.world.actors).to.have.length.gte(9);
        }

        // Verify players are far apart
        for (let i = 0; i < players.length; i++) {
            for (let j = i + 1; j < players.length; j++) {
                const p1Pos = players[i].world.actors[0].pos;
                const p2Pos = players[j].world.actors[0].pos;
                const distance = Math.sqrt(
                    Math.pow(p1Pos.x - p2Pos.x, 2) +
                    Math.pow(p1Pos.y - p2Pos.y, 2)
                );
                expect(distance).to.be.gt(8); // Should be far apart
            }
        }
    });

    it('should handle terrain constraints', async () => {
        // Test with a world that has lots of blocked terrain
        // Verify actors still spawn on valid terrain
    });
});
```

### Phase 5: Documentation (1 hour)

#### 5.1 Code Documentation
Add JSDoc comments to all public functions in `ActorPlacement.ts`.

#### 5.2 Update Architecture Documentation
Document the new spawn system in `ARCHITECTURE.md` or similar.

## 6. Success Metrics

- [ ] All players spawn on valid (EMPTY) terrain
- [ ] Players are well-distributed (minimum distance maintained)
- [ ] Spawn positions are fair and balanced
- [ ] 2-player games spawn at opposite corners
- [ ] 4-player games spawn at four corners
- [ ] 5-8 player games distributed around perimeter
- [ ] All existing tests pass
- [ ] New unit tests achieve >90% coverage
- [ ] Integration tests verify multi-player spawning
- [ ] Performance acceptable (<100ms for spawn calculation)

## 7. Timeline Estimate

- **Phase 1 (Analysis)**: 1-2 hours
- **Phase 2 (Core Algorithm)**: 3-4 hours
- **Phase 3 (Integration)**: 2 hours
- **Phase 4 (Testing)**: 2-3 hours
- **Phase 5 (Documentation)**: 1 hour

**Total Estimated Time**: 9-12 hours over 2 development sessions

## 8. Dependencies

None - this task is ready to start.

## 9. Risks and Considerations

### Algorithm Complexity
Scoring all positions could be slow. Mitigation:
- Search only in preferred zone first
- Limit search radius
- Cache terrain analysis

### Edge Cases
Some maps might not have enough valid spawn locations. Mitigation:
- Graceful fallback to less optimal positions
- Error reporting if truly impossible
- Consider adjusting MAX_PLAYERS based on terrain

### Randomness vs Fairness
Balance between predictability and variety. Mitigation:
- Use zones for structure
- Add small random offset within zone
- Document spawn patterns

## 10. Post-Implementation

After completing this task:
1. **Monitor**: Watch for any spawn issues in games
2. **Tune**: Adjust scoring weights based on gameplay
3. **Extend**: Consider adding spawn customization per game mode
4. **Future**: Could add configurable spawn strategies

This provides foundation for:
- Fair multiplayer matches
- Strategic starting positions
- Better game balance
- Terrain-aware spawning
