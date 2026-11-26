import assert = require('assert');
import {
    hexSvg,
    worldSvg,
    visibilitySvg,
    styledHexesSvg,
    drawLine,
    drawRectangle,
    drawCircle
} from '../utils/Draw';
import { Terrain, World, GridPosition } from '../service/Models';

function makeGrid<T>(rows: number, cols: number, fill: T): T[][] {
    return Array.from({ length: rows }, () => Array.from({ length: cols }, () => fill));
}

describe('Draw primitives', () => {
    it('drawLine marks every point on a horizontal line', () => {
        const grid = makeGrid(3, 5, 0);
        drawLine(grid, { x: 0, y: 1 }, { x: 4, y: 1 }, 9);
        assert.deepStrictEqual(grid[1], [9, 9, 9, 9, 9]);
        assert.deepStrictEqual(grid[0], [0, 0, 0, 0, 0]);
    });

    it('drawLine marks every point on a vertical line', () => {
        const grid = makeGrid(4, 4, 0);
        drawLine(grid, { x: 2, y: 0 }, { x: 2, y: 3 }, 7);
        for (let y = 0; y < 4; y++) {
            assert.strictEqual(grid[y][2], 7);
        }
    });

    it('drawLine draws a diagonal', () => {
        const grid = makeGrid(4, 4, 0);
        drawLine(grid, { x: 0, y: 0 }, { x: 3, y: 3 }, 1);
        for (let i = 0; i < 4; i++) {
            assert.strictEqual(grid[i][i], 1);
        }
    });

    it('drawLine ignores out-of-bounds points', () => {
        const grid = makeGrid(3, 3, 0);
        drawLine(grid, { x: -2, y: 0 }, { x: 5, y: 0 }, 1);
        assert.deepStrictEqual(grid[0], [1, 1, 1]);
    });

    it('drawRectangle outlines the rectangle', () => {
        const grid = makeGrid(5, 5, 0);
        drawRectangle(grid, { x: 1, y: 1, width: 3, height: 3 }, 5);
        assert.deepStrictEqual(grid[1], [0, 5, 5, 5, 0]);
        assert.deepStrictEqual(grid[2], [0, 5, 0, 5, 0]);
        assert.deepStrictEqual(grid[3], [0, 5, 5, 5, 0]);
    });

    it('drawCircle plots a ring of the given radius', () => {
        const grid = makeGrid(7, 7, 0);
        drawCircle(grid, { centerX: 3, centerY: 3, radius: 2 }, 3);
        // The four cardinal points must be on the circle.
        assert.strictEqual(grid[3][1], 3);
        assert.strictEqual(grid[3][5], 3);
        assert.strictEqual(grid[1][3], 3);
        assert.strictEqual(grid[5][3], 3);
        // The center is not part of the outline.
        assert.strictEqual(grid[3][3], 0);
    });
});

describe('Draw SVG helpers', () => {
    it('hexSvg returns a polyline for a position', () => {
        const svg = hexSvg({ x: 0, y: 0 }, 10);
        assert.ok(svg.startsWith('<polyline'));
        assert.ok(svg.includes('fill="black"'));
    });

    it('worldSvg renders one hex per terrain tile', () => {
        const world: World = {
            id: 0,
            actorIds: [],
            terrain: [
                [Terrain.EMPTY, Terrain.BLOCKED],
                [Terrain.EMPTY, Terrain.EMPTY]
            ]
        };
        const svg = worldSvg(world);
        const count = (svg.match(/<polyline/g) || []).length;
        assert.strictEqual(count, 4);
        assert.ok(svg.includes('fill="red"'));
    });

    it('visibilitySvg colours the origin tile red', () => {
        const terrain = makeGrid<Terrain>(2, 2, Terrain.EMPTY);
        const visibility = makeGrid<boolean>(2, 2, false);
        const svg = visibilitySvg(terrain, visibility, 1, 1);
        assert.ok(svg.includes('fill="red"'));
    });

    it('styledHexesSvg is generic over the data type', () => {
        const data: number[][] = [[1, 2], [3, 4]];
        const svg = styledHexesSvg(data, (value: number, _pos: GridPosition) => ({
            fill: value % 2 === 0 ? 'blue' : 'green'
        }));
        assert.ok(svg.includes('fill="blue"'));
        assert.ok(svg.includes('fill="green"'));
    });
});