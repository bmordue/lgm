import { Terrain } from '../service/Models';
import { visibility } from '../service/Visibility';
import { GridPosition } from '../service/Models';
import assert = require('assert');

describe("visibility tests", () => {
  it("should calculate visibility for a valid starting point", () => {
    const terrain: Terrain[][] = [
      [Terrain.OPEN, Terrain.OPEN, Terrain.OPEN],
      [Terrain.OPEN, Terrain.OPEN, Terrain.OPEN],
      [Terrain.OPEN, Terrain.OPEN, Terrain.OPEN]
    ];

    const expectedVisible: boolean[][] = [
      [true, true, true],
      [true, true, true],
      [true, true, true]
    ];

    const visible = visibility({ x: 0, y: 0 }, terrain);

    assert.deepEqual(visible, expectedVisible);
  });

  it("should throw an error for an invalid starting point", () => {
    const terrain: Terrain[][] = [
      [Terrain.OPEN, Terrain.OPEN, Terrain.OPEN],
      [Terrain.OPEN, Terrain.OPEN, Terrain.OPEN],
      [Terrain.OPEN, Terrain.OPEN, Terrain.OPEN]
    ];

    assert.throws(() => {
      visibility({ x: 3, y: 3 }, terrain);
    }, Error);
  });

  // Add more test cases here to cover different scenarios and edge cases
});
