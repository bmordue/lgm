# Implementation Plan: Define Damage Calculation Factors

**Issue ID**: lgm-ahi
**Priority**: P2
**Type**: Task

## 1. Summary

Define comprehensive damage calculation factors for the combat system, including how weapon type, unit stats, terrain, cover, distance, and other modifiers affect damage dealt and received in combat.

## 2. Problem

The current system has basic weapon definitions (`api/config/WeaponsConfig.ts`) with simple `damage` values, but lacks:

- **Comprehensive Damage Formula**: No defined formula for how various factors combine
- **Unit Stats**: Actors have `health` but no attack/defense stats
- **Terrain Modifiers**: No terrain-based damage reduction or bonuses
- **Cover System**: No cover mechanics (high ground, obstacles, etc.)
- **Distance Modifiers**: Weapons have range but no accuracy falloff
- **Critical Hits**: No chance-based damage variation
- **Damage Types**: No resistance/weakness system
- **Status Effects**: No ongoing damage or debuffs

### Current State
From `Models.ts`:
```typescript
interface Actor {
    id: number;
    pos: GridPosition;
    state: ActorState;
    owner: number;
    health?: number;       // Only stat
    weapon?: Weapon;
}

interface Weapon {
    name: string;
    minRange: number;
    maxRange: number;
    damage: number;        // Fixed damage value
    ammo?: number;
}
```

From `WeaponsConfig.ts`:
- 7 weapon types defined
- Simple fixed damage values (10-75)
- No damage calculation formula

## 3. Proposed Solution

Define a comprehensive damage calculation system that balances:
1. **Simplicity**: Easy to understand and implement
2. **Strategic Depth**: Meaningful choices in combat
3. **Fairness**: Balanced and predictable
4. **Extensibility**: Can add new factors later

### Damage Calculation Formula

```
finalDamage = baseDamage × distanceMod × terrainMod × coverMod × randomMod
where:
  baseDamage = weapon.damage × attackerBonus / defenderBonus
  distanceMod = distance falloff based on weapon optimal range
  terrainMod = terrain effects on attacker and defender
  coverMod = cover reduction for defender
  randomMod = random variance (0.85 - 1.15)
```

### Core Factors

1. **Base Damage**: From weapon
2. **Distance Modifier**: Accuracy falloff
3. **Terrain Modifier**: High ground, difficult terrain
4. **Cover Modifier**: Protection from obstacles
5. **Random Variance**: Adds unpredictability

## 4. Implementation Plan

### Phase 1: Data Model Updates (2-3 hours)

#### 1.1 Update Actor Model
Add combat stats to `api/service/Models.ts`:

```typescript
export interface Actor {
    id: number;
    pos: GridPosition;
    state: ActorState;
    owner: number;
    health?: number;
    maxHealth?: number;              // NEW: Maximum health
    weapon?: Weapon;
    armor?: number;                  // NEW: Damage reduction (0-50)
    accuracy?: number;               // NEW: Hit chance modifier (0-100)
    evasion?: number;                // NEW: Dodge chance modifier (0-50)
    morale?: number;                 // NEW: Combat effectiveness (0-100)
}
```

#### 1.2 Extend Weapon Model
Add damage type and characteristics:

```typescript
export enum DamageType {
    KINETIC,    // Bullets, projectiles
    ENERGY,     // Lasers, plasma
    EXPLOSIVE,  // Rockets, grenades
    MELEE       // Hand-to-hand
}

export interface Weapon {
    name: string;
    minRange: number;
    maxRange: number;
    baseDamage: number;              // Renamed from 'damage'
    damageType?: DamageType;         // NEW
    optimalRange?: number;           // NEW: Best accuracy distance
    accuracy?: number;               // NEW: Base hit chance modifier
    penetration?: number;            // NEW: Armor piercing (0-100)
    ammo?: number;
}
```

#### 1.3 Add Terrain Properties
Extend Terrain enum with combat modifiers:

```typescript
export interface TerrainProperties {
    type: Terrain;
    coverBonus: number;              // Damage reduction % (0-50)
    accuracyModifier: number;        // Hit chance modifier (-20 to +20)
    movementCost: number;            // Timesteps to cross
    blocksLineOfSight: boolean;
}

export const TERRAIN_PROPERTIES: Record<Terrain, TerrainProperties> = {
    [Terrain.EMPTY]: {
        type: Terrain.EMPTY,
        coverBonus: 0,
        accuracyModifier: 0,
        movementCost: 1,
        blocksLineOfSight: false
    },
    [Terrain.BLOCKED]: {
        type: Terrain.BLOCKED,
        coverBonus: 100,             // Full cover
        accuracyModifier: -50,
        movementCost: Infinity,
        blocksLineOfSight: true
    },
    [Terrain.FOREST]: {              // NEW terrain type
        type: Terrain.FOREST,
        coverBonus: 30,
        accuracyModifier: -10,
        movementCost: 2,
        blocksLineOfSight: false
    },
    [Terrain.ROCK]: {                // NEW terrain type
        type: Terrain.ROCK,
        coverBonus: 40,
        accuracyModifier: 10,        // High ground bonus
        movementCost: 2,
        blocksLineOfSight: false
    }
};
```

### Phase 2: Damage Calculation System (3-4 hours)

#### 2.1 Create Combat Utilities
Create new file `api/service/CombatMath.ts`:

```typescript
import { Actor, Weapon, Terrain, DamageType } from './Models';
import { TERRAIN_PROPERTIES } from './TerrainConfig';
import { Hex } from '../Hex';

export interface DamageCalculation {
    baseDamage: number;
    distanceModifier: number;
    terrainModifier: number;
    coverModifier: number;
    armorModifier: number;
    randomModifier: number;
    finalDamage: number;
    breakdown: string;  // Human-readable explanation
}

/**
 * Calculate damage dealt from attacker to defender
 */
export function calculateDamage(
    attacker: Actor,
    defender: Actor,
    distance: number,
    attackerTerrain: Terrain,
    defenderTerrain: Terrain,
    hasLineOfSight: boolean
): DamageCalculation {
    const weapon = attacker.weapon;
    if (!weapon) {
        return createZeroDamage('Attacker has no weapon');
    }

    // Base damage from weapon
    const baseDamage = weapon.baseDamage || 10;

    // Distance modifier (optimal range = 1.0, falloff outside)
    const distanceMod = calculateDistanceModifier(weapon, distance);
    if (distanceMod === 0) {
        return createZeroDamage('Target out of range');
    }

    if (!hasLineOfSight) {
        return createZeroDamage('No line of sight');
    }

    // Terrain modifiers
    const attackerTerrainProps = TERRAIN_PROPERTIES[attackerTerrain];
    const defenderTerrainProps = TERRAIN_PROPERTIES[defenderTerrain];

    const terrainMod = 1.0 + (attackerTerrainProps.accuracyModifier / 100);
    const coverMod = 1.0 - (defenderTerrainProps.coverBonus / 100);

    // Armor reduction
    const armorValue = defender.armor || 0;
    const penetration = weapon.penetration || 0;
    const effectiveArmor = Math.max(0, armorValue - penetration);
    const armorMod = 1.0 - (effectiveArmor / 100);

    // Random variance (85% - 115%)
    const randomMod = 0.85 + (Math.random() * 0.3);

    // Calculate final damage
    const finalDamage = Math.max(
        1,  // Minimum 1 damage
        Math.floor(baseDamage * distanceMod * terrainMod * coverMod * armorMod * randomMod)
    );

    return {
        baseDamage,
        distanceModifier: distanceMod,
        terrainModifier: terrainMod,
        coverModifier: coverMod,
        armorModifier: armorMod,
        randomModifier: randomMod,
        finalDamage,
        breakdown: createDamageBreakdown(
            baseDamage,
            distanceMod,
            terrainMod,
            coverMod,
            armorMod,
            randomMod,
            finalDamage
        )
    };
}

/**
 * Calculate distance-based damage falloff
 * Optimal range = 1.0 multiplier
 * Inside min range or beyond max range = 0.0
 * Gradual falloff between optimal and max
 */
function calculateDistanceModifier(weapon: Weapon, distance: number): number {
    if (distance < weapon.minRange || distance > weapon.maxRange) {
        return 0;  // Out of effective range
    }

    const optimalRange = weapon.optimalRange ||
        Math.floor((weapon.minRange + weapon.maxRange) / 2);

    if (distance === optimalRange) {
        return 1.0;  // Perfect distance
    }

    // Calculate falloff
    if (distance < optimalRange) {
        // Between min and optimal: linear interpolation
        const rangeSpan = optimalRange - weapon.minRange;
        const distanceFromMin = distance - weapon.minRange;
        return 0.7 + (0.3 * (distanceFromMin / rangeSpan));
    } else {
        // Between optimal and max: linear falloff
        const rangeSpan = weapon.maxRange - optimalRange;
        const distanceFromOptimal = distance - optimalRange;
        return 1.0 - (0.5 * (distanceFromOptimal / rangeSpan));
    }
}

function createZeroDamage(reason: string): DamageCalculation {
    return {
        baseDamage: 0,
        distanceModifier: 0,
        terrainModifier: 0,
        coverModifier: 0,
        armorModifier: 0,
        randomModifier: 0,
        finalDamage: 0,
        breakdown: reason
    };
}

function createDamageBreakdown(
    base: number,
    dist: number,
    terrain: number,
    cover: number,
    armor: number,
    random: number,
    final: number
): string {
    return [
        `Base: ${base}`,
        `× Distance: ${(dist * 100).toFixed(0)}%`,
        `× Terrain: ${(terrain * 100).toFixed(0)}%`,
        `× Cover: ${(cover * 100).toFixed(0)}%`,
        `× Armor: ${(armor * 100).toFixed(0)}%`,
        `× Random: ${(random * 100).toFixed(0)}%`,
        `= Final: ${final}`
    ].join(' | ');
}

/**
 * Calculate hex distance between two positions
 */
export function calculateDistance(pos1: GridPosition, pos2: GridPosition): number {
    // Convert to hex coordinates and use cube distance
    const hex1 = gridPositionToHex(pos1);
    const hex2 = gridPositionToHex(pos2);
    return hex1.distance(hex2);
}

function gridPositionToHex(pos: GridPosition): Hex {
    const q = pos.y;
    const r = pos.x - (pos.y - (pos.y & 1)) / 2;
    return new Hex(q, r, -q - r);
}
```

#### 2.2 Update Weapon Configurations
Update `api/config/WeaponsConfig.ts`:

```typescript
export const WEAPON_TYPES: Record<string, WeaponDefinition> = {
    PISTOL: {
        id: 'PISTOL',
        name: 'Pistol',
        description: 'Close-range personal defense weapon',
        minRange: 0,
        maxRange: 3,
        baseDamage: 15,
        damageType: DamageType.KINETIC,
        optimalRange: 2,
        accuracy: 70,
        penetration: 10,
        ammo: 12
    },
    RIFLE: {
        id: 'RIFLE',
        name: 'Assault Rifle',
        description: 'Medium-range automatic weapon',
        minRange: 1,
        maxRange: 8,
        baseDamage: 20,
        damageType: DamageType.KINETIC,
        optimalRange: 5,
        accuracy: 60,
        penetration: 20,
        ammo: 30
    },
    // ... update all weapons with new properties
};
```

### Phase 3: Configuration System (2 hours)

#### 3.1 Create Game Balance Configuration
Create `api/config/CombatConfig.ts`:

```typescript
export interface CombatConfig {
    damageVariance: { min: number; max: number };
    criticalHitChance: number;
    criticalHitMultiplier: number;
    minDamage: number;
    maxArmorReduction: number;
    highGroundBonus: number;
    coverEffectiveness: number;
}

export const COMBAT_CONFIG: CombatConfig = {
    damageVariance: { min: 0.85, max: 1.15 },  // ±15% random
    criticalHitChance: 0.05,                    // 5% crit chance
    criticalHitMultiplier: 2.0,                 // 2x damage on crit
    minDamage: 1,                               // Always deal at least 1
    maxArmorReduction: 50,                      // Armor caps at 50%
    highGroundBonus: 20,                        // +20% accuracy
    coverEffectiveness: 1.0                     // 100% of cover value
};

export function getCombatConfig(): CombatConfig {
    return { ...COMBAT_CONFIG };
}
```

### Phase 4: Testing (2-3 hours)

#### 4.1 Unit Tests
Create `api/test/CombatMath.test.ts`:

```typescript
import { expect } from 'chai';
import * as CombatMath from '../service/CombatMath';
import { Actor, ActorState, Terrain } from '../service/Models';
import { WEAPON_TYPES } from '../config/WeaponsConfig';

describe('Combat Mathematics', () => {
    const createTestActor = (weaponId: string, armor: number = 0): Actor => ({
        id: 1,
        pos: { x: 0, y: 0 },
        state: ActorState.ALIVE,
        owner: 1,
        health: 100,
        maxHealth: 100,
        weapon: { ...WEAPON_TYPES[weaponId] },
        armor
    });

    describe('calculateDamage', () => {
        it('should calculate base damage at optimal range', () => {
            const attacker = createTestActor('RIFLE');
            const defender = createTestActor('PISTOL');

            const damage = CombatMath.calculateDamage(
                attacker,
                defender,
                5,  // Optimal range for rifle
                Terrain.EMPTY,
                Terrain.EMPTY,
                true
            );

            expect(damage.finalDamage).to.be.gt(0);
            expect(damage.distanceModifier).to.equal(1.0);
        });

        it('should reduce damage for out-of-range attacks', () => {
            const attacker = createTestActor('PISTOL');
            const defender = createTestActor('RIFLE');

            const damage = CombatMath.calculateDamage(
                attacker,
                defender,
                10,  // Way beyond pistol range (maxRange: 3)
                Terrain.EMPTY,
                Terrain.EMPTY,
                true
            );

            expect(damage.finalDamage).to.equal(0);
            expect(damage.breakdown).to.include('out of range');
        });

        it('should apply cover reduction', () => {
            const attacker = createTestActor('RIFLE');
            const defender = createTestActor('RIFLE');

            const noCover = CombatMath.calculateDamage(
                attacker,
                defender,
                5,
                Terrain.EMPTY,
                Terrain.EMPTY,
                true
            );

            const withCover = CombatMath.calculateDamage(
                attacker,
                defender,
                5,
                Terrain.EMPTY,
                Terrain.ROCK,  // Provides cover
                true
            );

            expect(withCover.finalDamage).to.be.lt(noCover.finalDamage);
            expect(withCover.coverModifier).to.be.lt(1.0);
        });

        it('should apply armor reduction', () => {
            const attacker = createTestActor('PISTOL');
            const noArmor = createTestActor('PISTOL', 0);
            const heavyArmor = createTestActor('PISTOL', 40);

            const damageNoArmor = CombatMath.calculateDamage(
                attacker,
                noArmor,
                2,
                Terrain.EMPTY,
                Terrain.EMPTY,
                true
            );

            const damageWithArmor = CombatMath.calculateDamage(
                attacker,
                heavyArmor,
                2,
                Terrain.EMPTY,
                Terrain.EMPTY,
                true
            );

            expect(damageWithArmor.finalDamage).to.be.lt(damageNoArmor.finalDamage);
        });

        it('should prevent damage without line of sight', () => {
            const attacker = createTestActor('RIFLE');
            const defender = createTestActor('RIFLE');

            const damage = CombatMath.calculateDamage(
                attacker,
                defender,
                5,
                Terrain.EMPTY,
                Terrain.EMPTY,
                false  // No LOS
            );

            expect(damage.finalDamage).to.equal(0);
            expect(damage.breakdown).to.include('line of sight');
        });

        it('should always deal minimum damage on hit', () => {
            // Even with maximum armor and cover, should deal at least 1 damage
            const attacker = createTestActor('PISTOL');
            const heavilyProtected = createTestActor('PISTOL', 50);

            const damage = CombatMath.calculateDamage(
                attacker,
                heavilyProtected,
                2,
                Terrain.EMPTY,
                Terrain.BLOCKED,  // Maximum cover
                true
            );

            // Should either be 0 (blocked) or >= 1
            if (damage.finalDamage > 0) {
                expect(damage.finalDamage).to.be.gte(1);
            }
        });
    });

    describe('calculateDistanceModifier', () => {
        it('should return 1.0 at optimal range', () => {
            const weapon = { ...WEAPON_TYPES.RIFLE };
            const mod = CombatMath.calculateDistanceModifier(weapon, weapon.optimalRange);
            expect(mod).to.equal(1.0);
        });

        it('should falloff beyond optimal range', () => {
            const weapon = { ...WEAPON_TYPES.RIFLE };
            const optimalMod = CombatMath.calculateDistanceModifier(weapon, weapon.optimalRange);
            const farMod = CombatMath.calculateDistanceModifier(weapon, weapon.maxRange);
            expect(farMod).to.be.lt(optimalMod);
        });

        it('should return 0 outside effective range', () => {
            const weapon = { ...WEAPON_TYPES.PISTOL };
            const mod = CombatMath.calculateDistanceModifier(weapon, weapon.maxRange + 1);
            expect(mod).to.equal(0);
        });
    });
});
```

### Phase 5: Documentation (1-2 hours)

#### 5.1 Create Damage Calculation Guide
Create `docs/COMBAT_DAMAGE_SYSTEM.md`:

```markdown
# Combat Damage System

## Overview
The LGM damage system uses multiple factors to calculate combat damage...

## Damage Formula
[Detailed explanation of formula and factors]

## Factors

### Base Damage
[Weapon damage values]

### Distance Modifiers
[Range and falloff curves]

### Terrain Effects
[Terrain properties table]

### Cover System
[Cover mechanics]

### Armor
[Armor and penetration]

## Examples
[Worked examples of damage calculations]
```

#### 5.2 Update API Documentation
Document damage calculation in combat-related endpoints.

## 5. Success Metrics

- [ ] Comprehensive damage formula defined
- [ ] All factors documented with clear formulas
- [ ] Actor model supports combat stats
- [ ] Weapon model includes damage type and modifiers
- [ ] Terrain provides cover and accuracy modifiers
- [ ] Unit tests cover all calculation scenarios
- [ ] Documentation explains system to developers
- [ ] Configuration allows easy balance tuning

## 6. Timeline Estimate

- **Phase 1 (Data Models)**: 2-3 hours
- **Phase 2 (Damage Calculation)**: 3-4 hours
- **Phase 3 (Configuration)**: 2 hours
- **Phase 4 (Testing)**: 2-3 hours
- **Phase 5 (Documentation)**: 1-2 hours

**Total Estimated Time**: 10-14 hours over 2 development sessions

## 7. Dependencies

None - this task is ready to start.

Note: This defines the system but doesn't integrate it into turn processing. Integration happens in later tasks (lgm-9u0).

## 8. Risks and Considerations

### Balance
Damage formulas need playtesting. Mitigation:
- Use configuration file for easy tuning
- Comprehensive unit tests
- Document balance assumptions

### Complexity
Too many factors = confusing. Mitigation:
- Keep formula straightforward
- Provide breakdown in combat results
- Good documentation

### Performance
Damage calculations per hit. Mitigation:
- Optimize calculation functions
- Cache terrain lookups
- Profile performance

## 9. Post-Implementation

After completing this task:
1. **Balance Testing**: Playtest various scenarios
2. **Tune**: Adjust values based on gameplay
3. **Extend**: Add status effects, damage types
4. **Integrate**: Use in turn processing (lgm-9u0)

This provides foundation for:
- Realistic combat simulation
- Strategic depth
- Fair and balanced gameplay
- Future combat features
