import { GridPosition } from './Models';
import { Hex } from '../Hex';

/**
 * Convert GridPosition to Hex coordinate (odd-q vertical layout)
 */
export function gridPositionToHex(pos: GridPosition): Hex {
    const q = pos.y; // column is q
    const r = pos.x - (pos.y - (pos.y & 1)) / 2; // row is x, convert to axial r for odd-q
    return new Hex(q, r, -q - r);
}

/**
 * Convert Hex coordinate back to GridPosition
 */
export function hexToGridPosition(hex: Hex): GridPosition {
    const col = hex.q;
    const row = hex.r + (hex.q - (hex.q & 1)) / 2;
    return { x: row, y: col };
}

/**
 * Calculate the hex-grid distance between two positions.
 */
export function calculateHexDistance(pos1: GridPosition, pos2: GridPosition): number {
    const hex1 = gridPositionToHex(pos1);
    const hex2 = gridPositionToHex(pos2);
    return hex1.distance(hex2);
}
