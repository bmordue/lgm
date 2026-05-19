# Hickey Architecture Review - LGM

> Reviewed against Rich Hickey's lens of simplicity, data orientation, and functional design.

---

## Complecting Found

### 1. Validation and mutation braided in `applyMovementOrders` (Rules.ts:88-138)
Two concerns are woven together in one function: determining whether a move is legal, and applying it. The legality check (bounds test, terrain lookup) produces a boolean decision; the mutation (`allActorsInWorld[actorIndex].pos = newGridPos`, line 123) is a completely separate concern. A caller cannot ask 'is this move legal?' without also executing the move. Separate into a pure `isMoveLegal(actor, direction, world): boolean` and a `moveActor` that returns a new value.

### 2. Computation and side-effect in `applyFiringRules` (Rules.ts:140-202)
The function both decides combat outcomes and mutates the target in place (`target.health = ...`, line 191; `target.state = ActorState.DEAD`, line 197). The decision - how much damage, does the target die? - is pure given the inputs. The application is a side effect. `calculateDamage` in `CombatMath.ts` is already extracted correctly; `applyFiringRules` should use its result to produce a new `Actor` value rather than mutating the existing one.

### 3. Two storage mechanisms in one module (DatabaseStore.ts throughout)
Every exported function (`create`, `read`, `readAll`, `replace`, `update`, `remove`) contains an `if (!client)` branch implementing the in-memory store, followed by the PostgreSQL branch. These are two different storage strategies complected into every function. A change to any storage operation requires editing both implementations simultaneously. The strategies should be two separate implementations behind a common interface.

### 4. Field mapping inside the store (DatabaseStore.ts:14-86)
`mapDbRecordToModel` lives inside DatabaseStore. Field translation (snake_case to camelCase, JSON parsing) is a serialisation concern, not a storage concern. The store now knows both how to persist and how to represent - two distinct responsibilities. Serialisation should be extracted to a separate layer.

### 5. Module-level mutable state crosses function boundaries (Rules.ts:22, 229)
`currentTurnWorldTerrain` is a module-level `let` set as a side effect of `processGameTurn` (line 286) and read by `turnResultsPerPlayer` (line 229). These two functions are secretly coupled through ambient state. There is no explicit argument passing the terrain between them. `processGameTurn` should pass terrain explicitly to `turnResultsPerPlayer`.

### 6. Actor identity conflated with transient combat state (Models.ts:47-63)
`Actor` carries both stable identity fields (`id`, `pos`, `owner`) and transient combat state (`isUnderCover`, `coverBonus`, `isAiming`, `aimBonus`, `currentAmmo`). These are distinct concerns: the actor *is* the entity; the combat modifiers *describe its situation at a moment in time*. Mixing them means combat effects persist across turns unless explicitly cleared. A separate `CombatState` value composed alongside but not inside `Actor` would keep the concerns separate.

### 7. `GameService.ts` braids re-export with API compatibility shim
`GameService.ts` re-exports from `GameLifecycleService`, `OrderService`, and `TurnResultService`, but also contains a one-off `createGame` wrapper (lines 34-39) adding an `id` alias for test compatibility: `return { id: result.gameId, gameId: result.gameId }`. This braids delegation with backward-compatibility shaping. The shim belongs in the controller layer.

---

## Data Orientation

**Positive.** `Models.ts` is well-oriented: `Game`, `World`, `Actor`, `TurnOrders`, `TurnResult` are plain TypeScript interfaces - transparent, serialisable records with no methods.

**Dual representation of actors in `World`.** `World` carries both `actorIds: Array<number>` and `actors?: Array<Actor>` (line 44). The same information expressed two ways. `actorIds` is the stable identity; `actors` is a materialised cache. Callers must know which is populated and when. The API response type should be a distinct projection rather than an optional overlay on the storage type.

**`any` casts in `DatabaseStore`** - every `create` and `replace` branch casts `obj as any` (e.g. `const gameData = obj as any`, line 163). The generic `<T>` parameter conveys a false sense of type safety; the actual mapping is untyped. Typed mapper functions per entity would make this honest.

**`TurnResult.world` is a full snapshot stored as JSON.** Every completed turn stores the entire world state per player. Any change to `World` structure requires migration of all stored turn results.

---

## Immutability

**`applyMovementOrders` mutates in place** (line 123): `allActorsInWorld[actorIndex].pos = newGridPos`. The function signature (`Promise<Actor>`) implies it returns a new actor; it actually mutates and returns the same object. Returning `{ ...allActorsInWorld[actorIndex], pos: newGridPos }` would make it honest and eliminate hidden aliasing.

**`applyDamage` in `CombatMath.ts`** (lines 379-390): mutates `target.health` and returns the damage dealt. The function could instead return `{ newHealth, actualDamage }` and callers could apply.

**`filterWorldForPlayer` in Rules.ts** (lines 420-429): pushes to `visibleWorld.actors` and `visibleWorld.actorIds` after receiving them from `getVisibleWorldForPlayer`. This mutates a returned value rather than building a new one.

**`joinGame`** (GameLifecycleService.ts:105): `game.players.push(playerId)` mutates the fetched game object before storing it. Fetched objects should be treated as values and new ones constructed for updates.

---

## Pure Functions

**`calculateRandomModifier`** (CombatMath.ts:249-252) and **`checkCriticalHit`** (CombatMath.ts:257-259) call `Math.random()`. They are not pure and not independently testable without mocking. The randomness source should be injected - a `Random` function parameter or pre-computed roll - so tests can be deterministic.

**`applyRulesToActorOrders`** (Rules.ts:205-226): runs the main game simulation loop through in-place mutation rather than returning new values. The function returns an array that is also the same mutated input array - the caller cannot diff before/after state.

**`processGameTurn`** (Rules.ts:274-351): a 77-line procedure mixing computation (applying rules, computing per-player results) with orchestration (store reads, store writes, turn increment). The pure computation - given `game`, `world`, `allOrders`, produce `updatedActors` and `turnResults` - could be extracted and tested without any store involvement.

---

## State Management

The stateful boundary is unclear. Meaningful state lives in three places simultaneously:

1. **`memoryStore`** - module-level `Record<string, any[]>` in DatabaseStore.ts (line 93)
2. **`dbClient`** - module-level singleton `Client` (line 90)
3. **`currentTurnWorldTerrain`** - module-level `let` in Rules.ts (line 22)

None are exposed or guarded. `deleteAll()` exists (used in tests) but only resets one of the three.

`getDbClient()` (lines 102-113) lazily initialises the singleton on first call with no concurrency guard. If two requests race before the client is connected, both will attempt to connect with the same `Client` instance. A connection pool or explicit initialisation at startup would be safer.

The functional core (game rules, damage calculation) and the stateful shell (store operations) are partially separated by service decomposition but the boundary leaks: `Rules.ts` calls `store` directly in `processGameTurn`, coupling the rule engine to persistence.

---

## Naming

- **`process`** (Rules.ts:353): The main entry point for turn resolution. A mechanism name, not a domain name. `resolveTurn` or `processTurnOrders` would say what it does.
- **`postOrdersResponseOf`** (OrderService.ts:216-219): A wrapper that does nothing - `return response` - yet has a name implying transformation. It satisfies a `Promise` wrapper pattern TypeScript resolves automatically. Delete it.
- **`keys` enum** (DatabaseStore.ts:115-122): Named for its role in the store API, not what it represents. `EntityType` or `StoreEntity` would be more honest.
- **`filterWorldForPlayer`** (Rules.ts:410): The word 'filter' undersells what this function does - it also populates `actors` from `actorIds`, computes visibility, and ensures the player's own actors are always included. The name obscures the complexity.
- **`inBox`** (Rules.ts:462): A private geometry predicate that could be expressed as an inline arrow function.
- **`Store.ts`**: One line: `export * from './DatabaseStore'`. The name implies an abstraction; it is just a re-export alias.

---

## Simplicity

**`GameService.ts` could be removed.** It is a pure delegation module: every function delegates to `GameLifecycleService`, `OrderService`, or `TurnResultService`. Its only unique contribution is the `createGame` shim (lines 34-39) and backward-compatibility re-exports. Controllers could import from the specific services directly; the shim belongs in the controller. Removing `GameService.ts` eliminates a layer with no logic.

**`Store.ts` could be removed.** It is `export * from './DatabaseStore'`. Callers should import `DatabaseStore` directly.

**`postOrdersResponseOf`** (OrderService.ts:216-219) is the identity function. Delete it.

**`extractActorId`** (Rules.ts:261-263) is defined but not called anywhere in the turn processing loop. Dead code.

**`validateRequestOrders` and `validateOrders` in OrderService.ts** do overlapping work. Both validate actor ownership and order structure. The split is not conceptually clear and the duplication in attack validation (both check `targetId` presence) suggests the boundary was drawn arbitrarily.

**Two LOS algorithms in Visibility.ts.** `visibility` (line 22) uses a grid-based Bresenham-like walk. `getVisibleWorldForPlayer` (line 240) uses `hasLineOfSight` via hex coordinates (`Hex.linedraw`). Both exist in the same file but are not composed. `visibility` appears used only by tests. Two LOS systems is one too many.

---

## Extension Model

**The store is closed to new entity types.** `DatabaseStore.ts` uses a switch statement over the `keys` enum in every operation (`create`, `read`, `readAll`, `replace`, `update`, `remove`). Adding a new entity type requires editing six switch statements. A typed mapper registry - an object keyed by entity type, each value providing query/mapping functions - would make adding a new entity type a one-place change.

**No storage interface is defined.** Despite two backends (in-memory and PostgreSQL) operating behind the same function signatures, there is no explicit interface that both satisfy. A `Store` interface with `create`, `read`, `readAll`, `replace`, `update`, `remove` methods, implemented by `MemoryStore` and `PostgresStore`, would make the contract explicit and the boundary real.

**Service coupling direction is tangled.** `Rules.ts` imports `JoinGameResponse` from `GameService.ts` (line 10), which re-exports from `GameLifecycleService.ts`, which imports `Rules.ts`. This creates a soft cycle. `JoinGameResponse` is a response-shaping concern (HTTP layer) that should not be imported by the rule engine. The rule engine should work with domain types only.

---

## Summary

### Top 3 most impactful changes, ranked by reduction in complecting

**1. Separate the two storage strategies (DatabaseStore.ts)**
Define a `Store` interface and implement it twice: `MemoryStore` and `PostgresStore`. Eliminate all `if (!client)` branches from the current module. This removes the most pervasive complecting in the codebase - every storage operation currently carries the weight of both strategies - and makes each independently testable and replaceable. It also forces field-mapping logic into clearly owned locations.

**2. Eliminate in-place mutation from rule application functions (Rules.ts, CombatMath.ts)**
`applyMovementOrders` and `applyFiringRules` should return new `Actor` values rather than mutating the input array. `applyRulesToActorOrders` should accumulate a new array. This has the highest leverage on correctness: the current mutation means actor state changes during the timestep loop are visible to subsequent actors in the same timestep, creating order-dependent results that are hard to reason about or test.

**3. Extract the pure core of `processGameTurn` (Rules.ts)**
Extract a function `simulateTurn(game, world, orders, actors): { updatedActors, turnResults }` that takes plain data and returns plain data with no store calls. This pure function is the most important logic in the system and is currently untestable without a running store. The orchestration layer (`processGameTurn`) becomes a thin shell that loads from the store, calls `simulateTurn`, and saves results.
