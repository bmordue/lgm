/**
 * Test Data Factories
 *
 * Provides factory functions for every model/entity in the game, with sensible
 * defaults and support for overriding any field.  Includes:
 *   - Per-model factory functions
 *   - Trait helpers for common variations
 *   - Scenario builders for complex multi-model setups
 *   - Validation helpers
 */

import {
  Actor,
  ActorOrders,
  ActorState,
  Direction,
  Game,
  GameState,
  GridPosition,
  OrderType,
  Player,
  Terrain,
  TurnOrders,
  TurnResult,
  Weapon,
  World,
} from "../../service/Models";

// ---------------------------------------------------------------------------
// Internal counter used to generate unique IDs across factory calls so that
// multiple objects created in a single test do not accidentally share IDs.
// ---------------------------------------------------------------------------
let _idCounter = 1;
function nextId(): number {
  return _idCounter++;
}

/** Reset the internal ID counter – call this in beforeEach if needed. */
export function resetIdCounter(): void {
  _idCounter = 1;
}

// ---------------------------------------------------------------------------
// GridPosition
// ---------------------------------------------------------------------------

/**
 * Build a GridPosition with default values (0, 0).
 * Any field can be overridden via the `overrides` parameter.
 */
export function buildGridPosition(overrides: Partial<GridPosition> = {}): GridPosition {
  return {
    x: 0,
    y: 0,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Weapon
// ---------------------------------------------------------------------------

/**
 * Build a Weapon with default values matching the Standard Issue Blaster used
 * in the rest of the game.
 */
export function buildWeapon(overrides: Partial<Weapon> = {}): Weapon {
  return {
    name: "Standard Issue Blaster",
    minRange: 0,
    maxRange: 5,
    damage: 10,
    ammo: 100,
    ...overrides,
  };
}

// Traits ──────────────────────────────────────────────────────────────────

/** A short-range melee weapon. */
export function buildMeleeWeapon(overrides: Partial<Weapon> = {}): Weapon {
  return buildWeapon({
    name: "Melee Weapon",
    minRange: 0,
    maxRange: 1,
    damage: 25,
    ammo: undefined,
    ...overrides,
  });
}

/** A long-range sniper weapon. */
export function buildSniperWeapon(overrides: Partial<Weapon> = {}): Weapon {
  return buildWeapon({
    name: "Sniper Rifle",
    minRange: 5,
    maxRange: 15,
    damage: 50,
    ammo: 5,
    ...overrides,
  });
}

// ---------------------------------------------------------------------------
// Actor
// ---------------------------------------------------------------------------

/**
 * Build an Actor with sensible defaults.  The actor is alive, positioned at
 * (0, 0), and equipped with the standard blaster.
 */
export function buildActor(overrides: Partial<Actor> = {}): Actor {
  return {
    id: nextId(),
    pos: buildGridPosition(),
    state: ActorState.ALIVE,
    owner: 1,
    health: 100,
    weapon: buildWeapon(),
    ...overrides,
  };
}

// Traits ──────────────────────────────────────────────────────────────────

/** Build a dead actor. */
export function buildDeadActor(overrides: Partial<Actor> = {}): Actor {
  return buildActor({ state: ActorState.DEAD, health: 0, ...overrides });
}

/** Build an actor at a specific position. */
export function buildActorAt(
  x: number,
  y: number,
  overrides: Partial<Actor> = {}
): Actor {
  return buildActor({ pos: buildGridPosition({ x, y }), ...overrides });
}

/**
 * Build an array of actors in a 3×3 formation starting at (originX, originY),
 * all owned by `ownerId`.  This mirrors the actor placement used by Rules.ts.
 */
export function buildActorFormation(
  ownerId: number,
  originX = 0,
  originY = 0,
  overrides: Partial<Actor> = {}
): Actor[] {
  const actors: Actor[] = [];
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      actors.push(
        buildActor({
          pos: buildGridPosition({ x: originX + col, y: originY + row }),
          owner: ownerId,
          ...overrides,
        })
      );
    }
  }
  return actors;
}

// ---------------------------------------------------------------------------
// World
// ---------------------------------------------------------------------------

const WORLD_WIDTH = 10;
const WORLD_HEIGHT = 10;

/**
 * Build an empty World with flat terrain and no actors.
 */
export function buildWorld(overrides: Partial<World> = {}): World {
  const terrain: Terrain[][] = Array.from({ length: WORLD_HEIGHT }, () =>
    Array(WORLD_WIDTH).fill(Terrain.EMPTY)
  );
  return {
    id: nextId(),
    actorIds: [],
    actors: [],
    terrain,
    ...overrides,
  };
}

/**
 * Build a World that already contains a 3×3 actor formation for one player.
 */
export function buildWorldWithActors(
  ownerId: number,
  actorOverrides: Partial<Actor> = {},
  worldOverrides: Partial<World> = {}
): World {
  const actors = buildActorFormation(ownerId, 0, 0, actorOverrides);
  return buildWorld({
    actorIds: actors.map((a) => a.id),
    actors,
    ...worldOverrides,
  });
}

// ---------------------------------------------------------------------------
// Game
// ---------------------------------------------------------------------------

/**
 * Build a Game in the LOBBY state with sensible defaults.
 */
export function buildGame(overrides: Partial<Game> = {}): Game {
  return {
    id: nextId(),
    players: [],
    hostPlayerId: undefined,
    maxPlayers: 4,
    gameState: GameState.LOBBY,
    turn: 1,
    worldId: nextId(),
    createdAt: new Date("2024-01-01T00:00:00Z"),
    ...overrides,
  };
}

// Traits ──────────────────────────────────────────────────────────────────

/** Build a game that is currently in progress. */
export function buildInProgressGame(overrides: Partial<Game> = {}): Game {
  return buildGame({
    gameState: GameState.IN_PROGRESS,
    startedAt: new Date("2024-01-01T01:00:00Z"),
    ...overrides,
  });
}

/** Build a completed game. */
export function buildCompletedGame(overrides: Partial<Game> = {}): Game {
  return buildGame({ gameState: GameState.COMPLETED, ...overrides });
}

// ---------------------------------------------------------------------------
// Player
// ---------------------------------------------------------------------------

/**
 * Build a Player with sensible defaults.  The player is not a host by default.
 */
export function buildPlayer(overrides: Partial<Player> = {}): Player {
  const id = nextId();
  return {
    id,
    gameId: nextId(),
    username: `player_${id}`,
    isHost: false,
    joinedAt: new Date("2024-01-01T00:00:00Z"),
    sessionId: `session_${id}`,
    ...overrides,
  };
}

// Traits ──────────────────────────────────────────────────────────────────

/** Build a player that is the host of their game. */
export function buildHostPlayer(overrides: Partial<Player> = {}): Player {
  return buildPlayer({ isHost: true, ...overrides });
}

// ---------------------------------------------------------------------------
// ActorOrders
// ---------------------------------------------------------------------------

/**
 * Build a single ActorOrders entry for a MOVE order.
 * By default the actor moves UP_RIGHT for one step.
 */
export function buildMoveOrder(
  actorId: number,
  directions: Direction[] = [Direction.UP_RIGHT],
  overrides: Partial<ActorOrders> = {}
): ActorOrders {
  return {
    actorId,
    orderType: OrderType.MOVE,
    ordersList: directions,
    ...overrides,
  };
}

/**
 * Build a single ActorOrders entry for an ATTACK order against a target actor.
 */
export function buildAttackOrder(
  actorId: number,
  targetId: number,
  overrides: Partial<ActorOrders> = {}
): ActorOrders {
  return {
    actorId,
    orderType: OrderType.ATTACK,
    targetId,
    ...overrides,
  };
}

/**
 * Build move orders for every actor in the supplied array, all heading in the
 * same direction.  This replicates the `testMarchOrders` helper used in
 * GameService.test.ts so that test files can use the factory instead of
 * copy-pasting the helper.
 */
export function buildMarchOrders(
  actors: Actor[],
  direction: Direction = Direction.UP_RIGHT
): ActorOrders[] {
  return actors.map((actor) =>
    buildMoveOrder(actor.id, [direction])
  );
}

// ---------------------------------------------------------------------------
// TurnOrders
// ---------------------------------------------------------------------------

/**
 * Build a TurnOrders record with an empty orders list by default.
 */
export function buildTurnOrders(overrides: Partial<TurnOrders> = {}): TurnOrders {
  return {
    id: nextId(),
    gameId: 1,
    turn: 1,
    playerId: 1,
    orders: [],
    ...overrides,
  };
}

/** Build TurnOrders containing march orders for a set of actors. */
export function buildTurnOrdersWithMarch(
  actors: Actor[],
  overrides: Partial<TurnOrders> = {}
): TurnOrders {
  return buildTurnOrders({
    orders: buildMarchOrders(actors),
    ...overrides,
  });
}

// ---------------------------------------------------------------------------
// TurnResult
// ---------------------------------------------------------------------------

/**
 * Build a TurnResult with a minimal world by default.
 */
export function buildTurnResult(overrides: Partial<TurnResult> = {}): TurnResult {
  return {
    id: nextId(),
    gameId: 1,
    turn: 1,
    playerId: 1,
    world: buildWorld(),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Scenario builders
// ---------------------------------------------------------------------------

export interface TwoPlayerScenario {
  game: Game;
  host: Player;
  guest: Player;
  hostActors: Actor[];
  guestActors: Actor[];
  world: World;
}

/**
 * Build all the objects needed for a typical two-player in-progress game.
 * IDs are consistent across all returned objects – the game's `players` list
 * contains both player IDs, actors are owned by the correct players, etc.
 */
export function buildTwoPlayerScenario(): TwoPlayerScenario {
  const worldId = nextId();
  const gameId = nextId();

  const host = buildHostPlayer({ gameId });
  const guest = buildPlayer({ gameId });

  const hostActors = buildActorFormation(host.id!, 0, 0);
  const guestActors = buildActorFormation(guest.id!, 5, 5);
  const allActors = [...hostActors, ...guestActors];

  const terrain: Terrain[][] = Array.from({ length: WORLD_HEIGHT }, () =>
    Array(WORLD_WIDTH).fill(Terrain.EMPTY)
  );

  const world: World = {
    id: worldId,
    actorIds: allActors.map((a) => a.id),
    actors: allActors,
    terrain,
  };

  const game = buildInProgressGame({
    id: gameId,
    worldId,
    players: [host.id!, guest.id!],
    hostPlayerId: host.id,
  });

  return { game, host, guest, hostActors, guestActors, world };
}

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

/**
 * Returns true when `pos` falls within the bounds of the default world grid.
 */
export function isValidGridPosition(pos: GridPosition): boolean {
  return (
    Number.isInteger(pos.x) &&
    Number.isInteger(pos.y) &&
    pos.x >= 0 &&
    pos.x < WORLD_WIDTH &&
    pos.y >= 0 &&
    pos.y < WORLD_HEIGHT
  );
}

/**
 * Returns true when the actor has all required fields with sensible values.
 */
export function isValidActor(actor: Actor): boolean {
  return (
    typeof actor.id === "number" &&
    actor.id > 0 &&
    isValidGridPosition(actor.pos) &&
    (actor.state === ActorState.ALIVE || actor.state === ActorState.DEAD) &&
    typeof actor.owner === "number" &&
    actor.owner > 0
  );
}

/**
 * Returns true when the game has a valid state transition (not undefined).
 */
export function isValidGame(game: Game): boolean {
  return (
    typeof game.turn === "number" &&
    game.turn >= 1 &&
    typeof game.worldId === "number" &&
    Object.values(GameState).includes(game.gameState as GameState)
  );
}

/**
 * Returns true when turnOrders references consistent game/player/turn data.
 */
export function isValidTurnOrders(orders: TurnOrders): boolean {
  return (
    typeof orders.gameId === "number" &&
    orders.gameId > 0 &&
    typeof orders.turn === "number" &&
    orders.turn >= 1 &&
    typeof orders.playerId === "number" &&
    orders.playerId > 0 &&
    Array.isArray(orders.orders)
  );
}
