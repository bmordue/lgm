# Combat System Task List

## Line-of-Sight

- [X] Define how line-of-sight is blocked (e.g., by terrain, other units)
  - Terrain features block line-of-sight:
    - Mountains
    - Forests (dense)
    - Buildings
  - Units block line-of-sight:
    - Both friendly and hostile units.
    - Larger units (e.g., vehicles, large creatures) block line-of-sight more comprehensively than smaller units (e.g., infantry).
    - Consider implementing different levels of cover (e.g., partial, full) based on the obstructing unit's size and the target's visibility.
- [X] Implement an algorithm to check for line-of-sight between two points on the game map

## Weapon Ranges

- [ ] Define different weapon types and their range characteristics (e.g., minimum and maximum range)
- [ ] Implement logic to determine if a target is within a weapon's range

## Damage Calculations

- [ ] Define factors influencing damage (e.g., weapon type, unit stats, terrain)
- [ ] Implement formulas to calculate damage dealt and received

## Integration

- [ ] Integrate the new combat mechanics into the existing game loop and turn structure
- [ ] Update unit actions to include combat-related actions (e.g., attack, take cover)

## Testing

- [ ] Create unit tests for line-of-sight, weapon range, and damage calculation logic
- [ ] Create integration tests to ensure the combat system works correctly within the game
