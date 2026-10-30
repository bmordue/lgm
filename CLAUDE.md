# CLAUDE.md

Guidance for AI coding agents working in this repository. Keep this file and
[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) aligned with the code; do not add
another architecture review document.

## Development Environment

The project expects the Nix shell, which provides Node.js 24, npm, git, curl, and
jq:

```bash
nix-shell

# Install dependencies and start both servers
startup-servers

# Or separately
install-deps
start-api
start-client
```

The shell also creates a legacy `lib -> api` symlink. The client uses
`@lgm/shared-types` from `packages/shared-types`, so that symlink is not needed
for client builds.

Avoid installing or using a system Node.js version.

## Task Tracking

[ROADMAP.md](ROADMAP.md) is the single backlog. Check
[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md#known-technical-debt) for known
technical debt. Keep completed work in the roadmap's `Shipped` section and do
not introduce a separate issue tracker.

## Commands

### Backend (`api/`)

```bash
npm run build        # tsc -> built/
npm run watch        # watch mode
npm start            # build and run on port 3000
npm run monitor      # nodemon development server
npm test             # unit/integration tests with nyc coverage
npm run test:e2e     # E2E tests; requires a running server
npx stryker run      # mutation testing (api/stryker.config.json)
```

### Frontend (`client/`)

```bash
npm run dev          # Vite dev server on port 5173
npm run build        # type-check + production build
npm run type-check   # vue-tsc only
npm run test:unit    # Vitest
npm run lint         # ESLint with auto-fix
```

## Architecture

LGM is a turn-based strategy game: players control nine actors on a hex grid and
submit simultaneous orders for a turn of up to ten timesteps.

```
Vue 3 client (:5173) --/api--> Express + Exegesis API (:3000)
                                  |-- PostgreSQL (DATABASE_URL set)
                                  '-- in-memory store (otherwise)
```

- **API** (`api/`): TypeScript, Express 5, Exegesis with strict OpenAPI
  validation (`api/spec/api.yml`). Controllers live in `api/controllers`.
- **Client** (`client/`): Vue 3, Pinia, Vue Router, Vite. `API_URL` is `/api`;
  Vite proxies `/api` to `localhost:3000` in development.
- **Shared types** (`packages/shared-types`): hex/grid types imported by the
  client as `@lgm/shared-types`.

### Authentication

Authentication is delegated to an upstream nginx + Authelia proxy. The API reads
`Remote-User` (or `Remote-Email`), `Remote-Name`, and `Remote-Groups` in
`api/middleware/auth.ts`. It does **not** issue or validate bearer tokens, and
`POST /users/login` always returns `410 Gone`.

- Public: `GET /games`, `GET /users/me`, `GET /health`, `GET /metrics`.
- Other game endpoints require a non-guest identity.
- In non-production, `DEV_STUB_USER="email:Name:group1,group2"` provides a local
  identity when no proxy headers are present.
- Production binds to `127.0.0.1`. See [docs/auth.md](docs/auth.md).

### Storage

`api/service/DatabaseStore.ts` selects the backend on first use:

- `DATABASE_URL` set: `pg` client, runs `api/database/migration.sql`, then
  `PostgresStore`.
- Unset: `MemoryStore`; all state is lost on restart.

Both implement `api/service/StoreInterface.ts`. Ignore the unused Prisma files;
the runtime does not use Prisma.

### Core Services

- `GameLifecycleService` — create/join/start/kick/transfer host/player state/list.
- `OrderService` — validate and store turn orders.
- `TurnResultService` — read resolved turn results.
- `Rules` — world creation, actor setup, turn simulation.
- `Visibility` — per-player fog of war / filtered worlds.
- `RangeValidation` + `CombatMath` — attack validation and damage.
- `ActorPlacement` — spawn-zone heuristic.
- `DatabaseStore` — Postgres/memory selection and serialized operations.
- `WebSocketService` — Socket.IO rooms and `games:updated` / `game:updated`.

`GameService.ts` and `Store.ts` are thin compatibility re-exports.

### Game Flow

1. Create game: generated world, `LOBBY`, `maxPlayers` clamped 2–8 (default 4).
2. Join: lobby-only, capacity and duplicate username/session checks, first player
   becomes host, nine actors placed, player-filtered world returned.
3. Start: host-only, at least two players, state becomes `IN_PROGRESS`.
4. Orders: one submission per player per turn; `MOVE` directions or `ATTACK`
   target; ownership and target validity checked.
5. Resolve: when all players submit, timesteps are simulated, combat applied,
   results filtered per player and stored, turn advances.
6. Read: `GET /games/{gameId}/players/{playerId}` or the turn-results endpoint.

### API Endpoints

Defined in `api/spec/api.yml`. Main routes: `GET/POST /games`,
`PUT /games/{id}` (join), `GET/DELETE /games/{gameId}/players/{playerId}`,
`PUT /games/{gameId}/start`, `PUT /games/{gameId}/host`,
`GET /games/{gameId}/actors/{actorId}/targets`,
`GET/POST /games/{gameId}/turns/{turn}/players/{playerId}`,
`GET /users/me`, and the deprecated `POST /users/login`.

### Configuration

Defaults are in `api/config/GameConfig.ts`; see
[CONFIGURATION.md](CONFIGURATION.md). The world defaults to 10×10 and is
configurable via `LGM_WORLD_WIDTH` / `LGM_WORLD_HEIGHT`. Other useful variables:
`LGM_MAX_PLAYERS`, `LGM_TIMESTEP_MAX`, `LGM_VISIBILITY_RANGE`,
`LGM_DEFAULT_SIGHT_RANGE`, `LGM_PORT`, `LGM_DEBUG`, `DATABASE_URL`,
`DEV_STUB_USER`, `REQUIRE_PROXY_AUTH`, and `CLIENT_ORIGIN`.

### Testing

- Backend: Mocha + `tsc`; `npm test` runs the suite. E2E tests are opt-in.
- Frontend: Vitest + Vue Test Utils; `npm run test:unit`.
- CI builds both packages, runs unit tests, starts the API for E2E, and runs
  Stryker.

## Conventions

- Put tunable constants in `api/config/*` and document new environment variables.
- Use typed errors from `api/utils/Errors.ts`.
- Keep `api/spec/api.yml` in sync with controllers and tests.
- Do not add duplicate architecture/review documents; update
  [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) or [ROADMAP.md](ROADMAP.md).
- The client no longer imports backend models through `lib/`; use
  `@lgm/shared-types` or client-local types.
