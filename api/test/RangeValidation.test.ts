/**
 * Tests for weapon range validation
 */

import assert = require("assert");
import { 
    isTargetInRange, 
    canAttackTarget,
    validateAttack,
    getValidTargets,
    getPositionsInRange,
    getRangeInfo
} from '../service/RangeValidation';
import {
    calculateHexDistance,
    gridPositionToHex,
    hexToGridPosition
} from '../service/HexGrid';
import { Actor, ActorState, Terrain, World } from '../service/Models';
import { WEAPON_TYPES, getWeaponById } from '../config/WeaponsConfig';

describe('RangeValidation', () => {
    describe('gridPositionToHex and hexToGridPosition', () => {
        it('should convert grid position to hex and back', () => {
            const gridPos = { x: 5, y: 3 };
            const hex = gridPositionToHex(gridPos);
            const back = hexToGridPosition(hex);
            
            assert.strictEqual(back.x, gridPos.x);
            assert.strictEqual(back.y, gridPos.y);
        });

        it('should handle origin position', () => {
            const gridPos = { x: 0, y: 0 };
            const hex = gridPositionToHex(gridPos);
            const back = hexToGridPosition(hex);
            
            assert.strictEqual(back.x, 0);
            assert.strictEqual(back.y, 0);
        });
    });

    describe('calculateHexDistance', () => {
        it('should return 0 for same position', () => {
            const pos = { x: 5, y: 5 };
            const distance = calculateHexDistance(pos, pos);
            assert.strictEqual(distance, 0);
        });

        it('should return 1 for adjacent hex', () => {
            const pos1 = { x: 5, y: 5 };
            const pos2 = { x: 6, y: 5 };
            const distance = calculateHexDistance(pos1, pos2);
            assert.strictEqual(distance, 1);
        });

        it('should be symmetric', () => {
            const pos1 = { x: 2, y: 7 };
            const pos2 = { x: 8, y: 3 };
            const dist1 = calculateHexDistance(pos1, pos2);
            const dist2 = calculateHexDistance(pos2, pos1);
            assert.strictEqual(dist1, dist2);
        });

        it('should calculate correct diagonal distance', () => {
            const pos1 = { x: 0, y: 0 };
            const pos2 = { x: 3, y: 3 };
            const distance = calculateHexDistance(pos1, pos2);
            assert.ok(distance >= 3);
        });
    });

    describe('isTargetInRange', () => {
        const rifle = getWeaponById('RIFLE')!;
        const pistol = getWeaponById('PISTOL')!;
        const sniper = getWeaponById('SNIPER')!;

        it('should return true for target at optimal range', () => {
            const result = isTargetInRange(
                { x: 0, y: 0 },
                { x: 5, y: 0 },
                rifle
            );
            assert.ok(result.inRange);
            assert.strictEqual(result.distance, 5);
        });

        it('should return false for target too close (min range)', () => {
            const result = isTargetInRange(
                { x: 0, y: 0 },
                { x: 2, y: 0 },
                sniper // minRange: 5
            );
            assert.ok(!result.inRange);
            assert.ok(result.tooClose);
            assert.ok(result.reason?.includes('too close'));
        });

        it('should return false for target too far (max range)', () => {
            const result = isTargetInRange(
                { x: 0, y: 0 },
                { x: 10, y: 0 },
                pistol // maxRange: 3
            );
            assert.ok(!result.inRange);
            assert.ok(result.tooFar);
            assert.ok(result.reason?.includes('too far'));
        });

        it('should handle melee weapons (minRange: 0)', () => {
            const melee = getWeaponById('MELEE')!;
            
            const adjacent = isTargetInRange(
                { x: 0, y: 0 },
                { x: 1, y: 0 },
                melee
            );
            assert.ok(adjacent.inRange);

            const samePosition = isTargetInRange(
                { x: 0, y: 0 },
                { x: 0, y: 0 },
                melee
            );
            assert.ok(samePosition.inRange);
        });

        it('should work at edge of range', () => {
            const atMaxRange = isTargetInRange(
                { x: 0, y: 0 },
                { x: 3, y: 0 },
                pistol
            );
            assert.ok(atMaxRange.inRange);

            const justBeyondMax = isTargetInRange(
                { x: 0, y: 0 },
                { x: 4, y: 0 },
                pistol
            );
            assert.ok(!justBeyondMax.inRange);
            assert.ok(justBeyondMax.tooFar);
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

            const canAttack = canAttackTarget(attacker, target);
            assert.ok(canAttack);
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

            const canAttack = canAttackTarget(attacker, target);
            assert.ok(!canAttack);
        });

        it('should return false for out-of-range target', () => {
            const attacker: Actor = {
                id: 1,
                pos: { x: 0, y: 0 },
                state: ActorState.ALIVE,
                owner: 1,
                health: 100,
                weapon: { ...WEAPON_TYPES.PISTOL }
            };

            const target: Actor = {
                id: 2,
                pos: { x: 15, y: 0 },
                state: ActorState.ALIVE,
                owner: 2,
                health: 100
            };

            const canAttack = canAttackTarget(attacker, target);
            assert.ok(!canAttack);
        });
    });

    describe('validateAttack', () => {
        function createEmptyWorld(): World {
            return {
                id: 1,
                terrain: Array(20).fill(null).map(() => Array(20).fill(Terrain.EMPTY)),
                actorIds: []
            };
        }

        it('should validate successful attack', async () => {
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

            const world = createEmptyWorld();
            const validation = await validateAttack(attacker, target, world);

            assert.ok(validation.valid);
            assert.ok(validation.inRange);
            assert.ok(validation.hasLineOfSight);
            assert.strictEqual(validation.errors.length, 0);
        });

        it('should fail validation for no weapon', async () => {
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

            const validation = await validateAttack(attacker, target, createEmptyWorld());

            assert.ok(!validation.valid);
            assert.ok(validation.errors.some(e => e.includes('no weapon')));
        });

        it('should fail validation for out of range', async () => {
            const attacker: Actor = {
                id: 1,
                pos: { x: 0, y: 0 },
                state: ActorState.ALIVE,
                owner: 1,
                health: 100,
                weapon: { ...WEAPON_TYPES.PISTOL }
            };

            const target: Actor = {
                id: 2,
                pos: { x: 15, y: 0 },
                state: ActorState.ALIVE,
                owner: 2,
                health: 100
            };

            const validation = await validateAttack(attacker, target, createEmptyWorld());

            assert.ok(!validation.valid);
            assert.ok(!validation.inRange);
            assert.ok(validation.errors.some(e => e.includes('too far')));
        });

        it('should fail validation for attacking own unit', async () => {
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
                owner: 1, // Same owner
                health: 100
            };

            const validation = await validateAttack(attacker, target, createEmptyWorld());

            assert.ok(!validation.valid);
            assert.ok(validation.errors.some(e => e.includes('own units')));
        });

        it('should fail validation for attacking dead target', async () => {
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
                state: ActorState.DEAD,
                owner: 2,
                health: 0
            };

            const validation = await validateAttack(attacker, target, createEmptyWorld());

            assert.ok(!validation.valid);
            assert.ok(validation.errors.some(e => e.includes('dead')));
        });

        it('should fail validation for self-attack', async () => {
            const attacker: Actor = {
                id: 1,
                pos: { x: 0, y: 0 },
                state: ActorState.ALIVE,
                owner: 1,
                health: 100,
                weapon: { ...WEAPON_TYPES.RIFLE }
            };

            const validation = await validateAttack(attacker, attacker, createEmptyWorld());

            assert.ok(!validation.valid);
            assert.ok(validation.errors.some(e => e.includes('self')));
        });
    });

    describe('getValidTargets', () => {
        async function createTestScenario() {
            const terrain = Array(20).fill(null).map(() => Array(20).fill(Terrain.EMPTY));
            
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
                pos: { x: 18, y: 5 },
                state: ActorState.ALIVE,
                owner: 2,
                health: 100
            };

            const friendly: Actor = {
                id: 4,
                pos: { x: 7, y: 5 },
                state: ActorState.ALIVE,
                owner: 1,
                health: 100
            };

            const deadEnemy: Actor = {
                id: 5,
                pos: { x: 6, y: 5 },
                state: ActorState.DEAD,
                owner: 2,
                health: 0
            };

            const allActors = [attacker, inRangeEnemy, outOfRangeEnemy, friendly, deadEnemy];

            return { attacker, allActors, terrain };
        }

        it('should return only valid targets', async () => {
            const { attacker, allActors, terrain } = await createTestScenario();
            
            const targets = await getValidTargets(attacker, allActors, terrain);
            
            assert.strictEqual(targets.length, 1);
            assert.strictEqual(targets[0].id, 2); // Only inRangeEnemy
        });

        it('should exclude dead actors', async () => {
            const { attacker, allActors, terrain } = await createTestScenario();
            
            const targets = await getValidTargets(attacker, allActors, terrain);
            
            assert.ok(!targets.some(t => t.state === ActorState.DEAD));
        });

        it('should exclude friendly units', async () => {
            const { attacker, allActors, terrain } = await createTestScenario();
            
            const targets = await getValidTargets(attacker, allActors, terrain);
            
            assert.ok(!targets.some(t => t.owner === attacker.owner));
        });

        it('should return empty array for actor without weapon', async () => {
            const { attacker, allActors, terrain } = await createTestScenario();
            attacker.weapon = undefined;
            
            const targets = await getValidTargets(attacker, allActors, terrain);
            
            assert.strictEqual(targets.length, 0);
        });
    });

    describe('getPositionsInRange', () => {
        it('should return all positions in weapon range', () => {
            const centerPos = { x: 10, y: 10 };
            const weapon = getWeaponById('PISTOL')!; // Range 0-3

            const positions = getPositionsInRange(
                centerPos,
                weapon,
                { width: 20, height: 20 }
            );

            assert.ok(positions.length > 0);

            // All positions should be within range
            positions.forEach(pos => {
                const distance = calculateHexDistance(centerPos, pos);
                assert.ok(distance >= weapon.minRange);
                assert.ok(distance <= weapon.maxRange);
            });
        });

        it('should handle edge of map', () => {
            const cornerPos = { x: 0, y: 0 };
            const weapon = getWeaponById('PISTOL')!;

            const positions = getPositionsInRange(
                cornerPos,
                weapon,
                { width: 20, height: 20 }
            );

            // Should only return positions within map bounds
            positions.forEach(pos => {
                assert.ok(pos.x >= 0 && pos.x < 20);
                assert.ok(pos.y >= 0 && pos.y < 20);
            });
        });
    });

    describe('getRangeInfo', () => {
        it('should return correct range info', () => {
            const rifle = getWeaponById('RIFLE')!;
            const info = getRangeInfo(rifle);

            assert.strictEqual(info.minRange, 1);
            assert.strictEqual(info.maxRange, 8);
            assert.strictEqual(info.optimalRange, 5); // Default to midpoint
        });

        it('should use optimalRange if defined', () => {
            const weapon = { ...WEAPON_TYPES.SNIPER }; // optimalRange: 10
            const info = getRangeInfo(weapon);

            assert.strictEqual(info.optimalRange, 10);
        });

        it('should include melee description for minRange 0', () => {
            const melee = getWeaponById('MELEE')!;
            const info = getRangeInfo(melee);

            assert.ok(info.description.includes('melee'));
        });

        it('should include long range description for maxRange >= 10', () => {
            const sniper = getWeaponById('SNIPER')!;
            const info = getRangeInfo(sniper);

            assert.ok(info.description.includes('long range'));
        });
    });
});
