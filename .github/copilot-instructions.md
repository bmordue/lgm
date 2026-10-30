# GitHub Copilot Instructions for LGM Repository

Treat this file and [docs/ARCHITECTURE.md](../docs/ARCHITECTURE.md) as the
authoritative project guidance. If they disagree with the code, fix the docs.

## Project Overview

LGM is a turn-based strategy game with a TypeScript API and a Vue 3 client.
Players control nine actors on a hexagonal grid, submit orders for a turn of up
to ten timesteps, and receive a visibility-filtered world.

## Setup

Use the Nix shell (Node.js 24 + npm + git + curl + jq):

```bash
nix-shell
startup-servers      # install deps and start API + client

# Or manually
install-deps
start-api
start-client
```

The shell creates a legacy `lib -> api` symlink. The client uses
`@lgm/shared-types` from `packages/shared-types`, so the symlink is not required
for client builds.

## Backend (`api/`)

```bash
npm run build        # TypeScript -> built/
npm run watch        # watch compilation
npm start            # build and run on :3000 (LGM_PORT)
npm run monitor      # nodemon development server
npm test             # Mocha + nyc
npm run test:e2e     # requires a running server
npx stryker run      # mutation testing (api/stryker.config.json)
```

### Backend architecture

- **API spec**: `api/spec/api.yml` (OpenAPI 3, strict Exegesis validation).
- **Controllers**: `api/controllers/`.
- **Services**: `GameLifecycleService` (create/join/start/kick/host/list),
  `OrderService`, `TurnResultService`, `Rules` (turn simulation), `Visibility`,
  `RangeValidation`, `CombatMath`, `ActorPlacement`, `DatabaseStore`.
- **Storage**: PostgreSQL when `DATABASE_URL` is set (schema in
  `api/database/migration.sql`), otherwise an in-memory store that loses state on
  restart. The unused Prisma files are not part of the runtime.
- **Auth**: reverse-proxy identity headers (`Remote-User`, `Remote-Name`,
  `Remote-Email`, `Remote-Groups`) read by `api/middleware/auth.ts`. No bearer
  tokens are issued or validated. `POST /users/login` returns `410 Gone`.
- **Config**: `api/config/GameConfig.ts`; world defaults to 10×10 and is
  configurable (`LGM_WORLD_WIDTH`, `LGM_WORLD_HEIGHT`). See
  [CONFIGURATION.md](../CONFIGURATION.md).
- **Operations**: `/health` and `/metrics`; Socket.IO events `games:updated` and
  `game:updated`.

### Local API testing

Without a proxy, set `DEV_STUB_USER` or send identity headers:

```bash
DEV_STUB_USER="alice@example.com:Alice Smith:players" npm start

curl -X POST http://localhost:3000/games \
  -H "Remote-User: alice@example.com" \
  -H "Content-Type: application/json" \
  -d '{"maxPlayers":2}'
curl -X PUT http://localhost:3000/games/0 -H "Remote-User: alice@example.com"
```

Do not use `Authorization: Bearer ...` or the login endpoint; both are obsolete.

## Frontend (`client/`)

```bash
npm run dev          # Vite on :5173
npm run build        # type-check + build
npm run type-check   # vue-tsc
npm run build-only   # Vite build only
npm run test:unit    # Vitest
npm run lint         # ESLint with auto-fix
npm run format       # Prettier
```

- Vue 3 Composition API, Pinia (`Games.store`, `User.store`), Vue Router, Vite.
- `API_URL` is `/api`; the dev server proxies `/api` to `localhost:3000`.
- Shared hex types come from `@lgm/shared-types` (`packages/shared-types`), not
  from the `lib/` symlink.

## Validation Before Committing

```bash
cd api && npm run build && npm test
cd client && npm run build && npm run test:unit
```

For API changes: update `api/spec/api.yml`, controller, and tests together. For
frontend changes: run `npm run type-check` and `npm run test:unit`.

## Manual End-to-End Scenario

1. Start the API with `DEV_STUB_USER` and start the client.
2. Open http://localhost:5173/ and confirm the UI loads.
3. Create a game, join it, and verify the hex grid and actors render.
4. Select actors, plan movement, submit orders, and read turn results.

## Common Issues

- **E2E tests fail**: the API must be running on port 3000.
- **401 on game actions**: no proxy identity; set `DEV_STUB_USER` in development.
- **Data disappears after restart**: `DATABASE_URL` is unset (in-memory mode).
- **Shared type import errors**: run `npm install` in `client/` so the local
  `@lgm/shared-types` dependency is linked.
