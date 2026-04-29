/**
 * Weapon range validation utilities for combat system
 */

import { Actor, GridPosition, World, Weapon, ActorState, Terrain } from './Models';
import { hasLineOfSight } from './Visibility';
import { getTerrainProperties } from '../config/TerrainConfig';
import { calculateHexDistance, gridPositionToHex } from './HexGrid';

export interface RangeCheckResult {
    inRange: boolean;
    distance: number;
    tooClose: boolean;
    tooFar: boolean;
    reason?: string;
}

export interface AttackValidation {
    valid: boolean;
    inRange: boolean;
    hasLineOfSight: boolean;
    distance: number;
    errors: string[];
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

    if (distance < weapon.minRange) {
        return {
            inRange: false,
            distance,
            tooClose: true,
            tooFar: false,
            reason: `Target too close (distance: ${distance}, min range: ${weapon.minRange})`
        };
    }

    if (distance > weapon.maxRange) {
        return {
            inRange: false,
            distance,
            tooClose: false,
            tooFar: true,
            reason: `Target too far (distance: ${distance}, max range: ${weapon.maxRange})`
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
 * Simplified boolean check for target in range
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

/**
 * Comprehensive attack validation including range, LOS, and other checks
 */
export async function validateAttack(
    attacker: Actor,
    target: Actor,
    world: World,
    allActors?: Actor[] // Optional: pass all actors for proper LOS blocking check
): Promise<AttackValidation> {
    const errors: string[] = [];

    // Check attacker has weapon
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
    const attackerHex = gridPositionToHex(attacker.pos);
    const targetHex = gridPositionToHex(target.pos);
    // Use allActors if provided, otherwise just attacker and target
    const losActors = allActors || [attacker, target];
    const los = hasLineOfSight(attackerHex, targetHex, world.terrain, losActors);

    if (!los) {
        errors.push('No line of sight to target');
    }

    // Check same owner (can't attack own units)
    if (attacker.owner === target.owner) {
        errors.push('Cannot attack own units');
    }

    // Check target is alive
    if (target.state === ActorState.DEAD) {
        errors.push('Target is already dead');
    }

    // Check not attacking self
    if (attacker.id === target.id) {
        errors.push('Cannot attack self');
    }

    return {
        valid: errors.length === 0,
        inRange: rangeCheck.inRange,
        hasLineOfSight: los,
        distance: rangeCheck.distance,
        errors
    };
}

/**
 * Get all actors that this actor can attack
 * Filters by range, line of sight, and ownership
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
        const attackerHex = gridPositionToHex(actor.pos);
        const targetHex = gridPositionToHex(target.pos);
        const los = hasLineOfSight(attackerHex, targetHex, terrain, [actor, target]);

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

/**
 * Get range info for UI display
 */
export function getRangeInfo(weapon: Weapon): {
    minRange: number;
    maxRange: number;
    optimalRange: number;
    description: string;
} {
    const optimalRange = weapon.optimalRange || 
        Math.floor((weapon.minRange + weapon.maxRange) / 2);
    
    let description = `Range: ${weapon.minRange}-${weapon.maxRange}`;
    if (weapon.minRange === 0) {
        description = `Range: 0-${weapon.maxRange} (melee capable)`;
    }
    if (weapon.maxRange >= 10) {
        description = `Range: ${weapon.minRange}-${weapon.maxRange} (long range)`;
    }

    return {
        minRange: weapon.minRange,
        maxRange: weapon.maxRange,
        optimalRange,
        description
    };
}
