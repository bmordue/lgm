# Combat System Documentation

This document describes the combat mechanics of the LGM game, specifically focusing on weapon range validation and attack execution.

## Weapon Characteristics

Each actor is equipped with a weapon that defines its combat capabilities. Weapon properties are defined in `api/config/WeaponsConfig.ts`.

### Range Properties

- **minRange**: The minimum distance (in hexes) required to attack a target. For melee weapons, this is 0. For long-range weapons like snipers, this may be 5 or more.
- **maxRange**: The maximum distance (in hexes) the weapon can reach.
- **optimalRange**: (Optional) The range at which the weapon is most effective. Defaults to the midpoint between `minRange` and `maxRange`.

## Range Validation Logic

Range validation is handled by the `RangeValidation` service (`api/service/RangeValidation.ts`).

### Hex Distance Calculation

Distances are calculated on a hexagonal grid using a cube coordinate system to ensure accuracy across all directions.

```typescript
import { calculateHexDistance } from './service/RangeValidation';

const distance = calculateHexDistance(attackerPos, targetPos);
```

### Attack Validation

Comprehensive validation checks several factors before an attack is considered valid:

1.  **Weapon Existence**: Attacker must have a weapon.
2.  **Range Check**: Target must be between `minRange` and `maxRange`.
3.  **Line of Sight (LOS)**: There must be a clear path between attacker and target, not blocked by obstacles (like BLOCKED terrain).
4.  **Ownership**: Players cannot attack their own units.
5.  **Target State**: Dead units cannot be attacked.
6.  **Self-Attack**: Units cannot attack themselves.

## Order Lifecycle

### 1. Order Submission (`api/service/OrderService.ts`)

When a player submits an `ATTACK` order, validation is performed and invalid attacks are rejected:
- **Submission Rejection**: If any validation check fails (weapon, ownership, target state, range, or LOS), the order is rejected with an error.

### 2. Turn Simulation (`api/service/Rules.ts`)

During the simulation of a turn, `ATTACK` orders are processed in each timestep:
- **Real-time Validation**: Range and LOS are re-checked based on the current positions of all actors at the start of the timestep.
- **Execution**: If valid, damage is calculated and applied to the target.

## API Integration

### Getting Valid Targets

The UI can query for valid targets for a specific actor using the following endpoint:

`GET /games/{gameId}/actors/{actorId}/targets`

This returns a list of actors that are currently within range and have a valid line of sight.

## Internal Utilities

- `isTargetInRange`: Checks only the distance against weapon range.
- `validateAttack`: Performs the full suite of validation (Range, LOS, Ownership, etc.).
- `getValidTargets`: Returns all attackable actors for a given unit.
- `getPositionsInRange`: Returns all hex coordinates within a weapon's range.
