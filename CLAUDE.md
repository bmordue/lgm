# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Environment Setup

**ALWAYS use shell.nix for development environment setup:**

```bash
# Enter the Nix development shell (required first step)
nix-shell

# Quick setup: Install dependencies and start both servers
startup-servers

# Manual setup alternative:
install-deps        # Install all dependencies (API + client)
startup-servers     # Start both API and frontend servers
```

The `shell.nix` environment provides:
- Node.js 20.x LTS with npm
- All development tools (curl, jq, git)
- Automatic symlink creation (`lib -> api`)
- Helpful aliases and functions
- Environment variables and PATH setup

**Never install Node.js manually or use system Node.js - always use `nix-shell` first.**

## Commands

### Backend Development (run inside nix-shell)
- `npm run build` - Compile TypeScript to `built/` directory
- `npm run watch` - Watch mode compilation
- `npm start` - Build and run server (port 3000, configurable via `LGM_PORT`)
- `npm run monitor` - Development server with nodemon auto-restart
- `npm test` - Run all tests with coverage (nyc + mocha)
- `RUN_E2E_TESTS=true npm test` - Run tests including e2e scenarios
- `npz stryker run --config-file stryker.conf.js` - Mutation testing

**Shell aliases available after `nix-shell`:**
- `start-api` - Start API server (production)
- `dev-api` - Start API server (development with auto-restart)
- `test-api` - Run API tests
- `build-all` - Build both API and client
- `install-deps` - Install all dependencies

### Frontend Development (run inside nix-shell)
- `cd client && npm run dev` - Development server with hot reload
- `cd client && npm run build` - Production build with type checking
- `cd client && npm run type-check` - TypeScript validation only
- `cd client && npm run test:unit` - Run Vitest unit tests
- `cd client && npm run lint` - ESLint with auto-fix

**Shell aliases available after `nix-shell`:**
- `start-client` - Start client development server
- `test-client` - Run client unit tests
- `startup-servers` - Start both API and frontend servers together

## Architecture

### Game Logic Flow
LGM is a turn-based strategy game where players control 9 actors (units) on a hexagonal grid world.

**Turn Processing**: Each turn has 10 timesteps. Players submit movement orders, then the server processes all orders simultaneously across timesteps, handling collisions and invalid moves.

**Core Services**:
- `GameService` - High-level game operations (create, join, submit orders, get results)
- `Rules` - Game mechanics, movement validation, turn processing
- `Store` - In-memory persistence layer (no database)
- `Models` - Core data structures (Game, World, Actor, TurnOrders, TurnResult)

### API Design
OpenAPI 3.0 specification (`api/spec/api.yml`) with Exegesis middleware. Authentication via bearer tokens stored in memory. Main endpoints:
- Game lifecycle: `POST /games`, `PUT /games/{id}` (join), `GET /games`
- Turn mechanics: `POST /games/{gameId}/turns/{turn}/players/{playerId}` (orders), `GET` variant (results)
- Auth: `POST /users/login`

### Frontend State Management
Vue 3 + Pinia stores:
- `Games.store` - Current game state, world data, turn information
- `User.store` - Authentication token, persisted to localStorage

### Testing Patterns
Backend uses Mocha with comprehensive integration tests in `GameService.test.ts`. Tests cover game creation, multi-player joining, order validation, and turn processing scenarios. Frontend uses Vitest for component testing.

### Key Development Notes
- All TypeScript compilation outputs to `built/` directory
- Game world is hardcoded 20x20 grid with predefined terrain
- Actors spawn in 3x3 formations per player
- Movement uses 6 hex directions: N, NE, SE, S, SW, NW
- In-memory storage means server restarts lose all game state
- Frontend expects backend on localhost:3000 by default
- **Required symlink `lib -> api` is automatically created by `shell.nix`**