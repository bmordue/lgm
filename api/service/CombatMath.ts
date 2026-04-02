/**
 * Combat mathematics and damage calculation utilities
 */

import { Actor, Weapon, Terrain, GridPosition } from './Models';
import { Hex } from '../Hex';
import { getCombatConfig, CombatConfig } from '../config/CombatConfig';
import { getTerrainProperties, TerrainProperties } from '../config/TerrainConfig';
import { getWeaponDamage } from '../config/WeaponsConfig';

export interface DamageCalculation {
    // Inputs
    baseDamage: number;
    distance: number;
    
    // Modifiers
    distanceModifier: number;
    terrainModifier: number;
    coverModifier: number;
    armorModifier: number;
    randomModifier: number;
    
    // Result
    finalDamage: number;
    
    // Debug info
    breakdown: string;
    isCritical: boolean;
    criticalMultiplier?: number;
}

export interface DamageOptions {
    hasLineOfSight?: boolean;
    isOverwatch?: boolean;
    isMelee?: boolean;
    forceCritical?: boolean;
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
    hasLineOfSight: boolean = true,
    options: DamageOptions = {}
): DamageCalculation {
    const config = getCombatConfig();
    
    // Check for no weapon
    if (!attacker.weapon) {
        return createZeroDamageResult('Attacker has no weapon');
    }

    // Check line of sight
    if (!hasLineOfSight && options.hasLineOfSight !== true) {
        return createZeroDamageResult('No line of sight');
    }

    const weapon = attacker.weapon;

    // Check range (should be validated before calling, but double-check)
    if (distance < weapon.minRange || distance > weapon.maxRange) {
        return createZeroDamageResult(`Target out of range (distance: ${distance}, valid: ${weapon.minRange}-${weapon.maxRange})`);
    }

    // Base damage from weapon
    const baseDamage = getWeaponDamage(weapon);

    // Distance modifier
    const distanceMod = calculateDistanceModifier(weapon, distance, config);

    // Terrain modifiers
    const attackerTerrainProps = getTerrainProperties(attackerTerrain);
    const defenderTerrainProps = getTerrainProperties(defenderTerrain);
    
    const terrainMod = calculateTerrainModifier(attackerTerrainProps, defenderTerrainProps, config);
    const coverMod = calculateCoverModifier(defenderTerrainProps, defender, config);

    // Armor reduction
    const armorMod = calculateArmorModifier(weapon, defender, config);

    // Random variance
    let randomMod = calculateRandomModifier(config);
    
    // Critical hit check
    const isCritical = options.forceCritical || checkCriticalHit(config);
    const criticalMod = isCritical ? config.criticalHitMultiplier : 1.0;

    // Overwatch penalty
    if (options.isOverwatch) {
        randomMod *= config.overwatchAccuracy;
    }

    // Aim bonus
    if (attacker.isAiming && attacker.aimBonus) {
        randomMod *= (1.0 + attacker.aimBonus / 100);
    }

    // Calculate final damage
    const finalDamage = calculateFinalDamage(
        baseDamage,
        distanceMod,
        terrainMod,
        coverMod,
        armorMod,
        randomMod,
        criticalMod,
        config
    );

    return {
        baseDamage,
        distance,
        distanceModifier: distanceMod,
        terrainModifier: terrainMod,
        coverModifier: coverMod,
        armorModifier: armorMod,
        randomModifier: randomMod,
        finalDamage,
        isCritical,
        criticalMultiplier: isCritical ? criticalMod : undefined,
        breakdown: createDamageBreakdown(
            baseDamage,
            distanceMod,
            terrainMod,
            coverMod,
            armorMod,
            randomMod,
            criticalMod,
            finalDamage
        )
    };
}

/**
 * Calculate distance-based damage falloff
 */
export function calculateDistanceModifier(
    weapon: Weapon,
    distance: number,
    config: CombatConfig
): number {
    // Out of range
    if (distance < weapon.minRange || distance > weapon.maxRange) {
        return 0;
    }

    // Determine optimal range
    const optimalRange = weapon.optimalRange ?? 
        Math.floor((weapon.minRange + weapon.maxRange) / 2);

    // At optimal range = full damage
    if (distance === optimalRange) {
        return 1.0;
    }

    // Inside optimal range (close range penalty for some weapons)
    if (distance < optimalRange) {
        if (weapon.minRange === optimalRange) {
            return 1.0; // No close range penalty
        }
        
        const rangeSpan = optimalRange - weapon.minRange;
        const distanceFromMin = distance - weapon.minRange;
        // Interpolate between minRangePenalty and 1.0
        return config.minRangePenalty + 
            ((1.0 - config.minRangePenalty) * (distanceFromMin / rangeSpan));
    }

    // Beyond optimal range (falloff)
    const rangeSpan = weapon.maxRange - optimalRange;
    const distanceFromOptimal = distance - optimalRange;
    // Interpolate between 1.0 and maxRangePenalty
    return 1.0 - ((1.0 - config.maxRangePenalty) * (distanceFromOptimal / rangeSpan));
}

/**
 * Calculate terrain-based modifier
 */
export function calculateTerrainModifier(
    attackerTerrain: TerrainProperties,
    defenderTerrain: TerrainProperties,
    config: CombatConfig
): number {
    let modifier = 1.0;
    
    // Attacker terrain bonus/penalty
    if (attackerTerrain.accuracyModifier) {
        modifier += attackerTerrain.accuracyModifier / 100;
    }
    
    // Defender terrain bonus (attacker penalty)
    if (defenderTerrain.accuracyModifier) {
        modifier -= defenderTerrain.accuracyModifier / 100;
    }

    // Clamp to reasonable range
    return Math.max(config.minAccuracyModifier, Math.min(config.maxAccuracyModifier, modifier));
}

/**
 * Calculate cover-based damage reduction
 */
export function calculateCoverModifier(
    defenderTerrain: TerrainProperties,
    defender: Actor,
    config: CombatConfig
): number {
    let coverBonus = defenderTerrain.coverBonus || 0;
    
    // Actor under cover action
    if (defender.isUnderCover && defender.coverBonus) {
        coverBonus = Math.max(coverBonus, defender.coverBonus);
    }

    // Apply cover effectiveness config
    const effectiveCover = coverBonus * config.coverEffectiveness;
    
    return 1.0 - (effectiveCover / 100);
}

/**
 * Calculate armor-based damage reduction
 */
export function calculateArmorModifier(
    weapon: Weapon,
    defender: Actor,
    config: CombatConfig
): number {
    const armorValue = defender.armor || 0;
    const penetration = weapon.penetration || 0;
    
    // Effective armor after penetration
    const effectiveArmor = Math.max(0, armorValue - penetration);
    
    // Cap armor reduction
    const cappedArmor = Math.min(effectiveArmor, config.maxArmorReduction);
    
    return 1.0 - (cappedArmor / 100);
}

/**
 * Calculate random variance modifier
 */
export function calculateRandomModifier(config: CombatConfig): number {
    return config.damageVariance.min + 
        (Math.random() * (config.damageVariance.max - config.damageVariance.min));
}

/**
 * Check if hit is critical
 */
export function checkCriticalHit(config: CombatConfig): boolean {
    return Math.random() < config.criticalHitChance;
}

/**
 * Calculate final damage value
 */
function calculateFinalDamage(
    baseDamage: number,
    distanceMod: number,
    terrainMod: number,
    coverMod: number,
    armorMod: number,
    randomMod: number,
    criticalMod: number,
    config: CombatConfig
): number {
    const rawDamage = baseDamage * distanceMod * terrainMod * coverMod * armorMod * randomMod * criticalMod;
    
    // Round and apply minimum
    const finalDamage = Math.max(config.minDamage, Math.floor(rawDamage));
    
    return finalDamage;
}

/**
 * Create human-readable damage breakdown
 */
export function createDamageBreakdown(
    base: number,
    distance: number,
    terrain: number,
    cover: number,
    armor: number,
    random: number,
    critical: number,
    final: number
): string {
    const parts: string[] = [];
    
    parts.push(`Base: ${base}`);
    
    if (distance !== 1.0) {
        parts.push(`× Range: ${(distance * 100).toFixed(0)}%`);
    }
    
    if (terrain !== 1.0) {
        parts.push(`× Terrain: ${(terrain * 100).toFixed(0)}%`);
    }
    
    if (cover !== 1.0) {
        parts.push(`× Cover: ${(cover * 100).toFixed(0)}%`);
    }
    
    if (armor !== 1.0) {
        parts.push(`× Armor: ${(armor * 100).toFixed(0)}%`);
    }
    
    if (random !== 1.0) {
        parts.push(`× Variance: ${(random * 100).toFixed(0)}%`);
    }
    
    if (critical > 1.0) {
        parts.push(`× CRIT: ${(critical * 100).toFixed(0)}%`);
    }
    
    parts.push(`= ${final}`);
    
    return parts.join(' ');
}

function createZeroDamageResult(reason: string): DamageCalculation {
    return {
        baseDamage: 0,
        distance: 0,
        distanceModifier: 0,
        terrainModifier: 0,
        coverModifier: 0,
        armorModifier: 0,
        randomModifier: 0,
        finalDamage: 0,
        isCritical: false,
        breakdown: reason
    };
}

/**
 * Calculate expected damage (for AI, UI previews)
 * Uses average random modifier instead of rolling
 */
export function calculateExpectedDamage(
    attacker: Actor,
    defender: Actor,
    distance: number,
    attackerTerrain: Terrain,
    defenderTerrain: Terrain,
    hasLineOfSight: boolean = true
): number {
    if (!attacker.weapon) return 0;
    const config = getCombatConfig();
    const avgRandom = (config.damageVariance.min + config.damageVariance.max) / 2;

    // Get base calculation without random variance
    const baseDamage = getWeaponDamage(attacker.weapon);
    const distanceMod = calculateDistanceModifier(attacker.weapon!, distance, config);
    
    const attackerTerrainProps = getTerrainProperties(attackerTerrain);
    const defenderTerrainProps = getTerrainProperties(defenderTerrain);
    const terrainMod = calculateTerrainModifier(attackerTerrainProps, defenderTerrainProps, config);
    const coverMod = calculateCoverModifier(defenderTerrainProps, defender, config);
    const armorMod = calculateArmorModifier(attacker.weapon!, defender, config);
    
    // Use average random instead of rolling
    const rawDamage = baseDamage * distanceMod * terrainMod * coverMod * armorMod * avgRandom;
    
    return Math.max(config.minDamage, Math.floor(rawDamage));
}

/**
 * Apply damage to target actor
 * Returns the actual damage dealt
 */
export function applyDamage(
    target: Actor,
    damage: number
): number {
    const currentHealth = target.health || 100;
    const newHealth = Math.max(0, currentHealth - damage);
    const actualDamage = currentHealth - newHealth;
    
    target.health = newHealth;
    
    return actualDamage;
}
