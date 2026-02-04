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
        damage: 15,
        ammo: 12
    },
    RIFLE: {
        id: 'RIFLE',
        name: 'Assault Rifle',
        description: 'Medium-range automatic weapon',
        minRange: 1,
        maxRange: 8,
        damage: 20,
        ammo: 30
    },
    SNIPER: {
        id: 'SNIPER',
        name: 'Sniper Rifle',
        description: 'Long-range precision weapon',
        minRange: 5,
        maxRange: 15,
        damage: 50,
        ammo: 5
    },
    SHOTGUN: {
        id: 'SHOTGUN',
        name: 'Shotgun',
        description: 'Close-range spread weapon',
        minRange: 0,
        maxRange: 2,
        damage: 35,
        ammo: 8
    },
    ROCKET_LAUNCHER: {
        id: 'ROCKET_LAUNCHER',
        name: 'Rocket Launcher',
        description: 'Explosive anti-tank weapon',
        minRange: 2,
        maxRange: 10,
        damage: 75,
        ammo: 1
    },
    MELEE: {
        id: 'MELEE',
        name: 'Melee Weapon',
        description: 'Close combat weapon',
        minRange: 0,
        maxRange: 1,
        damage: 25,
        ammo: undefined
    },
    STANDARD_BLASTER: {
        id: 'STANDARD_BLASTER',
        name: 'Standard Issue Blaster',
        description: 'Basic energy weapon issued to all units',
        minRange: 0,
        maxRange: 5,
        damage: 10,
        ammo: 100
    }
};

export function getWeaponById(id: string): WeaponDefinition | undefined {
    return WEAPON_TYPES[id];
}

export function getDefaultWeapon(): Weapon {
    return { ...WEAPON_TYPES.STANDARD_BLASTER };
}