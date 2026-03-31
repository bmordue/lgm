/**
 * Tests for test data factories (api/test/helpers/factories.ts)
 *
 * Each factory function is exercised to confirm it:
 *   1. Returns an object that satisfies the expected interface
 *   2. Honours field overrides
 *   3. Produces unique IDs across calls
 * Trait and scenario builders are also covered.
 */

import assert = require("assert");
import {
  ActorState,
  Direction,
  GameState,
  OrderType,
  Terrain,
} from "../service/Models";

import {
  // primitives
  buildGridPosition,
  buildWeapon,
  buildMeleeWeapon,
  buildSniperWeapon,
  // actor
  buildActor,
  buildDeadActor,
  buildActorAt,
  buildActorFormation,
  // world
  buildWorld,
  buildWorldWithActors,
  // game
  buildGame,
  buildInProgressGame,
  buildCompletedGame,
  // player
  buildPlayer,
  buildHostPlayer,
  // orders
  buildMoveOrder,
  buildAttackOrder,
  buildMarchOrders,
  buildTurnOrders,
  buildTurnOrdersWithMarch,
  // turn result
  buildTurnResult,
  // scenario
  buildTwoPlayerScenario,
  // validation
  isValidGridPosition,
  isValidActor,
  isValidGame,
  isValidTurnOrders,
  // counter
  resetIdCounter,
} from "./helpers/factories";

beforeEach(() => {
  resetIdCounter();
});

// ---------------------------------------------------------------------------
// GridPosition
// ---------------------------------------------------------------------------

describe("buildGridPosition", () => {
  it("returns default (0, 0)", () => {
    const pos = buildGridPosition();
    assert.equal(pos.x, 0);
    assert.equal(pos.y, 0);
  });

  it("honours overrides", () => {
    const pos = buildGridPosition({ x: 3, y: 7 });
    assert.equal(pos.x, 3);
    assert.equal(pos.y, 7);
  });
});

// ---------------------------------------------------------------------------
// Weapon
// ---------------------------------------------------------------------------

describe("buildWeapon", () => {
  it("returns a weapon with required fields", () => {
    const w = buildWeapon();
    assert.ok(w.name, "name should be set");
    assert.equal(typeof w.minRange, "number");
    assert.equal(typeof w.maxRange, "number");
    assert.equal(typeof w.damage, "number");
    assert.ok(w.maxRange >= w.minRange, "maxRange must be >= minRange");
  });

  it("honours overrides", () => {
    const w = buildWeapon({ name: "Custom Gun", damage: 99 });
    assert.equal(w.name, "Custom Gun");
    assert.equal(w.damage, 99);
  });
});

describe("buildMeleeWeapon", () => {
  it("has a maxRange of 1", () => {
    const w = buildMeleeWeapon();
    assert.equal(w.maxRange, 1);
    assert.equal(w.minRange, 0);
  });
});

describe("buildSniperWeapon", () => {
  it("has a long range", () => {
    const w = buildSniperWeapon();
    assert.ok(w.maxRange >= 10, "sniper should have maxRange >= 10");
  });
});

// ---------------------------------------------------------------------------
// Actor
// ---------------------------------------------------------------------------

describe("buildActor", () => {
  it("returns an alive actor with all required fields", () => {
    const a = buildActor();
    assert.equal(typeof a.id, "number");
    assert.equal(a.state, ActorState.ALIVE);
    assert.ok(a.pos, "pos should be set");
    assert.equal(typeof a.owner, "number");
  });

  it("produces unique IDs", () => {
    const a1 = buildActor();
    const a2 = buildActor();
    assert.notEqual(a1.id, a2.id);
  });

  it("honours overrides", () => {
    const a = buildActor({ owner: 42, health: 50 });
    assert.equal(a.owner, 42);
    assert.equal(a.health, 50);
  });
});

describe("buildDeadActor", () => {
  it("returns a dead actor with 0 health", () => {
    const a = buildDeadActor();
    assert.equal(a.state, ActorState.DEAD);
    assert.equal(a.health, 0);
  });
});

describe("buildActorAt", () => {
  it("places the actor at the given coordinates", () => {
    const a = buildActorAt(4, 6);
    assert.equal(a.pos.x, 4);
    assert.equal(a.pos.y, 6);
  });
});

describe("buildActorFormation", () => {
  it("returns 9 actors in a 3×3 grid", () => {
    const actors = buildActorFormation(1);
    assert.equal(actors.length, 9);
  });

  it("assigns the correct owner to all actors", () => {
    const actors = buildActorFormation(7);
    assert.ok(actors.every((a) => a.owner === 7));
  });

  it("generates actors at distinct positions", () => {
    const actors = buildActorFormation(1, 0, 0);
    const positions = actors.map((a) => `${a.pos.x},${a.pos.y}`);
    const unique = new Set(positions);
    assert.equal(unique.size, 9);
  });

  it("respects origin offset", () => {
    const actors = buildActorFormation(1, 5, 5);
    const xs = actors.map((a) => a.pos.x);
    assert.ok(Math.min(...xs) >= 5);
  });
});

// ---------------------------------------------------------------------------
// World
// ---------------------------------------------------------------------------

describe("buildWorld", () => {
  it("returns a world with empty terrain", () => {
    const w = buildWorld();
    assert.ok(Array.isArray(w.terrain));
    assert.ok(w.terrain.length > 0);
    assert.ok(
      w.terrain[0].every((cell: Terrain) => cell === Terrain.EMPTY)
    );
  });

  it("has no actors by default", () => {
    const w = buildWorld();
    assert.deepEqual(w.actorIds, []);
    assert.deepEqual(w.actors, []);
  });

  it("honours overrides", () => {
    const w = buildWorld({ actorIds: [1, 2, 3] });
    assert.deepEqual(w.actorIds, [1, 2, 3]);
  });
});

describe("buildWorldWithActors", () => {
  it("populates actors and actorIds for the given owner", () => {
    const w = buildWorldWithActors(5);
    assert.equal(w.actors!.length, 9);
    assert.equal(w.actorIds.length, 9);
    assert.ok(w.actors!.every((a) => a.owner === 5));
  });

  it("actorIds match actor.id values", () => {
    const w = buildWorldWithActors(1);
    const ids = w.actors!.map((a) => a.id).sort();
    const actorIds = [...w.actorIds].sort();
    assert.deepEqual(ids, actorIds);
  });
});

// ---------------------------------------------------------------------------
// Game
// ---------------------------------------------------------------------------

describe("buildGame", () => {
  it("returns a LOBBY game with required fields", () => {
    const g = buildGame();
    assert.equal(g.gameState, GameState.LOBBY);
    assert.equal(typeof g.turn, "number");
    assert.ok(g.turn >= 1);
    assert.equal(typeof g.worldId, "number");
  });

  it("produces unique IDs", () => {
    const g1 = buildGame();
    const g2 = buildGame();
    assert.notEqual(g1.id, g2.id);
  });

  it("honours overrides", () => {
    const g = buildGame({ maxPlayers: 2, turn: 5 });
    assert.equal(g.maxPlayers, 2);
    assert.equal(g.turn, 5);
  });
});

describe("buildInProgressGame", () => {
  it("has IN_PROGRESS state and a startedAt date", () => {
    const g = buildInProgressGame();
    assert.equal(g.gameState, GameState.IN_PROGRESS);
    assert.ok(g.startedAt instanceof Date);
  });
});

describe("buildCompletedGame", () => {
  it("has COMPLETED state", () => {
    const g = buildCompletedGame();
    assert.equal(g.gameState, GameState.COMPLETED);
  });
});

// ---------------------------------------------------------------------------
// Player
// ---------------------------------------------------------------------------

describe("buildPlayer", () => {
  it("returns a non-host player with required fields", () => {
    const p = buildPlayer();
    assert.equal(typeof p.id, "number");
    assert.equal(typeof p.gameId, "number");
    assert.ok(p.username, "username should be set");
    assert.equal(p.isHost, false);
  });

  it("produces unique IDs", () => {
    const p1 = buildPlayer();
    const p2 = buildPlayer();
    assert.notEqual(p1.id, p2.id);
  });

  it("honours overrides", () => {
    const p = buildPlayer({ username: "alice", gameId: 99 });
    assert.equal(p.username, "alice");
    assert.equal(p.gameId, 99);
  });
});

describe("buildHostPlayer", () => {
  it("has isHost set to true", () => {
    const p = buildHostPlayer();
    assert.equal(p.isHost, true);
  });
});

// ---------------------------------------------------------------------------
// ActorOrders
// ---------------------------------------------------------------------------

describe("buildMoveOrder", () => {
  it("creates a MOVE order for the given actor", () => {
    const o = buildMoveOrder(10);
    assert.equal(o.actorId, 10);
    assert.equal(o.orderType, OrderType.MOVE);
    assert.ok(Array.isArray(o.ordersList));
    assert.ok(o.ordersList!.length > 0);
  });

  it("uses the supplied directions", () => {
    const dirs = [Direction.LEFT, Direction.DOWN_LEFT];
    const o = buildMoveOrder(1, dirs);
    assert.deepEqual(o.ordersList, dirs);
  });
});

describe("buildAttackOrder", () => {
  it("creates an ATTACK order with a target", () => {
    const o = buildAttackOrder(1, 2);
    assert.equal(o.actorId, 1);
    assert.equal(o.orderType, OrderType.ATTACK);
    assert.equal(o.targetId, 2);
  });
});

describe("buildMarchOrders", () => {
  it("returns one order per actor", () => {
    const actors = buildActorFormation(1);
    const orders = buildMarchOrders(actors);
    assert.equal(orders.length, actors.length);
  });

  it("all orders are MOVE orders", () => {
    const actors = buildActorFormation(1);
    const orders = buildMarchOrders(actors);
    assert.ok(orders.every((o) => o.orderType === OrderType.MOVE));
  });

  it("uses the specified direction", () => {
    const actors = [buildActor({ id: 5 })];
    const orders = buildMarchOrders(actors, Direction.DOWN_RIGHT);
    assert.deepEqual(orders[0].ordersList, [Direction.DOWN_RIGHT]);
  });
});

// ---------------------------------------------------------------------------
// TurnOrders
// ---------------------------------------------------------------------------

describe("buildTurnOrders", () => {
  it("returns valid turn orders with empty orders list", () => {
    const t = buildTurnOrders();
    assert.ok(isValidTurnOrders(t));
    assert.deepEqual(t.orders, []);
  });

  it("honours overrides", () => {
    const t = buildTurnOrders({ gameId: 7, turn: 3, playerId: 2 });
    assert.equal(t.gameId, 7);
    assert.equal(t.turn, 3);
    assert.equal(t.playerId, 2);
  });
});

describe("buildTurnOrdersWithMarch", () => {
  it("includes move orders for each actor", () => {
    const actors = buildActorFormation(1);
    const t = buildTurnOrdersWithMarch(actors);
    assert.equal(t.orders.length, actors.length);
    assert.ok(t.orders.every((o) => o.orderType === OrderType.MOVE));
  });
});

// ---------------------------------------------------------------------------
// TurnResult
// ---------------------------------------------------------------------------

describe("buildTurnResult", () => {
  it("returns a turn result with a world", () => {
    const r = buildTurnResult();
    assert.ok(r.world, "world should be set");
    assert.equal(typeof r.gameId, "number");
    assert.equal(typeof r.turn, "number");
    assert.equal(typeof r.playerId, "number");
  });

  it("honours overrides", () => {
    const w = buildWorld({ actorIds: [1, 2] });
    const r = buildTurnResult({ gameId: 5, turn: 2, world: w });
    assert.equal(r.gameId, 5);
    assert.equal(r.turn, 2);
    assert.deepEqual(r.world.actorIds, [1, 2]);
  });
});

// ---------------------------------------------------------------------------
// Scenario builders
// ---------------------------------------------------------------------------

describe("buildTwoPlayerScenario", () => {
  it("returns a consistent two-player game structure", () => {
    const s = buildTwoPlayerScenario();

    // Game contains both players
    assert.ok(s.game.players!.includes(s.host.id!));
    assert.ok(s.game.players!.includes(s.guest.id!));
    assert.equal(s.game.hostPlayerId, s.host.id);

    // Host flag is correct
    assert.equal(s.host.isHost, true);
    assert.equal(s.guest.isHost, false);

    // Both players share the same gameId
    assert.equal(s.host.gameId, s.game.id);
    assert.equal(s.guest.gameId, s.game.id);

    // 18 actors total (9 per player)
    assert.equal(s.world.actors!.length, 18);
    assert.equal(s.hostActors.length, 9);
    assert.equal(s.guestActors.length, 9);

    // Actors owned by correct players
    assert.ok(s.hostActors.every((a) => a.owner === s.host.id));
    assert.ok(s.guestActors.every((a) => a.owner === s.guest.id));

    // World actorIds match
    const allActorIds = [...s.hostActors, ...s.guestActors].map((a) => a.id);
    assert.deepEqual(s.world.actorIds.sort(), allActorIds.sort());

    // Game is in progress
    assert.equal(s.game.gameState, GameState.IN_PROGRESS);
  });
});

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

describe("isValidGridPosition", () => {
  it("accepts positions inside the grid", () => {
    assert.ok(isValidGridPosition({ x: 0, y: 0 }));
    assert.ok(isValidGridPosition({ x: 9, y: 9 }));
  });

  it("rejects out-of-bounds positions", () => {
    assert.equal(isValidGridPosition({ x: -1, y: 0 }), false);
    assert.equal(isValidGridPosition({ x: 0, y: 10 }), false);
    assert.equal(isValidGridPosition({ x: 10, y: 0 }), false);
  });

  it("rejects non-integer coordinates", () => {
    assert.equal(isValidGridPosition({ x: 1.5, y: 0 }), false);
  });
});

describe("isValidActor", () => {
  it("accepts a well-formed actor", () => {
    const a = buildActor();
    assert.ok(isValidActor(a));
  });

  it("rejects an actor with invalid position", () => {
    const a = buildActor({ pos: { x: -1, y: 0 } });
    assert.equal(isValidActor(a), false);
  });

  it("accepts a dead actor (dead is a valid state)", () => {
    const a = buildDeadActor();
    assert.ok(isValidActor(a));
  });
});

describe("isValidGame", () => {
  it("accepts a well-formed game", () => {
    assert.ok(isValidGame(buildGame()));
    assert.ok(isValidGame(buildInProgressGame()));
    assert.ok(isValidGame(buildCompletedGame()));
  });

  it("rejects a game with turn < 1", () => {
    const g = buildGame({ turn: 0 });
    assert.equal(isValidGame(g), false);
  });
});

describe("isValidTurnOrders", () => {
  it("accepts well-formed turn orders", () => {
    assert.ok(isValidTurnOrders(buildTurnOrders()));
  });

  it("rejects orders with gameId <= 0", () => {
    const t = buildTurnOrders({ gameId: 0 });
    assert.equal(isValidTurnOrders(t), false);
  });

  it("rejects orders with turn < 1", () => {
    const t = buildTurnOrders({ turn: 0 });
    assert.equal(isValidTurnOrders(t), false);
  });
});
