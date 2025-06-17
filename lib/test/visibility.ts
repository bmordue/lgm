import {
  visibility,
  findNextStep,
  findPath,
  within,
  within,
  hasLineOfSight, // Added hasLineOfSight
} from "../service/Visibility";
import { generateTerrain } from "../service/Rules";
import { Terrain, GridPosition, Actor, ActorState } from "../service/Models"; // Added Actor and ActorState
import { Hex } from "../../Hex"; // Added Hex
import { readFileSync } from "fs";
import assert = require("assert");

function logVisibility(fromX, fromY, grid) {
  for (let x = 0; x < grid.length; x++) {
    let line = "";
    for (let y = 0; y < grid[x].length; y++) {
      if (fromX === x && fromY === y) {
        line += "o";
      } else {
        line += grid[x][y] ? "." : " ";
      }
    }
    console.log(line);
  }
}

function logTerrain(terrain) {
  for (let x = 0; x < terrain.length; x++) {
    let line = "";
    for (let y = 0; y < terrain[x].length; y++) {
      line += terrain[x][y] === Terrain.BLOCKED ? "X" : ".";
    }
    console.log(line);
  }
}

describe("visibility tests", async () => {
  const terrain: Terrain[][] = await generateTerrain();

  logTerrain(terrain);
  console.log();

  const expectedVisible = JSON.parse(
    readFileSync("expectedVisible.json", "utf-8")
  );

  //    logVisibility(0, 0, expectedVisible[0][0]);
  //   writeFileSync("exp_vis_0_0.svg", visibilitySvg(terrain, expectedVisible[0][0], 0, 0));

  for (let x = 0; x < 3; x++) {
    for (let y = 0; y < 3; y++) {
      if (x == 0 && y == 0) {
        continue;
      }
      it(`should calculate visibility from (${x}, ${y})`, () => {
        const visible = visibility({ x: x, y: y }, terrain);

        assert.deepEqual(visible, expectedVisible[x][y]);
        // writeFileSync(`visibility-${x}-${y}.svg`, visibilitySvg(terrain, visible, x, y));
        //logVisibility(x, y, visible);
        //writeFileSync(`exp-vis-${x}-${y}.svg`, visibilitySvg(terrain, expectedVisible[x][y], x, y));
      });
    }
  }

  xit("should calculate visibility from (0, 0)", () => {
    const visible = visibility({ x: 0, y: 0 }, terrain);

    assert.deepEqual(visible, expectedVisible[0][0]);
    //writeFileSync(`visibility-0-0.svg`, visibilitySvg(terrain, visible, 0, 0));
    //writeFileSync(`exp-vis-0-0.svg`, visibilitySvg(terrain, expectedVisible[0][0], 0, 0));
  });
});

describe("hasLineOfSight tests", () => {
    // Helper to create a simple terrain grid for tests
    // GridPosition {x: row, y: col}
    // Terrain is terrain[row][col]
    const createSimpleTerrain = (rows: number, cols: number, blockedCells: GridPosition[] = []): Terrain[][] => {
        const terrain: Terrain[][] = Array(rows).fill(null).map(() => Array(cols).fill(Terrain.EMPTY));
        for (const cell of blockedCells) {
            if (cell.x >= 0 && cell.x < rows && cell.y >= 0 && cell.y < cols) {
                terrain[cell.x][cell.y] = Terrain.BLOCKED;
            }
        }
        return terrain;
    };

    // Default small empty terrain for many tests (e.g., 5x5 or 7x7 for odd-q calculations)
    // Using 7 rows, 7 cols for more space with odd-q.
    // For odd-q: GridPosition.x is row, GridPosition.y is col.
    // hexToGridPosition(new Hex(q,r,s)) -> {x: r + (q-(q&1))/2, y: q}
    // Example: Hex(0,0,0) -> GP(0,0)
    // Hex(1,0,-1) -> GP( (0+(1-1)/2)=0, 1 ) -> GP(0,1)
    // Hex(0,1,-1) -> GP( (1+(0-0)/2)=1, 0 ) -> GP(1,0)
    // Hex(1,-1,0) -> GP( (-1+(1-1)/2)=-1, 1) -> GP(-1,1) --- careful with negative rows

    // Let's define a safe origin for Hex coordinates such that row/col are non-negative.
    // For a 7x7 grid (0-6 rows, 0-6 cols)
    // If Hex(0,0,0) -> GP(0,0), this means q=0, r=0.
    // If Hex(3,0,-3) -> GP(0,3) (col 3, row 0)
    // If Hex(0,3,-3) -> GP(3,0) (col 0, row 3)
    // If Hex(q=2, r=2, s=-4) -> GP(row=2+(2-0)/2 = 3, col=2) -> GP(3,2)

    const R = 7; // rows
    const C = 7; // cols

    it("should return true for a clear straight path (q-axis)", () => {
        const terrain = createSimpleTerrain(R, C);
        const actors: Actor[] = [];
        // Hex(0,0,0) -> GP(0,0) to Hex(2,0,-2) -> GP(0,2)
        const startHex = new Hex(0, 0, 0); // Expected GP(0,0)
        const endHex = new Hex(2, 0, -2);   // Expected GP(0,2) (row 0, col 2)
        assert.strictEqual(hasLineOfSight(startHex, endHex, terrain, actors), true, "Clear Q-axis LoS failed");
    });

    it("should return true for a clear straight path (r-axis)", () => {
        const terrain = createSimpleTerrain(R, C);
        const actors: Actor[] = [];
        // Hex(0,0,0) -> GP(0,0) to Hex(0,2,-2) -> GP(2,0)
        const startHex = new Hex(0, 0, 0); // Expected GP(0,0)
        const endHex = new Hex(0, 2, -2);   // Expected GP(2,0) (row 2, col 0)
        assert.strictEqual(hasLineOfSight(startHex, endHex, terrain, actors), true, "Clear R-axis LoS failed");
    });

    it("should return true for a clear diagonal path", () => {
        const terrain = createSimpleTerrain(R, C);
        const actors: Actor[] = [];
        // Hex(0,0,0) -> GP(0,0) to Hex(2,2,-4) -> GP(3,2) (row 3, col 2)
        // Path: (0,0,0)->GP(0,0), (1,0,-1)->GP(0,1), (1,1,-2)->GP(1,1), (2,1,-3)->GP(1,2), (2,2,-4)->GP(3,2)
        // (0,0) (0,1) (1,1) (1,2) (3,2)
        const startHex = new Hex(0, 0, 0);
        const endHex = new Hex(2, 2, -4);
        assert.strictEqual(hasLineOfSight(startHex, endHex, terrain, actors), true, "Clear diagonal LoS failed");
    });

    it("should return true if start and end are the same hex", () => {
        const terrain = createSimpleTerrain(R, C);
        const actors: Actor[] = [];
        const startHex = new Hex(1, 1, -2); // GP(1,1)
        assert.strictEqual(hasLineOfSight(startHex, startHex, terrain, actors), true, "Same hex LoS failed");
    });

    it("should be blocked by terrain in the middle", () => {
        // Path: Hex(0,0,0) -> GP(0,0) to Hex(2,0,-2) -> GP(0,2)
        // Line: Hex(0,0,0)->GP(0,0), Hex(1,0,-1)->GP(0,1), Hex(2,0,-2)->GP(0,2)
        // Block GP(0,1) which corresponds to Hex(1,0,-1)
        const blockedCell = { x: 0, y: 1 }; // row 0, col 1
        const terrain = createSimpleTerrain(R, C, [blockedCell]);
        const actors: Actor[] = [];
        const startHex = new Hex(0, 0, 0);
        const endHex = new Hex(2, 0, -2);
        assert.strictEqual(hasLineOfSight(startHex, endHex, terrain, actors), false, "Terrain block failed");
    });

    it("should be blocked by terrain at the target hex", () => {
        // Target Hex(2,0,-2) -> GP(0,2)
        const blockedCell = { x: 0, y: 2 }; // row 0, col 2
        const terrain = createSimpleTerrain(R, C, [blockedCell]);
        const actors: Actor[] = [];
        const startHex = new Hex(0, 0, 0);
        const endHex = new Hex(2, 0, -2);
        assert.strictEqual(hasLineOfSight(startHex, endHex, terrain, actors), false, "Terrain block at target failed");
    });

    it("should be blocked by a unit in the middle", () => {
        const terrain = createSimpleTerrain(R, C);
        // Path: Hex(0,0,0) -> GP(0,0) to Hex(2,0,-2) -> GP(0,2)
        // Line: Hex(0,0,0)->GP(0,0), Hex(1,0,-1)->GP(0,1), Hex(2,0,-2)->GP(0,2)
        // Place actor at GP(0,1) which is Hex(1,0,-1)
        const actors: Actor[] = [{ id: 1, pos: { x: 0, y: 1 }, state: ActorState.ALIVE, owner: 1 }];
        const startHex = new Hex(0, 0, 0);
        const endHex = new Hex(2, 0, -2);
        assert.strictEqual(hasLineOfSight(startHex, endHex, terrain, actors), false, "Unit block failed");
    });

    it("should NOT be blocked by a unit at the target hex", () => {
        const terrain = createSimpleTerrain(R, C);
        // Target Hex(2,0,-2) -> GP(0,2)
        const actors: Actor[] = [{ id: 1, pos: { x: 0, y: 2 }, state: ActorState.ALIVE, owner: 1 }];
        const startHex = new Hex(0, 0, 0);
        const endHex = new Hex(2, 0, -2);
        assert.strictEqual(hasLineOfSight(startHex, endHex, terrain, actors), true, "Unit at target should not block LoS");
    });

    it("should be blocked if path goes off-map", () => {
        const terrain = createSimpleTerrain(3, 3); // A small 3x3 grid
        const actors: Actor[] = [];
        // Hex(0,0,0) -> GP(0,0)
        // Hex(4,0,-4) -> GP(0,4) which is off a 3x3 map (cols 0,1,2)
        const startHex = new Hex(0, 0, 0);
        const endHex = new Hex(4, 0, -4);
        assert.strictEqual(hasLineOfSight(startHex, endHex, terrain, actors), false, "Off-map path blocking failed");
    });

    // A test case that requires careful hex to grid conversion understanding.
    // Hex(q=1, r=1, s=-2) under odd-q: col=1, row=1+(1-1)/2 = 1. So GP(1,1)
    // Path from Hex(0,0,0) -> GP(0,0) to Hex(1,1,-2) -> GP(1,1)
    // Linedraw for (0,0,0) to (1,1,-2) is [Hex(0,0,0), Hex(1,1,-2)] (if distance is 1, it's direct)
    // Hex(0,0,0).distance(new Hex(1,1,-2)) is (abs(0-1)+abs(0-1)+abs(0-(-2)))/2 = (1+1+2)/2 = 2. Not 1.
    // Linedraw: (0,0,0) -> (1,1,-2)
    // Path: H(0,0,0)->GP(0,0), H(0,1,-1)->GP(1,0), H(1,1,-2)->GP(1,1) OR
    // Path: H(0,0,0)->GP(0,0), H(1,0,-1)->GP(0,1), H(1,1,-2)->GP(1,1)
    // Hex.linedraw algorithm:
    // N = distance(H(0,0,0), H(1,1,-2)) = 2
    // results:
    // i=0: lerp( (0,0,0), (1,1,-2), 0/2=0 ).round() -> (0,0,0) -> GP(0,0)
    // i=1: lerp( (0,0,0), (1,1,-2), 1/2=0.5 ).round() -> (0.5, 0.5, -1).round() -> Hex(1,0,-1) or Hex(0,1,-1)
    //      q_diff = 0.5, r_diff = 0.5, s_diff = 0. Hex(1,0,-1) or Hex(0,1,-1). Let's say H(1,0,-1) -> GP(0,1)
    // i=2: lerp( (0,0,0), (1,1,-2), 2/2=1 ).round() -> (1,1,-2) -> GP(1,1)
    // So path is GP(0,0) -> GP(0,1) -> GP(1,1)
    it("should handle diagonal path with specific intermediate hex and terrain block", () => {
        // Path GP(0,0) -> GP(0,1) -> GP(1,1)
        // Block GP(0,1)
        const blockedCell = {x: 0, y: 1};
        const terrain = createSimpleTerrain(R,C, [blockedCell]);
        const actors: Actor[] = [];
        const startHex = new Hex(0,0,0);
        const endHex = new Hex(1,1,-2); // Target GP(1,1)
        assert.strictEqual(hasLineOfSight(startHex, endHex, terrain, actors), false, "Diagonal terrain block failed");
    });
});

describe("path finding", async () => {
  // const terrain: Terrain[][] = await generateTerrain();

  it("should find a path", () => {
    const start = { x: 0, y: 0 };
    const goal = { x: 2, y: 2 };

    const path: GridPosition[] = [start];
    let current = start;
    while (current.x != goal.x && current.y != goal.y) {
      current = findNextStep(current, goal);
      path.push(current);
    }
    path.push(goal);
    assert.deepEqual(path, [
      { x: 0, y: 0 },
      { x: 0, y: 1 },
      { x: 1, y: 1 },
      { x: 1, y: 2 },
      { x: 2, y: 2 },
    ]);
  });
});

describe("visibility (claude)", () => {
  it("should throw error if start point is not within grid", () => {
    const terrain: Terrain[][] = [[Terrain.EMPTY]];
    const start: GridPosition = { x: 1, y: 0 };
    assert.throws(() => visibility(start, terrain));
  });

  it("should throw if grid is empty", () => {
    const terrain: Terrain[][] = [];
    const start = { x: 0, y: 0 };
    assert.throws(() => visibility(start, terrain));
  });

  it("should mark all non-blocked as visible", () => {
    const terrain = [
      [Terrain.EMPTY, Terrain.EMPTY],
      [Terrain.EMPTY, Terrain.EMPTY],
    ];
    const start = { x: 0, y: 0 };
    const expected = [
      [true, true],
      [true, true],
    ];
    assert.deepEqual(visibility(start, terrain), expected);
  });
});

describe("findPath through empty terrain", () => {
  const terrain = [
    [Terrain.EMPTY, Terrain.EMPTY],
    [Terrain.EMPTY, Terrain.EMPTY],
  ];

  it("should return a path from start to goal", () => {
    const start = { x: 0, y: 0 };
    const goal = { x: 1, y: 1 };
    const expectedPath = [
      { x: 0, y: 0 },
      { x: 0, y: 1 },
      { x: 1, y: 1 },
    ];

    assert.deepEqual(findPath(start, goal, terrain), expectedPath);
  });

  it("should be able to find a path up and left", () => {
    const start = { x: 0, y: 0 };
    const goal = { x: 1, y: 1 };
    const expectedPath = [
      { x: 0, y: 0 },
      { x: 0, y: 1 },
      { x: 1, y: 1 },
    ];

    assert.deepEqual(findPath(start, goal, terrain), expectedPath);
  });

  it("should handle a path to current location", () => {
    const start = { x: 1, y: 1 };
    const goal = { x: 1, y: 1 };
    const expectedPath = [{ x: 1, y: 1 }];

    assert.deepEqual(findPath(start, goal, terrain), expectedPath);
  });
});

describe("within function tests", () => {
  it("should return false when the grid is undefined", () => {
    assert.equal(within(0, 0, undefined), false);
  });

  it("should return false when the grid is an empty array", () => {
    assert.equal(within(0, 0, []), false);
  });

  it("should return false when the x and y coordinates are negative", () => {
    assert.equal(
      within(-1, -1, [
        [1, 2],
        [3, 4],
      ]),
      false
    );
  });

  it("should return false when the x coordinate is greater than the length of the grid", () => {
    assert.equal(
      within(2, 0, [
        [1, 2],
        [3, 4],
      ]),
      false
    );
  });

  it("should return false when the y coordinate is greater than the length of the first element of the grid", () => {
    assert.equal(
      within(0, 2, [
        [1, 2],
        [3, 4],
      ]),
      false
    );
  });

  it("should return true when the x and y coordinates are within the bounds of the grid (2x2)", () => {
    assert.equal(
      within(0, 0, [
        [0, 0],
        [0, 0],
      ]),
      true
    );
  });

  it("should return true when the x and y coordinates are within the bounds of the grid (3x3)", () => {
    assert.equal(
      within(0, 0, [
        [0, 0, 0],
        [0, 0, 0],
        [0, 0, 0],
      ]),
      true
    );
  });
});

describe.skip("findPath with some blocked terrain", () => {
  const terrain = [
    [Terrain.EMPTY, Terrain.EMPTY, Terrain.EMPTY],
    [Terrain.EMPTY, Terrain.BLOCKED, Terrain.EMPTY],
    [Terrain.EMPTY, Terrain.EMPTY, Terrain.EMPTY],
  ];

  it("should find path from (0,0) to (0,2)", () => {
    const start = { x: 0, y: 0 };
    const goal = { x: 0, y: 2 };
    const expectedPath = [
      { x: 0, y: 0 },
      { x: 0, y: 1 },
      { x: 0, y: 2 },
    ];

    assert.deepEqual(findPath(start, goal, terrain), expectedPath);
  });

  it("should find path from (1,0) to (1,2)", () => {
    const start = { x: 1, y: 0 };
    const goal = { x: 1, y: 2 };
    const expectedPath = [
      { x: 1, y: 0 },
      { x: 0, y: 0 },
      { x: 0, y: 1 },
      { x: 0, y: 2 },
      { x: 1, y: 2 },
    ];

    assert.deepEqual(findPath(start, goal, terrain), expectedPath);
  });

  it("should find path from (0,0) to (2,2)", () => {
    const start = { x: 0, y: 0 };
    const goal = { x: 2, y: 2 };
    const expectedPath = [
      { x: 0, y: 0 },
      { x: 0, y: 1 },
      { x: 0, y: 2 },
      { x: 1, y: 2 },
      { x: 2, y: 2 },
    ];

    assert.deepEqual(findPath(start, goal, terrain), expectedPath);
  });
});
