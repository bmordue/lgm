import assert = require("assert");
import * as store from "../service/Store";
import * as OrderService from "../service/OrderService";
import { Actor, ActorState, Game, OrderType, Terrain, World } from "../service/Models";
import { WEAPON_TYPES } from "../config/WeaponsConfig";

describe("OrderService ATTACK validation", () => {
  const TEST_WORLD_SIZE = 20;

  beforeEach(async () => {
    await store.deleteAll();
  });

  async function createGameWithActors(
    attackerPos: { x: number; y: number },
    targetPos: { x: number; y: number },
    terrainOverride?: Terrain[][]
  ): Promise<{ gameId: number; attackerId: number; targetId: number }> {
    const terrain = terrainOverride ?? Array(TEST_WORLD_SIZE).fill(null).map(() => Array(TEST_WORLD_SIZE).fill(Terrain.EMPTY));

    const attackerId = await store.create<Omit<Actor, "id">>(store.keys.actors, {
      owner: 1,
      pos: attackerPos,
      state: ActorState.ALIVE,
      health: 100,
      weapon: { ...WEAPON_TYPES.RIFLE },
    });

    const targetId = await store.create<Omit<Actor, "id">>(store.keys.actors, {
      owner: 2,
      pos: targetPos,
      state: ActorState.ALIVE,
      health: 100,
      weapon: { ...WEAPON_TYPES.RIFLE },
    });

    const worldId = await store.create<World>(store.keys.worlds, {
      actorIds: [attackerId, targetId],
      terrain,
    });

    const gameId = await store.create<Game>(store.keys.games, {
      turn: 1,
      worldId,
      players: [1, 2],
    });

    return { gameId, attackerId, targetId };
  }

  it("rejects ATTACK orders when target is out of range", async () => {
    const { gameId, attackerId, targetId } = await createGameWithActors(
      { x: 0, y: 0 },
      { x: 9, y: 9 }
    );

    try {
      await OrderService.postOrders(
        { orders: [{ actorId: attackerId, orderType: OrderType.ATTACK, targetId }] },
        gameId,
        1,
        1
      );
      assert.fail("Expected out-of-range ATTACK order to be rejected");
    } catch (e) {
      assert.ok(e.message.includes("Invalid attack order"));
      assert.ok(e.message.includes("Target too far"));
    }
  });

  it("rejects ATTACK orders when line of sight is blocked", async () => {
    const terrain = Array(TEST_WORLD_SIZE).fill(null).map(() => Array(TEST_WORLD_SIZE).fill(Terrain.EMPTY));
    terrain[1][0] = Terrain.BLOCKED;

    const { gameId, attackerId, targetId } = await createGameWithActors(
      { x: 0, y: 0 },
      { x: 3, y: 0 },
      terrain
    );

    try {
      await OrderService.postOrders(
        { orders: [{ actorId: attackerId, orderType: OrderType.ATTACK, targetId }] },
        gameId,
        1,
        1
      );
      assert.fail("Expected blocked-LOS ATTACK order to be rejected");
    } catch (e) {
      assert.ok(e.message.includes("Invalid attack order"));
      assert.ok(e.message.includes("No line of sight"));
    }
  });
});
