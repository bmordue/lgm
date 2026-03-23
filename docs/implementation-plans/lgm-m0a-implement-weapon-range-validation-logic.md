# Implementation Plan: Implement Weapon Range Validation Logic

**Issue ID**: lgm-m0a
**Priority**: P2
**Type**: Task
**Depends On**: lgm-22y (Define weapon types and range characteristics) - ✅ CLOSED

## 1. Summary

Implement logic to determine if a target is within a weapon's effective range, including validation for minimum and maximum range constraints, hex-based distance calculation, and line-of-sight checks.

## 2. Problem

While weapon range characteristics are defined in `api/config/WeaponsConfig.ts`, there is no implemented logic to:

- **Validate Attack Range**: Check if target is within weapon's min/max range
- **Calculate Hex Distance**: Accurate distance on hexagonal grid
- **Prevent Invalid Attacks**: Block attacks outside effective range
- **Support Range UI**: Provide range info for frontend display
- **Integrate with Combat**: Use in attack order validation

### Current State
From `WeaponsConfig.ts`, weapons have:
```typescript
interface Weapon {
    minRange: number;  // Minimum range (0 for melee, 2+ for artillery)
    maxRange: number;  // Maximum range
    // ... other properties
}
```

But there's no validation logic using these properties.

### Related Code
- `api/service/Visibility.ts` - Has `hasLineOfSight` function
- `api/Hex.ts` - Hex coordinate system for distance
- `api/service/Rules.ts` - Would use this for attack validation
- `api/service/Models.ts` - Has OrderType.ATTACK defined

## 3. Proposed Solution

Implement a comprehensive weapon range validation system:

1. **Distance Calculation**: Hex distance between attacker and target
2. **Range Validation**: Check min/max range constraints
3. **Line-of-Sight**: Ensure no obstacles block attack
4. **Range Queries**: Get list of valid targets for a weapon
5. **Attack Validation**: Validate ATTACK orders use this logic

### Key Functions
```typescript
// Check if target is in range
isTargetInRange(attacker: Actor, target: Actor): boolean

// Get all valid targets for an actor
getValidTargets(actor: Actor, world: World): Actor[]

// Calculate actual hex distance
calculateHexDistance(pos1: GridPosition, pos2: GridPosition): number

// Validate an attack order
validateAttackOrder(attacker: Actor, target: Actor, world: World): ValidationResult
```

## 4. Implementation Plan

### Phase 1: Hex Distance Utilities (1-2 hours)

#### 1.1 Create Range Validation Utility
Create new file `api/service/RangeValidation.ts`:

```typescript
import { Actor, GridPosition, World, Weapon } from './Models';
import { Hex } from '../Hex';
import { hasLineOfSight } from './Visibility';

/**
 * Calculate the hex-grid distance between two positions
 * Uses cube coordinate system for accurate hex distance
 */
export function calculateHexDistance(pos1: GridPosition, pos2: GridPosition): number {
    const hex1 = gridPositionToHex(pos1);
    const hex2 = gridPositionToHex(pos2);
    return hex1.distance(hex2);
}

/**
 * Convert GridPosition to Hex coordinate (odd-q vertical layout)
 */
function gridPositionToHex(pos: GridPosition): Hex {
    // For odd-q vertical layout:
    // q = column (y coordinate)
    // r = row - (column - (column & 1)) / 2
    const q = pos.y;
    const r = pos.x - (pos.y - (pos.y & 1)) / 2;
    const s = -q - r;
    return new Hex(q, r, s);
}

/**
 * Convert Hex coordinate back to GridPosition
 */
export function hexToGridPosition(hex: Hex): GridPosition {
    const col = hex.q;
    const row = hex.r + (hex.q - (hex.q & 1)) / 2;
    return { x: row, y: col };
}
```

### Phase 2: Range Validation Functions (2-3 hours)

#### 2.1 Core Range Check
```typescript
export interface RangeCheckResult {
    inRange: boolean;
    distance: number;
    tooClose: boolean;
    tooFar: boolean;
    reason?: string;
}

/**
 * Check if a target is within weapon range
 */
export function isTargetInRange(
    attackerPos: GridPosition,
    targetPos: GridPosition,
    weapon: Weapon
): RangeCheckResult {
    const distance = calculateHexDistance(attackerPos, targetPos);

    // Check minimum range
    if (distance < weapon.minRange) {
        return {
            inRange: false,
            distance,
            tooClose: true,
            tooFar: false,
            reason: `Target too close (${distance} < ${weapon.minRange})`
        };
    }

    // Check maximum range
    if (distance > weapon.maxRange) {
        return {
            inRange: false,
            distance,
            tooClose: false,
            tooFar: true,
            reason: `Target too far (${distance} > ${weapon.maxRange})`
        };
    }

    return {
        inRange: true,
        distance,
        tooClose: false,
        tooFar: false
    };
}

/**
 * Simplified boolean check
 */
export function canAttackTarget(
    attacker: Actor,
    target: Actor
): boolean {
    if (!attacker.weapon) {
        return false;
    }

    const rangeCheck = isTargetInRange(
        attacker.pos,
        target.pos,
        attacker.weapon
    );

    return rangeCheck.inRange;
}
```

#### 2.2 Line-of-Sight Integration
```typescript
export interface AttackValidation {
    valid: boolean;
    inRange: boolean;
    hasLineOfSight: boolean;
    distance: number;
    errors: string[];
}

/**
 * Comprehensive attack validation
 * Checks range AND line of sight
 */
export async function validateAttack(
    attacker: Actor,
    target: Actor,
    world: World
): Promise<AttackValidation> {
    const errors: string[] = [];

    // Check weapon exists
    if (!attacker.weapon) {
        errors.push('Attacker has no weapon');
        return {
            valid: false,
            inRange: false,
            hasLineOfSight: false,
            distance: 0,
            errors
        };
    }

    // Check range
    const rangeCheck = isTargetInRange(
        attacker.pos,
        target.pos,
        attacker.weapon
    );

    if (!rangeCheck.inRange) {
        errors.push(rangeCheck.reason!);
    }

    // Check line of sight
    const los = await hasLineOfSight(
        attacker.pos,
        target.pos,
        world.terrain
    );

    if (!los) {
        errors.push('No line of sight to target');
    }

    // Check same owner (can't attack own units)
    if (attacker.owner === target.owner) {
        errors.push('Cannot attack own units');
    }

    return {
        valid: errors.length === 0,
        inRange: rangeCheck.inRange,
        hasLineOfSight: los,
        distance: rangeCheck.distance,
        errors
    };
}
```

### Phase 3: Target Selection Utilities (2-3 hours)

#### 3.1 Get Valid Targets
```typescript
/**
 * Get all actors that this actor can attack
 * Filters by range and line of sight
 */
export async function getValidTargets(
    actor: Actor,
    allActors: Actor[],
    terrain: Terrain[][]
): Promise<Actor[]> {
    if (!actor.weapon) {
        return [];
    }

    const validTargets: Actor[] = [];

    for (const target of allActors) {
        // Skip self and friendly units
        if (target.id === actor.id || target.owner === actor.owner) {
            continue;
        }

        // Skip dead actors
        if (target.state === ActorState.DEAD) {
            continue;
        }

        // Check range
        const rangeCheck = isTargetInRange(
            actor.pos,
            target.pos,
            actor.weapon
        );

        if (!rangeCheck.inRange) {
            continue;
        }

        // Check line of sight
        const los = await hasLineOfSight(
            actor.pos,
            target.pos,
            terrain
        );

        if (!los) {
            continue;
        }

        validTargets.push(target);
    }

    return validTargets;
}

/**
 * Get all positions within weapon range (for UI display)
 * Returns hexes that are in range, regardless of targets
 */
export function getPositionsInRange(
    centerPos: GridPosition,
    weapon: Weapon,
    worldSize: { width: number; height: number }
): GridPosition[] {
    const positions: GridPosition[] = [];

    // Iterate through all possible positions
    for (let x = 0; x < worldSize.width; x++) {
        for (let y = 0; y < worldSize.height; y++) {
            const pos = { x, y };
            const rangeCheck = isTargetInRange(centerPos, pos, weapon);

            if (rangeCheck.inRange) {
                positions.push(pos);
            }
        }
    }

    return positions;
}
```

### Phase 4: Integration with Attack Orders (2 hours)

#### 4.1 Update Attack Order Validation in Rules.ts
```typescript
// In api/service/Rules.ts

import * as RangeValidation from './RangeValidation';

/**
 * Validate and process attack orders
 */
export async function processAttackOrder(
    actorOrder: ActorOrders,
    actor: Actor,
    world: World,
    allActors: Actor[]
): Promise<AttackResult> {
    // Get target actor
    if (!actorOrder.targetId) {
        throw new Error('Attack order missing target ID');
    }

    const target = allActors.find(a => a.id === actorOrder.targetId);
    if (!target) {
        throw new Error(`Target actor ${actorOrder.targetId} not found`);
    }

    // Validate attack using range validation
    const validation = await RangeValidation.validateAttack(
        actor,
        target,
        world
    );

    if (!validation.valid) {
        throw new Error(`Invalid attack: ${validation.errors.join(', ')}`);
    }

    // Attack is valid - proceed with combat calculation
    // (actual damage calculation would be in lgm-sqo)
    return {
        success: true,
        distance: validation.distance,
        targetId: target.id
    };
}

interface AttackResult {
    success: boolean;
    distance: number;
    targetId: number;
    damageDealt?: number;  // Will be implemented in lgm-sqo
}
```

#### 4.2 Add Attack Order Processing
```typescript
// Update applyMovementOrders to handle ATTACK orders

export async function applyOrders(
    actorOrders: ActorOrders,
    game: Game,
    world: World,
    allActors: Actor[]
): Promise<Actor> {
    const actor = allActors.find(a => a.id === actorOrders.actorId);
    if (!actor) {
        throw new Error(`Actor ${actorOrders.actorId} not found`);
    }

    switch (actorOrders.orderType) {
        case OrderType.MOVE:
            return await applyMovementOrders(actorOrders, game, world, timestep, allActors);

        case OrderType.ATTACK:
            const attackResult = await processAttackOrder(
                actorOrders,
                actor,
                world,
                allActors
            );
            // For now, attacking doesn't move the actor
            // Damage would be applied in combat resolution (lgm-sqo)
            return actor;

        default:
            throw new Error(`Unknown order type: ${actorOrders.orderType}`);
    }
}
```

### Phase 5: API Endpoint Support (1-2 hours)

#### 5.1 Add Endpoint for Valid Targets
Update `api/spec/api.yml`:

```yaml
/games/{gameId}/actors/{actorId}/targets:
  get:
    summary: Get valid attack targets for an actor
    operationId: getValidTargets
    security:
      - bearerAuth: []
    x-exegesis-controller: GameController
    parameters:
    - name: gameId
      in: path
      required: true
      schema:
        type: integer
    - name: actorId
      in: path
      required: true
      schema:
        type: integer
    responses:
      "200":
        description: List of valid targets
        content:
          application/json:
            schema:
              type: object
              properties:
                targets:
                  type: array
                  items:
                    type: object
                    properties:
                      actorId:
                        type: integer
                      distance:
                        type: integer
                      canAttack:
                        type: boolean
```

#### 5.2 Implement Controller
In `api/controllers/GameController.ts`:

```typescript
module.exports.getValidTargets = async function getValidTargets(context: ExegesisContext) {
    const { gameId, actorId } = context.params.path;
    const playerId = context.user.playerId;

    // Get game and world
    const game = await store.read<Game>(store.keys.games, gameId);
    const world = await store.read<World>(store.keys.worlds, game.worldId);

    // Get actor and verify ownership
    const actor = await store.read<Actor>(store.keys.actors, actorId);
    if (actor.owner !== playerId) {
        context.res.status(403);
        return { message: 'Not your actor' };
    }

    // Get all actors
    const allActors = await Promise.all(
        world.actorIds.map(id => store.read<Actor>(store.keys.actors, id))
    );

    // Get valid targets
    const targets = await RangeValidation.getValidTargets(
        actor,
        allActors,
        world.terrain
    );

    return {
        targets: targets.map(t => ({
            actorId: t.id,
            distance: RangeValidation.calculateHexDistance(actor.pos, t.pos),
            canAttack: true
        }))
    };
};
```

### Phase 6: Testing (2-3 hours)

#### 6.1 Unit Tests
Create `api/test/RangeValidation.test.ts`:

```typescript
import { expect } from 'chai';
import * as RangeValidation from '../service/RangeValidation';
import { Actor, ActorState, Terrain, World } from '../service/Models';
import { WEAPON_TYPES } from '../config/WeaponsConfig';

describe('RangeValidation', () => {
    describe('calculateHexDistance', () => {
        it('should calculate distance 0 for same position', () => {
            const pos = { x: 5, y: 5 };
            const distance = RangeValidation.calculateHexDistance(pos, pos);
            expect(distance).to.equal(0);
        });

        it('should calculate distance 1 for adjacent hexes', () => {
            const pos1 = { x: 5, y: 5 };
            const pos2 = { x: 6, y: 5 };
            const distance = RangeValidation.calculateHexDistance(pos1, pos2);
            expect(distance).to.equal(1);
        });

        it('should calculate correct distances on hex grid', () => {
            const center = { x: 10, y: 10 };
            const far = { x: 15, y: 15 };
            const distance = RangeValidation.calculateHexDistance(center, far);
            expect(distance).to.be.gte(5);
        });
    });

    describe('isTargetInRange', () => {
        const weapon = { ...WEAPON_TYPES.RIFLE };  // minRange: 1, maxRange: 8

        it('should return true for target in range', () => {
            const result = RangeValidation.isTargetInRange(
                { x: 0, y: 0 },
                { x: 5, y: 0 },
                weapon
            );
            expect(result.inRange).to.be.true;
        });

        it('should return false for target too close', () => {
            const result = RangeValidation.isTargetInRange(
                { x: 0, y: 0 },
                { x: 0, y: 0 },  // Same position (distance 0)
                weapon
            );
            expect(result.inRange).to.be.false;
            expect(result.tooClose).to.be.true;
        });

        it('should return false for target too far', () => {
            const result = RangeValidation.isTargetInRange(
                { x: 0, y: 0 },
                { x: 15, y: 0 },  // Beyond maxRange
                weapon
            );
            expect(result.inRange).to.be.false;
            expect(result.tooFar).to.be.true;
        });
    });

    describe('canAttackTarget', () => {
        it('should return true for valid attack', () => {
            const attacker: Actor = {
                id: 1,
                pos: { x: 0, y: 0 },
                state: ActorState.ALIVE,
                owner: 1,
                health: 100,
                weapon: { ...WEAPON_TYPES.RIFLE }
            };

            const target: Actor = {
                id: 2,
                pos: { x: 5, y: 0 },
                state: ActorState.ALIVE,
                owner: 2,
                health: 100
            };

            const canAttack = RangeValidation.canAttackTarget(attacker, target);
            expect(canAttack).to.be.true;
        });

        it('should return false for actor without weapon', () => {
            const attacker: Actor = {
                id: 1,
                pos: { x: 0, y: 0 },
                state: ActorState.ALIVE,
                owner: 1,
                health: 100
                // No weapon
            };

            const target: Actor = {
                id: 2,
                pos: { x: 5, y: 0 },
                state: ActorState.ALIVE,
                owner: 2,
                health: 100
            };

            const canAttack = RangeValidation.canAttackTarget(attacker, target);
            expect(canAttack).to.be.false;
        });
    });

    describe('getValidTargets', () => {
        it('should return only enemies in range with LOS', async () => {
            const attacker: Actor = {
                id: 1,
                pos: { x: 5, y: 5 },
                state: ActorState.ALIVE,
                owner: 1,
                health: 100,
                weapon: { ...WEAPON_TYPES.RIFLE }
            };

            const inRangeEnemy: Actor = {
                id: 2,
                pos: { x: 8, y: 5 },
                state: ActorState.ALIVE,
                owner: 2,
                health: 100
            };

            const outOfRangeEnemy: Actor = {
                id: 3,
                pos: { x: 20, y: 5 },
                state: ActorState.ALIVE,
                owner: 2,
                health: 100
            };

            const friendly: Actor = {
                id: 4,
                pos: { x: 7, y: 5 },
                state: ActorState.ALIVE,
                owner: 1,  // Same owner
                health: 100
            };

            const allActors = [attacker, inRangeEnemy, outOfRangeEnemy, friendly];
            const terrain = createEmptyTerrain(20, 20);

            const targets = await RangeValidation.getValidTargets(
                attacker,
                allActors,
                terrain
            );

            expect(targets).to.have.length(1);
            expect(targets[0].id).to.equal(inRangeEnemy.id);
        });
    });

    describe('getPositionsInRange', () => {
        it('should return all positions in weapon range', () => {
            const centerPos = { x: 10, y: 10 };
            const weapon = { ...WEAPON_TYPES.PISTOL };  // Range 0-3

            const positions = RangeValidation.getPositionsInRange(
                centerPos,
                weapon,
                { width: 20, height: 20 }
            );

            expect(positions.length).to.be.gt(0);

            // All positions should be within range
            positions.forEach(pos => {
                const distance = RangeValidation.calculateHexDistance(centerPos, pos);
                expect(distance).to.be.lte(weapon.maxRange);
                expect(distance).to.be.gte(weapon.minRange);
            });
        });
    });
});

function createEmptyTerrain(width: number, height: number): Terrain[][] {
    return Array(width).fill(null).map(() =>
        Array(height).fill(Terrain.EMPTY)
    );
}
```

### Phase 7: Documentation (1 hour)

#### 7.1 Add JSDoc Comments
Document all public functions with:
- Purpose
- Parameters
- Return values
- Examples

#### 7.2 Create Usage Guide
Document in `docs/COMBAT_SYSTEM.md`:

```markdown
## Range Validation

### Checking if Target is in Range
[Example code]

### Getting Valid Targets
[Example code]

### Hex Distance Calculation
[How hex distance works]
```

## 5. Success Metrics

- [ ] Hex distance calculation implemented and tested
- [ ] Range validation considers min/max range
- [ ] Line-of-sight integration works
- [ ] Can get list of valid targets for any actor
- [ ] Attack orders validated using range check
- [ ] API endpoint provides target info to frontend
- [ ] All unit tests pass
- [ ] Integration with Rules.ts complete
- [ ] Documentation updated

## 6. Timeline Estimate

- **Phase 1 (Hex Distance)**: 1-2 hours
- **Phase 2 (Range Validation)**: 2-3 hours
- **Phase 3 (Target Selection)**: 2-3 hours
- **Phase 4 (Attack Integration)**: 2 hours
- **Phase 5 (API Endpoint)**: 1-2 hours
- **Phase 6 (Testing)**: 2-3 hours
- **Phase 7 (Documentation)**: 1 hour

**Total Estimated Time**: 11-16 hours over 2-3 development sessions

## 7. Dependencies

- ✅ lgm-22y (Define weapon types) - CLOSED
- Uses existing `Hex.ts` for distance calculation
- Uses existing `Visibility.ts` for line of sight

## 8. Risks and Considerations

### Hex Distance Accuracy
Must correctly handle odd-q coordinate system. Mitigation:
- Comprehensive unit tests
- Verify against known hex distances
- Use established Hex library

### Performance
Calculating all valid targets could be slow. Mitigation:
- Cache results when possible
- Limit world size
- Optimize distance calculation

### Integration Complexity
Needs to work with existing systems. Mitigation:
- Start with standalone utilities
- Add integration incrementally
- Test at each step

## 9. Post-Implementation

After completing this task:
1. **Use in Combat**: Integrate with lgm-sqo (damage calculation)
2. **Frontend**: Display range indicators on hex grid
3. **AI**: Use for computer opponent targeting
4. **Balance**: Tune weapon ranges based on gameplay

This provides foundation for:
- Valid attack processing
- UI range indicators
- Strategic gameplay
- Combat system (lgm-9u0)
