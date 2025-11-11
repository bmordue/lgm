# GitHub Copilot Instructions for LGM Repository

**ALWAYS follow these instructions first and only fallback to additional search and context gathering if the information here is incomplete or found to be in error.**

## Project Overview

LGM is a turn-based strategy game with a TypeScript backend API and Vue 3 frontend client. Players control 9 actors (units) on a hexagonal grid world through a RESTful API.

## Required Dependencies and Setup

### Initial Setup Commands - ALWAYS use shell.nix
```bash
# Enter the Nix development environment (REQUIRED first step)
nix-shell

# Quick setup: Install dependencies and start both servers
startup-servers

# Alternative manual setup within nix-shell:
install-deps        # Install all dependencies (API + client)
startup-servers     # Start both API and frontend servers
```

**CRITICAL**: Always use `nix-shell` first. The shell.nix environment provides:
- Node.js 20.x LTS with npm  
- All development tools (curl, jq, git)
- Automatic symlink creation (`lib -> api`)
- Helpful aliases and environment setup
- Takes ~90 seconds for full dependency installation, NEVER CANCEL

## Backend Development (./api/) - Run within nix-shell

### Build and Test Commands
```bash
# Build backend (TypeScript compilation)
npm run build  # Takes ~4 seconds, outputs to built/ directory

# Run all tests including unit and integration
npm test  # Takes ~7 seconds, NEVER CANCEL, set timeout to 30+ seconds

# Run tests including E2E (requires running server)
RUN_E2E_TESTS=true npm test  # Takes ~7 seconds, E2E tests fail without running server

# Run mutation testing with Stryker
npx stryker run stryker.config.json  # Takes ~42 seconds, NEVER CANCEL, set timeout to 120+ seconds
```

### Server Commands
```bash
# Start production server (builds first)
npm start  # Builds then runs on port 3000 (configurable via LGM_PORT)

# Development server with auto-restart
npm run monitor  # Uses nodemon, builds then watches for changes

# Watch mode compilation only
npm run watch  # TypeScript compiler in watch mode
```

### Backend Validation Scenarios
After making backend changes, ALWAYS run these validation steps:

1. **Build and test**: `npm run build && npm test`
2. **Start server**: `npm start` - Should show "Listening on port 3000"
3. **Test login**: `curl -X POST http://localhost:3000/users/login -H "Content-Type: application/json" -d '{"username":"test","password":"test"}'`
4. **Create game**: Extract token and `curl -X POST http://localhost:3000/games -H "Authorization: Bearer <token>"`
5. **Join game**: `curl -X PUT http://localhost:3000/games/0 -H "Authorization: Bearer <token>"`

### Backend Architecture Notes
- **TypeScript compilation**: All source compiles to `built/` directory
- **API spec**: Located at `spec/api.yml` (OpenAPI 3.0)
- **Authentication**: Bearer tokens stored in memory
- **Storage**: In-memory only, server restart loses all game state
- **Core services**: GameService, Rules, Store, Models in `service/` directory
- **Game world**: Hardcoded 20x20 hexagonal grid with predefined terrain

## Frontend Development (./client/) - Run within nix-shell

### Build and Development Commands
```bash
# Development server with hot reload
npm run dev  # Starts Vite dev server on port 5173

# Production build
npm run build  # Takes ~5 seconds, runs type-check and build-only in parallel

# Type checking only
npm run type-check  # Vue TypeScript compilation check

# Build without type checking
npm run build-only  # Vite build only
```

### Frontend Testing and Linting
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
- Node.js 22.x
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

# Frontend validation  
cd client && npm run build && npm run lint && npm run test:unit

# Manual testing
# Start both servers and test the complete user scenario above
```

### When Making API Changes
1. Update OpenAPI spec in `api/spec/api.yml`
2. Update controllers in `api/controllers/`
3. Update models in `api/service/Models.ts`
4. Rebuild and test: `npm run build && npm test`
5. Test with frontend integration

### When Making Frontend Changes
1. Ensure backend models are properly imported via `../../../lib/`
2. Update Pinia stores if state management changes
3. Run type checking: `npm run type-check`
4. Test with running backend: Start backend and frontend servers
5. Verify complete user flows work in browser