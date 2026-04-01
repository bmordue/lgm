/**
 * Terrain properties for combat calculations
 */

import { Terrain } from '../service/Models';

export interface TerrainProperties {
    type: Terrain;
    name: string;
    coverBonus: number;           // Damage reduction % (0-50)
    accuracyModifier: number;     // Hit chance modifier (-20 to +20)
    movementCost: number;         // Timesteps to cross (1 = normal)
    blocksLineOfSight: boolean;
}

export const TERRAIN_PROPERTIES: Record<Terrain, TerrainProperties> = {
    [Terrain.EMPTY]: {
        type: Terrain.EMPTY,
        name: 'Open Ground',
        coverBonus: 0,
        accuracyModifier: 0,
        movementCost: 1,
        blocksLineOfSight: false
    },
    [Terrain.BLOCKED]: {
        type: Terrain.BLOCKED,
        name: 'Obstacle',
        coverBonus: 50,            // Full cover
        accuracyModifier: 0,
        movementCost: Infinity,
        blocksLineOfSight: true
    },
    [Terrain.UNEXPLORED]: {
        type: Terrain.UNEXPLORED,
        name: 'Unknown',
        coverBonus: 0,
        accuracyModifier: 0,
        movementCost: 1,
        blocksLineOfSight: false
    }
};

/**
 * Get terrain properties for a given terrain type
 */
export function getTerrainProperties(terrain: Terrain): TerrainProperties {
    return TERRAIN_PROPERTIES[terrain] || TERRAIN_PROPERTIES[Terrain.EMPTY];
}

/**
 * Get terrain by name (case-insensitive)
 */
export function getTerrainByName(name: string): TerrainProperties | undefined {
    return Object.values(TERRAIN_PROPERTIES).find(
        t => t.name.toLowerCase() === name.toLowerCase()
    );
}
