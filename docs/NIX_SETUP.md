# Nix Development Environment Setup

This directory contains Nix configuration files to set up a complete development environment for LGM (turn-based strategy game).

## What's Included

The Nix environment provides:
- **Node.js 20.x LTS** - JavaScript runtime
- **npm** - Package manager
- **git** - Version control
- **curl** & **jq** - API testing tools
- **tree** - Directory visualization
- Automatic symlink creation (`lib -> api`)
- Helpful aliases and functions

## Quick Start

### Option 1: Traditional Nix Shell
```bash
# Enter the development environment
nix-shell

# Install dependencies and start both servers
startup-servers
```

### Option 2: Nix Flakes (Modern Nix)
```bash
# Enter the development environment
nix develop

# Or run a command directly
nix develop --command startup-servers
```

### Option 3: Automatic with direnv
```bash
# Install direnv first: https://direnv.net/
# Then allow the .envrc file
direnv allow

# The environment will activate automatically when you enter the directory
```

## Manual Development Workflow

After entering the Nix shell:

### Backend API Setup
```bash
cd api
npm install          # Install dependencies
npm run build        # Compile TypeScript
npm start            # Start production server (port 3000)
# OR
npm run monitor      # Start development server with auto-restart
```

### Frontend Client Setup
```bash
cd client
npm install          # Install dependencies
npm run dev          # Start development server (port 5173)
```

### Testing
```bash
# Test backend
cd api && npm test

# Test frontend
cd client && npm run test:unit
```

## Available Aliases (in shell.nix)

- `install-deps` - Install all dependencies for both API and client
- `build-all` - Build both API and client
- `test-api` - Run API tests
- `test-client` - Run client tests  
- `start-api` - Start API server (production mode)
- `dev-api` - Start API server (development mode with auto-restart)
- `start-client` - Start client development server
- `startup-servers` - Start both API and client servers together

## Project Structure

```
├── api/              # TypeScript backend (Express server)
│   ├── package.json  # Backend dependencies
│   ├── index.ts      # Server entry point
│   └── ...
├── client/           # Vue 3 frontend (Vite dev server)  
│   ├── package.json  # Frontend dependencies
│   ├── src/          # Vue source code
│   └── ...
├── lib -> api        # Required symlink (created automatically)
├── shell.nix         # Traditional Nix shell configuration
├── flake.nix         # Modern Nix flake configuration
└── .envrc            # direnv configuration
```

## Troubleshooting

### Symlink Issues
The `lib -> api` symlink is required for the frontend to access backend models. It's created automatically when entering the Nix shell.

### Port Conflicts
- API server runs on port 3000 (configurable via `LGM_PORT` environment variable)
- Frontend development server runs on port 5173
- Make sure these ports are available

### Node.js Version
The Nix environment provides Node.js 20.x LTS, which matches the project requirements.

## Development URLs

- **Frontend**: http://localhost:5173
- **API**: http://localhost:3000
- **API Documentation**: Check `api/spec/api.yml` for OpenAPI specification

## Testing the Setup

1. Enter the Nix shell: `nix-shell` or `nix develop`
2. Run: `startup-servers`
3. Open http://localhost:5173 in your browser
4. The game interface should load and be able to communicate with the API

Enjoy developing LGM! 🎮