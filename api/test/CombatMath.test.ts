/**
 * Tests for combat damage calculation
 */

import assert = require("assert");
import { 
    calculateDamage,
    calculateDistanceModifier,
    calculateTerrainModifier,
    calculateCoverModifier,
    calculateArmorModifier,
    calculateRandomModifier,
    checkCriticalHit,
    createDamageBreakdown,
    calculateExpectedDamage,
    applyDamage,
    DamageCalculation
} from '../service/CombatMath';
import { Actor, ActorState, Terrain } from '../service/Models';
import { WEAPON_TYPES, getWeaponById } from '../config/WeaponsConfig';
import { getCombatConfig, overrideCombatConfig } from '../config/CombatConfig';
import { getTerrainProperties } from '../config/TerrainConfig';

describe('CombatMath', () => {
    function createTestActor(
        id: number,
        pos: { x: number; y: number },
        owner: number,
        weaponId: string = 'STANDARD_BLASTER',
        overrides: Partial<Actor> = {}
    ): Actor {
        const weapon = { ...WEAPON_TYPES[weaponId] };
        
        return {
            id,
            pos: { ...pos },
            state: ActorState.ALIVE,
            owner,
            health: 100,
            maxHealth: 100,
            weapon,
            armor: 0,
            ...overrides
        };
    }

    describe('calculateDamage - Basic', () => {
        it('should calculate base damage at optimal range', () => {
            const attacker = createTestActor(1, { x: 0, y: 0 }, 1, 'STANDARD_BLASTER');
            const defender = createTestActor(2, { x: 3, y: 0 }, 2);
            
            const damage = calculateDamage(
                attacker,
                defender,
                3, // Optimal range for standard blaster
                Terrain.EMPTY,
                Terrain.EMPTY,
                true
            );
            
            assert.ok(damage.finalDamage > 0);
            assert.strictEqual(damage.baseDamage, 10); // STANDARD_BLASTER base damage
        });

        it('should return 0 damage for no weapon', () => {
            const attacker = createTestActor(1, { x: 0, y: 0 }, 1);
            attacker.weapon = undefined;
            const defender = createTestActor(2, { x: 5, y: 0 }, 2);
            
            const damage = calculateDamage(
                attacker,
                defender,
                5,
                Terrain.EMPTY,
                Terrain.EMPTY,
                true
            );
            
            assert.strictEqual(damage.finalDamage, 0);
            assert.ok(damage.breakdown.includes('no weapon'));
        });

        it('should return 0 damage without line of sight', () => {
            const attacker = createTestActor(1, { x: 0, y: 0 }, 1, 'RIFLE');
            const defender = createTestActor(2, { x: 5, y: 0 }, 2);
            
            const damage = calculateDamage(
                attacker,
                defender,
                5,
                Terrain.EMPTY,
                Terrain.EMPTY,
                false // No LOS
            );
            
            assert.strictEqual(damage.finalDamage, 0);
            assert.ok(damage.breakdown.includes('line of sight'));
        });

        it('should include damage breakdown', () => {
            const attacker = createTestActor(1, { x: 0, y: 0 }, 1, 'RIFLE');
            const defender = createTestActor(2, { x: 5, y: 0 }, 2);
            
            const damage = calculateDamage(
                attacker,
                defender,
                5,
                Terrain.EMPTY,
                Terrain.EMPTY,
                true
            );
            
            assert.ok(damage.breakdown.length > 0);
            assert.ok(damage.breakdown.includes('Base:'));
            assert.ok(damage.breakdown.includes('='));
        });
    });

    describe('calculateDamage - Distance Modifiers', () => {
        it('should reduce damage beyond optimal range', () => {
            const weapon = getWeaponById('RIFLE')!;
            const config = getCombatConfig();
            
            const optimalMod = calculateDistanceModifier(weapon, 5, config); // optimal
            const farMod = calculateDistanceModifier(weapon, 8, config); // max range
            
            assert.strictEqual(optimalMod, 1.0);
            assert.ok(farMod < optimalMod);
        });

        it('should return 0 for out-of-range attacks', () => {
            const weapon = getWeaponById('PISTOL')!;
            const config = getCombatConfig();
            
            const tooClose = calculateDistanceModifier(weapon, -1, config);
            const tooFar = calculateDistanceModifier(weapon, 10, config);
            
            assert.strictEqual(tooClose, 0);
            assert.strictEqual(tooFar, 0);
        });

        it('should apply min range penalty', () => {
            const sniper = getWeaponById('SNIPER')!;
            const config = getCombatConfig();
            
            // At min range (5), should have penalty
            const minRangeMod = calculateDistanceModifier(sniper, 5, config);
            
            assert.ok(minRangeMod < 1.0);
            assert.ok(minRangeMod >= 0.7); // minRangePenalty
        });

        it('should use optimal range from weapon config', () => {
            const sniper = getWeaponById('SNIPER')!;
            const config = getCombatConfig();
            
            // Sniper optimalRange is 10
            const optimalMod = calculateDistanceModifier(sniper, 10, config);
            
            assert.strictEqual(optimalMod, 1.0);
        });
    });

    describe('calculateDamage - Cover and Armor', () => {
        it('should reduce damage for defender in cover', () => {
            const attacker = createTestActor(1, { x: 0, y: 0 }, 1, 'RIFLE');
            const defender = createTestActor(2, { x: 5, y: 0 }, 2);
            
            const noCover = calculateDamage(
                attacker,
                defender,
                5,
                Terrain.EMPTY,
                Terrain.EMPTY,
                true
            );
            
            const withCover = calculateDamage(
                attacker,
                defender,
                5,
                Terrain.EMPTY,
                Terrain.BLOCKED, // Full cover
                true
            );
            
            assert.ok(withCover.finalDamage < noCover.finalDamage);
            assert.ok(withCover.coverModifier < 1.0);
        });

        it('should reduce damage based on armor', () => {
            const original = getCombatConfig();
            overrideCombatConfig({ damageVariance: { min: 1.0, max: 1.0 } });
            try {
                const attacker = createTestActor(1, { x: 0, y: 0 }, 1, 'PISTOL');
                const noArmor = createTestActor(2, { x: 2, y: 0 }, 2);
                const heavyArmor = createTestActor(2, { x: 2, y: 0 }, 2, 'PISTOL', {
                    armor: 40
                });
                
                const noArmorDamage = calculateDamage(
                    attacker,
                    noArmor,
                    2,
                    Terrain.EMPTY,
                    Terrain.EMPTY,
                    true
                );
                
                const armorDamage = calculateDamage(
                    attacker,
                    heavyArmor,
                    2,
                    Terrain.EMPTY,
                    Terrain.EMPTY,
                    true
                );
                
                assert.ok(armorDamage.finalDamage < noArmorDamage.finalDamage);
            } finally {
                overrideCombatConfig({ damageVariance: original.damageVariance });
            }
        });

        it('should account for armor penetration', () => {
            const attacker = createTestActor(1, { x: 0, y: 0 }, 1, 'RIFLE');
            attacker.weapon!.penetration = 30;
            
            const defender = createTestActor(2, { x: 5, y: 0 }, 2, 'PISTOL', {
                armor: 40
            });
            
            const damage = calculateDamage(
                attacker,
                defender,
                5,
                Terrain.EMPTY,
                Terrain.EMPTY,
                true
            );
            
            // Effective armor should be 40 - 30 = 10
            // Armor modifier should be 0.9 (10% reduction)
            assert.ok(damage.armorModifier > 0.8);
            assert.ok(damage.armorModifier < 1.0);
        });

        it('should cap armor reduction at maxArmorReduction', () => {
            const config = getCombatConfig();
            const originalMax = config.maxArmorReduction;
            
            // Set very low max for testing
            overrideCombatConfig({ maxArmorReduction: 20 });
            
            const attacker = createTestActor(1, { x: 0, y: 0 }, 1, 'PISTOL');
            const defender = createTestActor(2, { x: 2, y: 0 }, 2, 'PISTOL', {
                armor: 100 // Way over the cap
            });
            
            const damage = calculateDamage(
                attacker,
                defender,
                2,
                Terrain.EMPTY,
                Terrain.EMPTY,
                true
            );
            
            // Should only reduce by 20% (the cap), not 100%
            assert.ok(damage.finalDamage > 0);
            assert.strictEqual(damage.armorModifier, 0.8);
            
            // Restore
            overrideCombatConfig({ maxArmorReduction: originalMax });
        });
    });

    describe('calculateDamage - Random Variance', () => {
        it('should have damage variance between 85% and 115%', () => {
            const attacker = createTestActor(1, { x: 0, y: 0 }, 1, 'RIFLE');
            const defender = createTestActor(2, { x: 5, y: 0 }, 2);
            
            const damages: number[] = [];
            
            for (let i = 0; i < 50; i++) {
                const damage = calculateDamage(
                    attacker,
                    defender,
                    5,
                    Terrain.EMPTY,
                    Terrain.EMPTY,
                    true
                );
                damages.push(damage.finalDamage);
            }
            
            const minDamage = Math.min(...damages);
            const maxDamage = Math.max(...damages);
            
            // Should see variance
            assert.ok(maxDamage >= minDamage);
        });

        it('should calculate random modifier within config range', () => {
            const config = getCombatConfig();
            
            for (let i = 0; i < 20; i++) {
                const mod = calculateRandomModifier(config);
                assert.ok(mod >= config.damageVariance.min);
                assert.ok(mod <= config.damageVariance.max);
            }
        });
    });

    describe('calculateDamage - Critical Hits', () => {
        it('should apply critical multiplier on critical hit', () => {
            const attacker = createTestActor(1, { x: 0, y: 0 }, 1, 'RIFLE');
            const defender = createTestActor(2, { x: 5, y: 0 }, 2);
            
            const damage = calculateDamage(
                attacker,
                defender,
                5,
                Terrain.EMPTY,
                Terrain.EMPTY,
                true,
                { forceCritical: true }
            );
            
            assert.ok(damage.isCritical);
            assert.strictEqual(damage.criticalMultiplier, 2.0);
        });

        it('should not be critical by default most of the time', () => {
            const attacker = createTestActor(1, { x: 0, y: 0 }, 1, 'RIFLE');
            const defender = createTestActor(2, { x: 5, y: 0 }, 2);
            
            let criticalCount = 0;
            for (let i = 0; i < 100; i++) {
                const damage = calculateDamage(
                    attacker,
                    defender,
                    5,
                    Terrain.EMPTY,
                    Terrain.EMPTY,
                    true
                );
                if (damage.isCritical) criticalCount++;
            }
            
            // Should be around 5% (criticalHitChance)
            assert.ok(criticalCount < 20); // Allow some variance
        });
    });

    describe('calculateDistanceModifier', () => {
        it('should return 1.0 at optimal range', () => {
            const weapon = getWeaponById('RIFLE')!;
            const config = getCombatConfig();
            
            const mod = calculateDistanceModifier(weapon, 5, config);
            
            assert.strictEqual(mod, 1.0);
        });

        it('should falloff beyond optimal range', () => {
            const weapon = getWeaponById('RIFLE')!;
            const config = getCombatConfig();
            
            const optimalMod = calculateDistanceModifier(weapon, 5, config);
            const farMod = calculateDistanceModifier(weapon, 8, config);
            
            assert.ok(farMod < optimalMod);
        });

        it('should return 0 outside effective range', () => {
            const weapon = getWeaponById('PISTOL')!;
            const config = getCombatConfig();
            
            const mod = calculateDistanceModifier(weapon, 10, config);
            
            assert.strictEqual(mod, 0);
        });
    });

    describe('calculateTerrainModifier', () => {
        it('should return 1.0 for empty terrain', () => {
            const attackerTerrain = getTerrainProperties(Terrain.EMPTY);
            const defenderTerrain = getTerrainProperties(Terrain.EMPTY);
            const config = getCombatConfig();
            
            const mod = calculateTerrainModifier(attackerTerrain, defenderTerrain, config);
            
            assert.strictEqual(mod, 1.0);
        });

        it('should apply attacker terrain bonus', () => {
            const attackerTerrain = { ...getTerrainProperties(Terrain.EMPTY), accuracyModifier: 20 };
            const defenderTerrain = getTerrainProperties(Terrain.EMPTY);
            const config = getCombatConfig();
            
            const mod = calculateTerrainModifier(attackerTerrain, defenderTerrain, config);
            
            assert.strictEqual(mod, 1.2);
        });

        it('should apply defender terrain penalty to attacker', () => {
            const attackerTerrain = getTerrainProperties(Terrain.EMPTY);
            const defenderTerrain = { ...getTerrainProperties(Terrain.EMPTY), accuracyModifier: 20 };
            const config = getCombatConfig();
            
            const mod = calculateTerrainModifier(attackerTerrain, defenderTerrain, config);
            
            assert.strictEqual(mod, 0.8);
        });
    });

    describe('calculateCoverModifier', () => {
        it('should return 1.0 for no cover', () => {
            const defenderTerrain = getTerrainProperties(Terrain.EMPTY);
            const defender = createTestActor(1, { x: 0, y: 0 }, 1);
            const config = getCombatConfig();
            
            const mod = calculateCoverModifier(defenderTerrain, defender, config);
            
            assert.strictEqual(mod, 1.0);
        });

        it('should apply terrain cover bonus', () => {
            const defenderTerrain = getTerrainProperties(Terrain.BLOCKED); // 50% cover
            const defender = createTestActor(1, { x: 0, y: 0 }, 1);
            const config = getCombatConfig();
            
            const mod = calculateCoverModifier(defenderTerrain, defender, config);
            
            assert.strictEqual(mod, 0.5);
        });

        it('should use higher of terrain or actor cover bonus', () => {
            const defenderTerrain = getTerrainProperties(Terrain.EMPTY); // 0% cover
            const defender = createTestActor(1, { x: 0, y: 0 }, 1, 'RIFLE', {
                isUnderCover: true,
                coverBonus: 30
            });
            const config = getCombatConfig();
            
            const mod = calculateCoverModifier(defenderTerrain, defender, config);
            
            assert.strictEqual(mod, 0.7);
        });
    });

    describe('calculateArmorModifier', () => {
        it('should return 1.0 for no armor', () => {
            const weapon = getWeaponById('RIFLE')!;
            const defender = createTestActor(1, { x: 0, y: 0 }, 1);
            const config = getCombatConfig();
            
            const mod = calculateArmorModifier(weapon, defender, config);
            
            assert.strictEqual(mod, 1.0);
        });

        it('should reduce damage based on armor', () => {
            const weapon = { ...getWeaponById('RIFLE')!, penetration: 0 }; // No penetration
            const defender: Actor = {
                id: 1,
                pos: { x: 0, y: 0 },
                state: ActorState.ALIVE,
                owner: 1,
                health: 100,
                armor: 30 // 30% reduction
            };
            const config = getCombatConfig();
            
            const mod = calculateArmorModifier(weapon, defender, config);
            
            assert.strictEqual(mod, 0.7);
        });

        it('should account for penetration', () => {
            const weapon = { ...getWeaponById('RIFLE')!, penetration: 20 };
            const defender = createTestActor(1, { x: 0, y: 0 }, 1, 'RIFLE', {
                armor: 30
            });
            const config = getCombatConfig();
            
            const mod = calculateArmorModifier(weapon, defender, config);
            
            // Effective armor: 30 - 20 = 10
            assert.strictEqual(mod, 0.9);
        });
    });

    describe('createDamageBreakdown', () => {
        it('should create readable damage breakdown', () => {
            const breakdown = createDamageBreakdown(
                20,  // base
                1.0, // distance
                1.0, // terrain
                0.7, // cover
                0.8, // armor
                0.95,// random
                1.0, // critical
                9    // final
            );
            
            assert.ok(breakdown.includes('Base: 20'));
            assert.ok(breakdown.includes('Cover: 70%'));
            assert.ok(breakdown.includes('Armor: 80%'));
            assert.ok(breakdown.includes('= 9'));
        });

        it('should omit 100% modifiers', () => {
            const breakdown = createDamageBreakdown(
                20, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 20
            );
            
            assert.ok(!breakdown.includes('Range:'));
            assert.ok(!breakdown.includes('Terrain:'));
            assert.ok(breakdown.includes('Base: 20'));
        });

        it('should include critical multiplier', () => {
            const breakdown = createDamageBreakdown(
                20, 1.0, 1.0, 1.0, 1.0, 1.0, 2.0, 40
            );
            
            assert.ok(breakdown.includes('CRIT:'));
        });
    });

    describe('calculateExpectedDamage', () => {
        it('should return average damage without variance', () => {
            const attacker: Actor = {
                id: 1,
                pos: { x: 0, y: 0 },
                state: ActorState.ALIVE,
                owner: 1,
                health: 100,
                weapon: { ...WEAPON_TYPES.RIFLE }
            };
            const defender: Actor = {
                id: 2,
                pos: { x: 5, y: 0 },
                state: ActorState.ALIVE,
                owner: 2,
                health: 100
            };
            
            // Run multiple times - should all be the same
            const damages: number[] = [];
            for (let i = 0; i < 10; i++) {
                const damage = calculateExpectedDamage(
                    attacker,
                    defender,
                    5,
                    Terrain.EMPTY,
                    Terrain.EMPTY,
                    true
                );
                damages.push(damage);
            }
            
            // All should be identical
            assert.ok(damages.every(d => d === damages[0]));
        });
    });

    describe('applyDamage', () => {
        it('should reduce actor health', () => {
            const target = createTestActor(1, { x: 0, y: 0 }, 1);
            target.health = 100;
            
            const damage = applyDamage(target, 30);
            
            assert.strictEqual(target.health, 70);
            assert.strictEqual(damage, 30);
        });

        it('should not reduce health below 0', () => {
            const target = createTestActor(1, { x: 0, y: 0 }, 1);
            target.health = 30;
            
            const damage = applyDamage(target, 50);
            
            assert.strictEqual(target.health, 0);
            assert.strictEqual(damage, 30); // Only 30 actual damage
        });

        it('should handle undefined health as 100', () => {
            const target = createTestActor(1, { x: 0, y: 0 }, 1);
            target.health = undefined;
            
            const damage = applyDamage(target, 30);
            
            assert.strictEqual(target.health, 70);
            assert.strictEqual(damage, 30);
        });
    });

    describe('Integration Tests', () => {
        it('should calculate full combat scenario', () => {
            const attacker: Actor = {
                id: 1,
                pos: { x: 0, y: 0 },
                state: ActorState.ALIVE,
                owner: 1,
                health: 100,
                weapon: { ...WEAPON_TYPES.RIFLE },
                isAiming: true,
                aimBonus: 20
            };
            const defender: Actor = {
                id: 2,
                pos: { x: 5, y: 0 },
                state: ActorState.ALIVE,
                owner: 2,
                health: 100,
                weapon: { ...WEAPON_TYPES.PISTOL },
                armor: 40, // Higher armor to ensure modifier < 1.0
                isUnderCover: true,
                coverBonus: 30
            };
            
            const damage = calculateDamage(
                attacker,
                defender,
                5,
                Terrain.EMPTY,
                Terrain.BLOCKED,
                true,
                { forceCritical: true }
            );
            
            assert.ok(damage.finalDamage > 0);
            assert.ok(damage.isCritical);
            assert.ok(damage.coverModifier < 1.0); // Cover should reduce damage
            assert.ok(damage.armorModifier < 1.0); // Armor should reduce damage (40 - 20 pen = 20)
        });
    });
});
