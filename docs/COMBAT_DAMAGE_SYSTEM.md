# Combat Damage System

## Formula

Damage is calculated as:

`finalDamage = floor(baseDamage × distanceMod × terrainMod × coverMod × armorMod × randomMod × criticalMod)`

Then `finalDamage` is clamped to at least `minDamage`.

## Factors

- **baseDamage**: weapon damage from `api/config/WeaponsConfig.ts`
- **distanceMod**: range falloff based on min/optimal/max range
- **terrainMod**: attacker and defender terrain accuracy effects
- **coverMod**: defender terrain cover and cover action bonuses
- **armorMod**: defender armor reduced by weapon penetration
- **randomMod**: random variance from configured min/max range
- **criticalMod**: critical hit multiplier when a crit occurs

## Configurability

All combat damage settings are controlled via `api/config/CombatConfig.ts`:

- Core tuning values (`minRangePenalty`, `maxRangePenalty`, `coverEffectiveness`, `maxArmorReduction`, `damageVariance`, `criticalHitChance`, `criticalHitMultiplier`, `minDamage`)
- `damageFactorWeights` for formula weighting:
  - `0`: disable that factor (neutral multiplier `1.0`)
  - `1`: default behavior
  - `>1`: amplify the factor's effect

This allows balance tuning without changing calculation code.
