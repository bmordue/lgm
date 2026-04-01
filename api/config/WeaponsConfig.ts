/**
 * Configuration for different weapon types with their range characteristics
 */

import { Weapon } from '../service/Models';

export interface WeaponDefinition extends Weapon {
    id: string;
    description: string;
}

export const WEAPON_TYPES: Record<string, WeaponDefinition> = {
    PISTOL: {
        id: 'PISTOL',
        name: 'Pistol',
        description: 'Close-range personal defense weapon',
        minRange: 0,
        maxRange: 3,
        baseDamage: 15,
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
        optimalRange: 5,
        accuracy: 60,
        penetration: 20,
        ammo: 30
    },
    SNIPER: {
        id: 'SNIPER',
        name: 'Sniper Rifle',
        description: 'Long-range precision weapon',
        minRange: 5,
        maxRange: 15,
        baseDamage: 50,
        optimalRange: 10,
        accuracy: 90,
        penetration: 40,
        ammo: 5
    },
    SHOTGUN: {
        id: 'SHOTGUN',
        name: 'Shotgun',
        description: 'Close-range spread weapon',
        minRange: 0,
        maxRange: 2,
        baseDamage: 35,
        optimalRange: 1,
        accuracy: 40,
        penetration: 15,
        ammo: 8
    },
    ROCKET_LAUNCHER: {
        id: 'ROCKET_LAUNCHER',
        name: 'Rocket Launcher',
        description: 'Explosive anti-tank weapon',
        minRange: 2,
        maxRange: 10,
        baseDamage: 75,
        optimalRange: 6,
        accuracy: 50,
        penetration: 60,
        ammo: 1
    },
    MELEE: {
        id: 'MELEE',
        name: 'Melee Weapon',
        description: 'Close combat weapon',
        minRange: 0,
        maxRange: 1,
        baseDamage: 25,
        optimalRange: 0,
        accuracy: 80,
        penetration: 5,
        ammo: undefined
    },
    STANDARD_BLASTER: {
        id: 'STANDARD_BLASTER',
        name: 'Standard Issue Blaster',
        description: 'Basic energy weapon issued to all units',
        minRange: 0,
        maxRange: 5,
        baseDamage: 10,
        optimalRange: 3,
        accuracy: 65,
        penetration: 10,
        ammo: 100
    }
};

export function getWeaponById(id: string): WeaponDefinition | undefined {
    return WEAPON_TYPES[id];
}

export function getDefaultWeapon(): Weapon {
    const weapon = { ...WEAPON_TYPES.STANDARD_BLASTER };
    // Ensure baseDamage is set for backward compatibility
    if (!weapon.baseDamage && weapon.damage) {
        weapon.baseDamage = weapon.damage;
    }
    return weapon;
}

/**
 * Get effective damage value from a weapon (handles backward compatibility)
 */
export function getWeaponDamage(weapon: Weapon): number {
    return weapon.baseDamage || weapon.damage || 10;
}