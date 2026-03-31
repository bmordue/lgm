/**
 * Tests for combat configuration files
 */

import assert = require("assert");
import { getCombatConfig, overrideCombatConfig, COMBAT_CONFIG } from '../config/CombatConfig';
import { getTerrainProperties, getTerrainByName, TERRAIN_PROPERTIES } from '../config/TerrainConfig';
import { Terrain, Weapon } from '../service/Models';
import { getWeaponById, getDefaultWeapon, WEAPON_TYPES, getWeaponDamage } from '../config/WeaponsConfig';

describe('Combat Configuration', () => {
    describe('CombatConfig', () => {
        it('should return a copy of the config', () => {
            const config1 = getCombatConfig();
            const config2 = getCombatConfig();
            
            assert.deepStrictEqual(config1, config2);
            assert.notStrictEqual(config1, config2); // Different references
        });

        it('should have valid damage variance', () => {
            const config = getCombatConfig();
            assert.ok(config.damageVariance.min < config.damageVariance.max);
            assert.ok(Math.abs(config.damageVariance.min - 0.85) < 0.01);
            assert.ok(Math.abs(config.damageVariance.max - 1.15) < 0.01);
        });

        it('should have valid critical hit settings', () => {
            const config = getCombatConfig();
            assert.ok(config.criticalHitChance > 0);
            assert.ok(config.criticalHitChance < 1);
            assert.ok(config.criticalHitMultiplier > 1);
        });

        it('should have valid armor reduction cap', () => {
            const config = getCombatConfig();
            assert.ok(config.maxArmorReduction > 0);
            assert.ok(config.maxArmorReduction <= 100);
        });

        it('should allow config overrides', () => {
            const originalMinDamage = COMBAT_CONFIG.minDamage;
            
            overrideCombatConfig({ minDamage: 5 });
            assert.strictEqual(COMBAT_CONFIG.minDamage, 5);
            
            // Restore original
            overrideCombatConfig({ minDamage: originalMinDamage });
        });
    });

    describe('TerrainConfig', () => {
        it('should return properties for all terrain types', () => {
            assert.ok(getTerrainProperties(Terrain.EMPTY));
            assert.ok(getTerrainProperties(Terrain.BLOCKED));
            assert.ok(getTerrainProperties(Terrain.UNEXPLORED));
        });

        it('should return correct properties for EMPTY terrain', () => {
            const props = getTerrainProperties(Terrain.EMPTY);
            assert.strictEqual(props.coverBonus, 0);
            assert.strictEqual(props.accuracyModifier, 0);
            assert.strictEqual(props.movementCost, 1);
            assert.strictEqual(props.blocksLineOfSight, false);
        });

        it('should return correct properties for BLOCKED terrain', () => {
            const props = getTerrainProperties(Terrain.BLOCKED);
            assert.strictEqual(props.coverBonus, 50);
            assert.strictEqual(props.blocksLineOfSight, true);
            assert.strictEqual(props.movementCost, Infinity);
        });

        it('should return default properties for invalid terrain', () => {
            // @ts-ignore - testing invalid input
            const props = getTerrainProperties(999);
            assert.deepStrictEqual(props, getTerrainProperties(Terrain.EMPTY));
        });

        it('should find terrain by name', () => {
            const emptyByName = getTerrainByName('Open Ground');
            const emptyByType = getTerrainProperties(Terrain.EMPTY);
            
            assert.ok(emptyByName);
            assert.strictEqual(emptyByName?.name, emptyByType.name);
        });

        it('should be case-insensitive for terrain name lookup', () => {
            const props1 = getTerrainByName('open ground');
            const props2 = getTerrainByName('OPEN GROUND');
            const props3 = getTerrainByName('Open Ground');
            
            assert.deepStrictEqual(props1, props2);
            assert.deepStrictEqual(props2, props3);
        });

        it('should return undefined for unknown terrain name', () => {
            const props = getTerrainByName('NonExistent Terrain');
            assert.strictEqual(props, undefined);
        });
    });

    describe('WeaponsConfig', () => {
        it('should have all weapon types defined', () => {
            assert.ok(WEAPON_TYPES.PISTOL);
            assert.ok(WEAPON_TYPES.RIFLE);
            assert.ok(WEAPON_TYPES.SNIPER);
            assert.ok(WEAPON_TYPES.SHOTGUN);
            assert.ok(WEAPON_TYPES.ROCKET_LAUNCHER);
            assert.ok(WEAPON_TYPES.MELEE);
            assert.ok(WEAPON_TYPES.STANDARD_BLASTER);
        });

        it('should get weapon by ID', () => {
            const rifle = getWeaponById('RIFLE');
            assert.ok(rifle);
            assert.strictEqual(rifle?.name, 'Assault Rifle');
            assert.strictEqual(rifle?.baseDamage, 20);
        });

        it('should return undefined for unknown weapon ID', () => {
            const weapon = getWeaponById('NONEXISTENT');
            assert.strictEqual(weapon, undefined);
        });

        it('should have valid weapon properties', () => {
            Object.values(WEAPON_TYPES).forEach(weapon => {
                assert.ok(weapon.baseDamage! > 0 || weapon.damage! > 0);
                assert.ok(weapon.minRange >= 0);
                assert.ok(weapon.maxRange >= weapon.minRange);
                assert.ok(weapon.accuracy! > 0);
                assert.ok(weapon.accuracy! <= 100);
                assert.ok(weapon.penetration! >= 0);
            });
        });

        it('should have correct range relationships', () => {
            // Sniper should have longest range
            const sniper = WEAPON_TYPES.SNIPER;
            const pistol = WEAPON_TYPES.PISTOL;
            
            assert.ok(sniper.maxRange > pistol.maxRange);
        });

        it('should have correct damage relationships', () => {
            // Rocket launcher should have highest damage
            const rocket = WEAPON_TYPES.ROCKET_LAUNCHER;
            const pistol = WEAPON_TYPES.PISTOL;
            
            assert.ok(rocket.baseDamage > pistol.baseDamage);
        });

        it('should get default weapon', () => {
            const defaultWeapon = getDefaultWeapon();
            assert.ok(defaultWeapon);
            assert.strictEqual(defaultWeapon.name, 'Standard Issue Blaster');
            assert.strictEqual(defaultWeapon.baseDamage, 10);
        });

        it('should get effective weapon damage', () => {
            // Test with baseDamage
            const rifle = WEAPON_TYPES.RIFLE;
            assert.strictEqual(getWeaponDamage(rifle), 20);
            
            // Test with damage field (backward compatibility)
            const weaponWithDamageField: Partial<Weapon> = { name: 'Old', minRange: 0, maxRange: 5, damage: 15 };
            assert.strictEqual(getWeaponDamage(weaponWithDamageField as Weapon), 15);
            
            // Test with default fallback
            const weaponWithoutDamage: Partial<Weapon> = { name: 'No Dmg', minRange: 0, maxRange: 5 };
            assert.strictEqual(getWeaponDamage(weaponWithoutDamage as Weapon), 10);
        });
    });

    describe('Damage Factor Integration', () => {
        it('should have consistent config for damage calculation', () => {
            const combatConfig = getCombatConfig();
            
            // Verify all factors needed for damage formula exist
            assert.ok(combatConfig.damageVariance);
            assert.ok(combatConfig.minDamage);
            assert.ok(combatConfig.maxArmorReduction);
            assert.ok(combatConfig.minRangePenalty);
            assert.ok(combatConfig.maxRangePenalty);
        });

        it('should have terrain properties for all defined terrains', () => {
            Object.values(Terrain).forEach(terrain => {
                if (typeof terrain === 'number') {
                    const props = getTerrainProperties(terrain);
                    assert.ok(props.coverBonus >= 0);
                    assert.ok(props.coverBonus <= 100);
                }
            });
        });

        it('should have weapons with valid optimal ranges', () => {
            Object.values(WEAPON_TYPES).forEach(weapon => {
                if (weapon.optimalRange !== undefined) {
                    assert.ok(weapon.optimalRange >= weapon.minRange);
                    assert.ok(weapon.optimalRange <= weapon.maxRange);
                }
            });
        });
    });
});
