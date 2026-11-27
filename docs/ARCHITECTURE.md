# LGM Architecture

Single source of truth for how the system is built today and what remains to be fixed.
Update this document instead of adding another review document.

Related docs:

- [Authentication model](auth.md)
- [Configuration](../CONFIGURATION.md)
- [Combat system](COMBAT_SYSTEM.md) and [damage system](COMBAT_DAMAGE_SYSTEM.md)
- [OpenAPI specification](../api/spec/api.yml) — authoritative API contract
- [Roadmap](../ROADMAP.md)

## System Overview

LGM is a turn-based strategy game. Each player controls nine actors on a
hexagonal grid. A turn consists of up to ten timesteps; all players submit
orders, then the server resolves the turn and returns a player-specific view of
the resulting world.

```
Browser
  │  HTTPS, session cookie handled by the proxy
  ▼
nginx + Authelia (optional in development)
  │  injects Remote-User / Remote-Name / Remote-Email / Remote-Groups
  ▼
Vue 3 client (Vite, port 5173)  ──/api──▶  Express + Exegesis API (port 3000)
                                              │
                                              ├─ PostgreSQL (when DATABASE_URL is set)
                                              └─ in-memory store (otherwise)
```

- **Client**: Vue 3, Pinia, Vue Router, Vite, Socket.IO client.
  `client/src/config.ts` sets the API base to `/api`; the Vite dev server proxies
  `/api` to `http://localhost:3000`.
- **API**: Node.js 24, TypeScript, Express 5, Exegesis/OpenAPI 3, Socket.IO.
- **Shared types**: `packages/shared-types` (`@lgm/shared-types`), consumed by the
  client as a local file dependency for hex/grid types.
- **Storage**: PostgreSQL via `pg`, or an in-memory store when `DATABASE_URL` is
  absent. Both implement `api/service/StoreInterface.ts`.

## Authentication and Security

Authentication uses a reverse-proxy / forward-auth pattern. The API does not
issue or validate bearer tokens.

- `api/middleware/auth.ts` reads `Remote-User` (or `Remote-Email`),
  `Remote-Name`, and `Remote-Groups` and provisions a runtime user.
- In non-production, `DEV_STUB_USER="email:Name:group1,group2"` is used when no
  proxy headers are present. Otherwise the request is a guest.
- The Exegesis `bearerAuth` scheme is retained for routing but is backed by the
  proxy identity. Secured operations reject guests with `401`.
- `GET /games` and `GET /users/me` are public. `POST /users/login` is deprecated
  and always returns `410 Gone`.
- In production the server binds to `127.0.0.1` and is expected to sit behind
  nginx. Set `REQUIRE_PROXY_AUTH=true` to additionally reject requests without
  identity headers in non-production environments.

Baseline hardening in `api/index.ts`: Helmet headers, IP rate limiting, bounded
JSON bodies, prototype-pollution key rejection, strict OpenAPI request
validation, `x-powered-by` disabled, and first-proxy trust for client IPs.
See [auth.md](auth.md) for the full deployment model and threat notes.

## API Surface

Defined in `api/spec/api.yml`; controllers live in `api/controllers`.

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/games` | List games (public) |
| `POST` | `/games` | Create a game; optional `maxPlayers` (clamped 2–8) |
| `PUT` | `/games/{id}` | Join a game |
| `GET` | `/games/{gameId}/players/{playerId}` | Current player-specific game state |
| `DELETE` | `/games/{gameId}/players/{playerId}` | Kick a player (host only, lobby only) |
| `PUT` | `/games/{gameId}/start` | Start a game (host only, at least 2 players) |
| `PUT` | `/games/{gameId}/host` | Transfer host |
| `GET` | `/games/{gameId}/actors/{actorId}/targets` | Valid attack targets |
| `POST` | `/games/{gameId}/turns/{turn}/players/{playerId}` | Submit orders |
| `GET` | `/games/{gameId}/turns/{turn}/players/{playerId}` | Turn results |
| `GET` | `/users/me` | Current proxy identity (public) |
| `POST` | `/users/login` | Deprecated; always `410` |

Operational endpoints outside the OpenAPI spec:

- `GET /health` — status, uptime, version.
- `GET /metrics` — in-memory request counts, status/method/path breakdown, and
  average response time since process start.

Socket.IO shares the HTTP server. Events: `games:updated`, `game:updated`, and
client messages `join_game` / `leave_game` (room per game ID).

## Game Model and Turn Flow

Core data types are in `api/service/Models.ts`.

1. **Create** (`GameLifecycleService.createGame`): a world is generated and the
   game starts in `LOBBY`. `maxPlayers` defaults to 4 and is clamped to 2–8.
2. **Join** (`GameLifecycleService.joinGame`): allowed only in `LOBBY` and while
   not full. Duplicate usernames and duplicate sessions are rejected. The first
   player becomes host. Nine actors are placed in a 3×3 formation and the
   response contains the joining player's filtered world.
3. **Start** (`GameLifecycleService.startGame`): host-only; requires at least two
   players; moves the game to `IN_PROGRESS`.
4. **Orders** (`OrderService.postOrders`): one submission per player per turn.
   `MOVE` orders carry up to ten directions; `ATTACK` orders carry a target
   actor ID. Ownership, turn, and target validity are checked.
5. **Resolve** (`Rules.process`): once every player has submitted, the turn is
   simulated across timesteps, applying simultaneous movement and combat. Each
   player receives a visibility-filtered world (`Visibility.ts`), results are
   stored, and the turn advances.
6. **Read** (`GET .../turns/...` or `GET .../players/...`): returns stored or
   current player-filtered state.

Combat range/line-of-sight validation is in `RangeValidation.ts`; damage math is
in `CombatMath.ts` and configured by `api/config/CombatConfig.ts`,
`WeaponsConfig.ts`, and `TerrainConfig.ts`.

## Persistence

`api/service/DatabaseStore.ts` selects the backend on first use:

- If `DATABASE_URL` is set: connect with `pg`, run
  `api/database/migration.sql`, then use `PostgresStore`.
- Otherwise: use `MemoryStore` (state is lost on restart).

Operations are serialized through a queue. Game state, orders, turn results,
worlds, and actor weapons are stored largely as JSONB.

## Configuration

All defaults live in `api/config/GameConfig.ts`; see
[CONFIGURATION.md](../CONFIGURATION.md) for the full table. Commonly used:

| Variable | Default | Purpose |
| --- | --- | --- |
| `LGM_PORT` | `3000` | API port |
| `DATABASE_URL` | unset | Enables PostgreSQL; unset means in-memory |
| `LGM_WORLD_WIDTH` / `LGM_WORLD_HEIGHT` | `10` | World size |
| `LGM_MAX_PLAYERS` | `4` | Default player cap |
| `LGM_TIMESTEP_MAX` | `10` | Timesteps per turn |
| `LGM_VISIBILITY_RANGE` | `10` | Maximum visibility range |
| `LGM_DEFAULT_SIGHT_RANGE` | `7` | Default sight range |
| `LGM_RATE_LIMIT_MAX_REQUESTS` | `100` | Requests per window |
| `LGM_RATE_LIMIT_WINDOW_MS` | `900000` | Rate-limit window |
| `LGM_MAX_BODY_SIZE_BYTES` | `16384` | Maximum request body |
| `LGM_DEBUG` | unset | Enables debug logs |
| `DEV_STUB_USER` | unset | Development identity fallback |
| `REQUIRE_PROXY_AUTH` | unset | Require identity headers in non-production |
| `CLIENT_ORIGIN` | `*` | Socket.IO CORS origin |

## Testing and CI

- API: Mocha + `tsc`, with `nyc` coverage. `npm test` currently runs ~375 tests
  (some E2E tests are skipped unless enabled). `npm run test:e2e` needs a running
  server.
- Client: Vitest + Vue Test Utils, ~72 tests. `npm run type-check` runs `vue-tsc`.
- Mutation testing: Stryker is configured in `api/stryker.config.json`.
- CI (`.github/workflows/main.yml`) builds both packages, runs API/client unit
  tests, starts the API for E2E tests, and runs Stryker.

## Known Technical Debt

Ranked by expected payoff. This replaces the previous standalone review docs.

1. **Dead persistence scaffolding.** Runtime uses `pg`/`PostgresStore`, but
   Prisma remains in `devDependencies`, `DatabaseService.ts` imports an
   uninstalled `@prisma/client` and is excluded from `tsconfig`, and
   `prisma/schema.prisma` has drifted from `database/migration.sql` (missing
   `turnOrders`, different `players`/relations). Delete Prisma or finish it.
2. **Legacy duplicate code.** `PlayerService.ts` is exported but unused and
   reimplements joining with the global player limit instead of the per-game
   limit. `GameService.ts` is a pass-through with an `id`/`gameId` compatibility
   shim, `Store.ts` only re-exports `DatabaseStore`, and `Models.ts` declares
   `Player` twice.
3. **API response and error consistency.** `POST /games` returns both `id` and
   the deprecated `gameId`; error status choices are not uniform across
   services, and some controllers still use ad-hoc status mapping instead of the
   typed errors. Finish the standardization and remove the alias.
4. **Visibility redaction.** Visible enemy actors currently expose full stats
   (see the TODO in `api/service/Visibility.ts`). Decide whether to hide
   weapon/health details unless fully identified and whether to track
   explored/last-seen state.
5. **Persistence robustness.** A single `pg` client is used (no pool), migrations
   run lazily on first storage operation, there is no graceful shutdown, and the
   silent fallback to in-memory when `DATABASE_URL` is absent can mask
   misconfiguration in deployed environments.
6. **Turn-engine testability.** Some combat rolls use `Math.random()` directly
   and some service code still mutates fetched objects. Inject randomness and
   prefer value-returning functions where practical.
7. **E2E and database coverage.** E2E tests are opt-in, and the PostgreSQL path
   is exercised less than the in-memory path.
8. **Legacy tooling.** The root `lib -> api` symlink is no longer needed by the
   client (it uses `@lgm/shared-types`); `shell.nix` still creates it. Thin
   `GameService`/`Store` aliases and dead helpers (`inBox`, `extractActorId` in
   `Rules.ts`) can be removed. `Draw.ts` is only used by manual tests.

## Conventions

- Use `api/config/GameConfig.ts` for tunable values; document new variables in
  `CONFIGURATION.md`.
- Use the typed errors in `api/utils/Errors.ts`.
- Keep the OpenAPI spec in sync with controllers and tests.
- Prefer adding tests to the existing Mocha/Vitest suites over new frameworks.
