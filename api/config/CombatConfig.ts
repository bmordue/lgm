/**
 * Combat system configuration for damage calculation and balance
 */

export interface CombatConfig {
    // Damage variance (random factor)
    damageVariance: {
        min: number;      // 0.85 = -15%
        max: number;      // 1.15 = +15%
    };
    
    // Critical hits
    criticalHitChance: number;      // 0.05 = 5%
    criticalHitMultiplier: number;  // 2.0 = double damage
    
    // Damage limits
    minDamage: number;              // Minimum 1 damage on hit
    
    // Armor
    maxArmorReduction: number;      // Armor caps at 50%
    
    // Range modifiers
    minRangePenalty: number;        // 0.7 = 70% at min range
    maxRangePenalty: number;        // 0.5 = 50% at max range
    
    // Terrain
    minAccuracyModifier: number;    // -50% max penalty
    maxAccuracyModifier: number;    // +50% max bonus
    highGroundBonus: number;        // +20% accuracy
    
    // Cover
    coverEffectiveness: number;     // 1.0 = 100% effective
    
    // Special attacks
    overwatchAccuracy: number;      // 0.7 = 70% accuracy on overwatch
    meleeBonus: number;             // +10% melee accuracy
}

export const COMBAT_CONFIG: CombatConfig = {
    damageVariance: { min: 0.85, max: 1.15 },
    criticalHitChance: 0.05,
    criticalHitMultiplier: 2.0,
    minDamage: 1,
    maxArmorReduction: 50,
    minRangePenalty: 0.7,
    maxRangePenalty: 0.5,
    minAccuracyModifier: 0.5,
    maxAccuracyModifier: 1.5,
    highGroundBonus: 20,
    coverEffectiveness: 1.0,
    overwatchAccuracy: 0.7,
    meleeBonus: 1.1
};

/**
 * Get a copy of the combat configuration
 */
export function getCombatConfig(): CombatConfig {
    return { ...COMBAT_CONFIG };
}

/**
 * Override combat configuration values (for testing/balance tuning)
 */
export function overrideCombatConfig(overrides: Partial<CombatConfig>): void {
    Object.assign(COMBAT_CONFIG, overrides);
}
