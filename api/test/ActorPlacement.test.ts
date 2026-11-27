import assert = require("assert");
import * as ActorPlacement from "../service/ActorPlacement";
import { ActorState, Terrain } from "../service/Models";

describe("ActorPlacement", function () {
  const createTerrain = (
    width: number,
    height: number,
    blocked: Array<{ x: number; y: number }> = []
  ) => {
    const terrain = Array.from({ length: width }, () =>
      Array(height).fill(Terrain.EMPTY)
    );

    for (const cell of blocked) {
      terrain[cell.x][cell.y] = Terrain.BLOCKED;
    }

    return terrain;
  };

  it("should return opposite corner zones for two players", function () {
    const zones = ActorPlacement.getSpawnZonesForPlayerCount(2, { width: 10, height: 10 }, 3);
    assert.deepEqual(zones.map((zone) => zone.origin), [{ x: 0, y: 0 }, { x: 7, y: 7 }]);
  });

  it("should return four corner zones for four players", function () {
    const zones = ActorPlacement.getSpawnZonesForPlayerCount(4, { width: 10, height: 10 }, 3);
    assert.deepEqual(zones.map((zone) => zone.origin), [
      { x: 0, y: 0 },
      { x: 7, y: 7 },
      { x: 0, y: 7 },
      { x: 7, y: 0 },
    ]);
  });

  it("should reject blocked or occupied spawn areas", function () {
    const terrain = createTerrain(10, 10, [{ x: 1, y: 1 }]);

    assert.equal(ActorPlacement.isValidSpawnArea(0, 0, 3, terrain, []), false);
    assert.equal(
      ActorPlacement.isValidSpawnArea(
        7,
        7,
        3,
        createTerrain(10, 10),
        [{ id: 1, owner: 1, pos: { x: 8, y: 8 }, health: 100, state: ActorState.ALIVE }]
      ),
      false
    );
  });

  it("should favor the opposite corner away from existing players", function () {
    const terrain = createTerrain(10, 10);
    const origin = ActorPlacement.findSpawnOrigin(
      terrain,
      3,
      [],
      [{ x: 0, y: 0 }],
      { name: "SE", origin: { x: 7, y: 7 } }
    );

    assert.deepEqual(origin, { x: 7, y: 7 });
  });

    it("should fall back to another empty origin when the preferred zone is blocked", function () {
      const blockedCells = [];
      for (let x = 0; x < 3; x++) {
        for (let y = 0; y < 3; y++) {
          blockedCells.push({ x, y });
        }
      }

      const terrain = createTerrain(10, 10, blockedCells);
      const origin = ActorPlacement.findSpawnOrigin(
        terrain,
        3,
        [],
        [],
        { name: "NW", origin: { x: 0, y: 0 } }
      );

      if (!origin) {
        assert.fail("Expected a fallback origin");
      }
      assert.notDeepEqual(origin, { x: 0, y: 0 });
      assert.equal(ActorPlacement.isValidSpawnArea(origin.x, origin.y, 3, terrain, []), true);
    });

  describe("getSpawnZonesForPlayerCount", function () {
    it("should return three triangular zones for three players", function () {
      const zones = ActorPlacement.getSpawnZonesForPlayerCount(3, { width: 10, height: 10 }, 3);
      assert.equal(zones.length, 3);
      assert.deepEqual(zones.map((z) => z.name), ["N", "SW", "SE"]);
    });

    it("should return four corner zones for four players", function () {
      const zones = ActorPlacement.getSpawnZonesForPlayerCount(4, { width: 10, height: 10 }, 3);
      assert.equal(zones.length, 4);
      assert.deepEqual(
        zones.map((z) => z.name).sort(),
        ["NE", "NW", "SE", "SW"]
      );
    });

    it("should return eight perimeter zones for eight players", function () {
      const zones = ActorPlacement.getSpawnZonesForPlayerCount(8, { width: 10, height: 10 }, 3);
      assert.equal(zones.length, 8);
    });

    it("should only return requested zones when player count is 5, 6 or 7", function () {
      assert.equal(ActorPlacement.getSpawnZonesForPlayerCount(5, { width: 10, height: 10 }, 3).length, 5);
      assert.equal(ActorPlacement.getSpawnZonesForPlayerCount(6, { width: 10, height: 10 }, 3).length, 6);
      assert.equal(ActorPlacement.getSpawnZonesForPlayerCount(7, { width: 10, height: 10 }, 3).length, 7);
    });

    it("should set each zone priority", function () {
      const zones = ActorPlacement.getSpawnZonesForPlayerCount(2, { width: 10, height: 10 }, 3);
      zones.forEach((zone) => {
        assert.ok(typeof zone.priority === "number");
      });
    });
  });

  describe("scorePosition", function () {
    const terrain = createTerrain(10, 10);
    const worldCenter = { x: 5, y: 5 };

    it("should give a higher distance score the farther it is from existing players", function () {
      const near = ActorPlacement.scorePosition({ x: 0, y: 0 }, 3, terrain, [{ x: 0, y: 0 }], worldCenter);
      const far = ActorPlacement.scorePosition({ x: 7, y: 7 }, 3, terrain, [{ x: 0, y: 0 }], worldCenter);
      assert.ok(far.distanceScore > near.distanceScore);
    });

    it("should return distance score 0 when no existing players exist", function () {
      const scored = ActorPlacement.scorePosition({ x: 0, y: 0 }, 3, terrain, [], worldCenter);
      assert.equal(scored.distanceScore, 0);
    });

    it("should return terrain score 1 on fully empty terrain", function () {
      const scored = ActorPlacement.scorePosition({ x: 0, y: 0 }, 3, terrain, [], worldCenter);
      assert.equal(scored.terrainScore, 1);
    });

    it("should return terrain score 0 on fully blocked terrain", function () {
      const blockedTerrain = createTerrain(10, 10);
      for (let x = 0; x < 3; x++) {
        for (let y = 0; y < 3; y++) {
          blockedTerrain[x][y] = Terrain.BLOCKED;
        }
      }
      const scored = ActorPlacement.scorePosition({ x: 0, y: 0 }, 3, blockedTerrain, [], worldCenter);
      assert.equal(scored.terrainScore, 0);
    });

    it("should give higher centrality for positions closer to world centre", function () {
      const center = ActorPlacement.scorePosition({ x: 5, y: 5 }, 3, terrain, [], worldCenter);
      const edge = ActorPlacement.scorePosition({ x: 0, y: 0 }, 3, terrain, [], worldCenter);
      assert.ok(center.centralityScore > edge.centralityScore);
    });
  });

  describe("findOptimalSpawnPosition", function () {
    it("should find a position on empty terrain with no existing players", function () {
      const terrain = createTerrain(10, 10);
      const pos = ActorPlacement.findOptimalSpawnPosition(terrain, 3, [], []);
      assert.ok(pos !== undefined);
      assert.equal(pos.x, 0);
      assert.equal(pos.y, 0);
    });

    it("should maximise distance from existing players", function () {
      const terrain = createTerrain(10, 10);
      const pos = ActorPlacement.findOptimalSpawnPosition(
        terrain,
        3,
        [],
        [{ x: 0, y: 0 }],
        { name: "SE", origin: { x: 7, y: 7 } }
      );
      assert.ok(pos !== undefined);
      const dist = Math.sqrt(Math.pow(pos.x, 2) + Math.pow(pos.y, 2));
      assert.ok(dist > 6);
    });

    it("should anchor to the preferred zone", function () {
      const terrain = createTerrain(10, 10);
      const pos = ActorPlacement.findOptimalSpawnPosition(
        terrain,
        3,
        [],
        [{ x: 0, y: 0 }],
        { name: "SE", origin: { x: 7, y: 7 } }
      );
      assert.ok(pos !== undefined);
      assert.ok(pos.x >= 6 || pos.y >= 6);
    });

    it("should fall back to a different valid position when the preferred zone is blocked", function () {
      const blockedCells = [];
      for (let x = 0; x < 3; x++) {
        for (let y = 0; y < 3; y++) {
          blockedCells.push({ x, y });
        }
      }
      const terrain = createTerrain(10, 10, blockedCells);
      const pos = ActorPlacement.findOptimalSpawnPosition(
        terrain,
        3,
        [],
        [],
        { name: "NW", origin: { x: 0, y: 0 } }
      );
      assert.ok(pos !== undefined);
      assert.ok(pos.x !== 0 || pos.y !== 0);
      assert.equal(ActorPlacement.isValidSpawnArea(pos.x, pos.y, 3, terrain, []), true);
    });

    it("should return undefined when no valid spawn fits", function () {
      const terrain = createTerrain(10, 10);
      for (let x = 0; x < 10; x++) {
        for (let y = 0; y < 10; y++) {
          terrain[x][y] = Terrain.BLOCKED;
        }
      }
      const pos = ActorPlacement.findOptimalSpawnPosition(terrain, 3, [], []);
      assert.equal(pos, undefined);
    });
  });
});


