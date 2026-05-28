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

    assert.notDeepEqual(origin, { x: 0, y: 0 });
    if (!origin) {
      assert.fail("Expected a fallback origin");
    }
    assert.equal(ActorPlacement.isValidSpawnArea(origin.x, origin.y, 3, terrain, []), true);
  });
});
