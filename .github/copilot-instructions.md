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

**CRITICAL**: Always use `nix-shell` first. The shell.nix environment provides:
- Node.js 24.x LTS with npm  
- All development tools (curl, jq, git)
- Automatic symlink creation (`lib -> api`)
- Helpful aliases and environment setup
- Takes ~90 seconds for full dependency installation, NEVER CANCEL

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
# Run unit tests with Vitest
npm run test:unit  # Takes ~3 seconds

# Lint and auto-fix
npm run lint  # Takes ~2 seconds, ESLint with auto-fix

# Format code
npm run format  # Prettier formatting
```

### Frontend Validation Scenarios
After making frontend changes, ALWAYS run these validation steps:

1. **Build and test**: `npm run build && npm run test:unit`
2. **Start dev server**: `npm run dev` - Should show "Local: http://localhost:5173/"
3. **Test in browser**: Open http://localhost:5173/ and verify the UI loads
4. **Test with backend**: Start backend on port 3000, test login and game creation flows

### Frontend Architecture Notes
- **Framework**: Vue 3 with Composition API
- **State management**: Pinia stores (Games.store, User.store)
- **Build tool**: Vite with TypeScript
- **Testing**: Vitest for unit tests
- **Backend integration**: Expects backend on localhost:3000
- **Shared models**: Access backend models via `../../../lib/` symlink

## Critical Configuration Requirements

### Required Symlink
**AUTOMATIC**: The frontend requires a symlink from repository root which is **automatically created by shell.nix**:
```bash
# This symlink is created automatically when you run nix-shell
lib -> api
```
If you see frontend build errors about "Could not resolve", ensure you're working within the nix-shell environment.

### Port Configuration
- **Backend**: Port 3000 (configurable via `LGM_PORT` environment variable)
- **Frontend dev server**: Port 5173 (Vite default)
- **Frontend expects backend**: Always on localhost:3000

## Common Issues and Solutions

### Build Issues
- **Frontend build fails**: Ensure `lib` symlink exists pointing to `api/`
- **TypeScript errors**: Some warnings are expected, build still succeeds
- **Import path errors**: Frontend uses `../../../lib/` to access backend models

### Server Issues
- **API spec not found**: Check `index.ts` path to `spec/api.yml` is correct
- **E2E tests fail**: Requires running server on port 3000
- **Authentication errors**: Use fresh tokens, they are session-based in memory

## CI/CD Pipeline
The GitHub workflow (`.github/workflows/main.yml`) requires:
- Node.js 24.x
- Backend build and test in `api/` directory
- Mutation testing with Stryker

## File Structure Overview
```
├── api/                 # Backend TypeScript API
│   ├── built/          # Compiled output
│   ├── controllers/    # API controllers
│   ├── service/        # Core game logic
│   ├── spec/          # OpenAPI specification
│   └── test/          # Backend tests
├── client/             # Frontend Vue 3 application
│   ├── src/           # Vue source code
│   ├── dist/          # Build output
│   └── public/        # Static assets
├── lib -> api         # Symlink for frontend to access backend
└── .github/           # GitHub workflows and templates
```

## Timing Expectations and Timeouts

**NEVER CANCEL any of these operations - set appropriate timeouts:**

- **Backend `npm install`**: ~90 seconds (set timeout: 180+ seconds)
- **Frontend `npm install`**: ~45 seconds (set timeout: 120+ seconds)
- **Backend build**: ~4 seconds (set timeout: 30+ seconds)
- **Backend tests**: ~7 seconds (set timeout: 30+ seconds)
- **Mutation testing**: ~42 seconds (set timeout: 120+ seconds)
- **Frontend build**: ~5 seconds (set timeout: 30+ seconds)
- **Frontend tests**: ~3 seconds (set timeout: 30+ seconds)

## Manual Testing Scenarios

### Complete End-to-End Scenario
After any significant changes, ALWAYS test this complete user flow:

1. **Start backend**: `cd api && npm start`
2. **Start frontend**: `cd client && npm run dev`
3. **Test login flow**: 
   - Visit http://localhost:5173/
   - Navigate to login page
   - Attempt login (should work with any username/password)
4. **Test game creation**:
   - Create a new game
   - Join the game
   - Verify hexagonal grid displays with actors
5. **Test game interaction**:
   - Click on hex tiles
   - Verify actor selection and movement planning works

### API Testing Scenario
```bash
# Get authentication token
TOKEN=$(curl -s http://localhost:3000/users/login -X POST -H "Content-Type: application/json" -d '{"username":"test","password":"test"}' | jq -r '.token')

# Create game
curl -X POST http://localhost:3000/games -H "Authorization: Bearer $TOKEN"

# Join game (game ID 0)
curl -X PUT http://localhost:3000/games/0 -H "Authorization: Bearer $TOKEN"
```

## Development Best Practices

### Before Committing Changes
ALWAYS run these commands and ensure they pass:
```bash
# Backend validation
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
