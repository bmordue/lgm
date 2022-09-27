import assert = require('assert');
import { hexSvg, worldSvg } from '../utils/Draw';
import rules = require('../service/Rules');
import { writeFileSync } from 'fs';


describe('Draw', () => {
    describe('filledHexSvg', () => {
        it('should draw a single hex at grid (0,0)', () => {
            const svgStr = hexSvg({ x: 0, y: 0 }, 10);
            assert.ok(svgStr);
            console.log(svgStr);
        });
    });

    describe('worldSvg', () => {
        it('should draw world terrain hexes', async () => {
            const terrain = await rules.generateTerrain();
            const world = { id: 0, actors: [], terrain: terrain };

            const svgStr = worldSvg(world);
            assert.ok(svgStr);
            writeFileSync('image_world.svg', svgStr);
        });
    });
});