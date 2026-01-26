# Nix development environment for LGM - A turn-based strategy game
# 
# This shell provides all necessary dependencies and build tools for:
# - TypeScript backend API (Express server)
# - Vue 3 frontend client (Vite dev server)
#
# Usage:
#   nix-shell            # Enter development environment
#   nix-shell --run "startup-servers"  # Start both API and frontend servers
#
# After entering the shell:
#   cd api && npm install && npm start        # Start API server on port 3000
#   cd client && npm install && npm run dev   # Start frontend on port 5173
#
{ pkgs ? import <nixpkgs> {} }:

pkgs.mkShell {
  name = "lgm-dev-environment";

  # Development dependencies
  buildInputs = with pkgs; [
    # Core development tools
    nodejs_20        # Node.js 20.x LTS - matches current environment
    nodePackages.npm # npm package manager
    git             # Version control
    
    # Additional useful tools for development
    curl            # For testing API endpoints
    jq              # JSON parsing for API responses
    tree            # Directory structure visualization
    which           # Debugging PATH issues
  ];

  # Environment setup and shell hooks
  shellHook = ''
    echo "Welcome to LGM Development Environment"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "Node.js version: $(node --version)"
    echo "npm version: $(npm --version)"
    echo "Current directory: $(pwd)"
    echo ""

    # Create required symlink if it doesn't exist
    if [ ! -L "./lib" ]; then
      echo "Creating required symlink: lib -> api"
      ln -sf api lib
      echo "Symlink created successfully"
    else
      echo "Required symlink already exists: lib -> api"
    fi

    # Display project structure
    echo ""
    echo "Project Structure:"
    echo "├── api/          # TypeScript backend (Express server)"
    echo "├── client/       # Vue 3 frontend (Vite dev server)"
    echo "└── lib -> api    # Required symlink for frontend builds"
    echo ""

    # Create helpful aliases and functions
    alias install-deps='echo "Installing dependencies..." && (cd api && npm install) && (cd client && npm install)'
    alias build-all='echo "Building all components..." && (cd api && npm run build) && (cd client && npm run build)'
    alias test-api='cd api && npm test'
    alias test-client='cd client && npm run test:unit'
    alias start-api='cd api && npm start'
    alias start-client='cd client && npm run dev'
    alias dev-api='cd api && npm run monitor'

    # Function to start both servers
    startup-servers() {
      echo "Starting LGM development servers..."
      echo ""
      echo "Setup checklist:"
      echo "1. Installing API dependencies..."
      (cd api && npm install)
      echo "2. Installing client dependencies..."
      (cd client && npm install)
      echo "3. Building API..."
      (cd api && npm run build)
      echo ""
      echo "Starting servers:"
      echo "• API server will start on http://localhost:3000"
      echo "• Frontend will start on http://localhost:5173"
      echo ""
      echo "Press Ctrl+C to stop the servers"
      echo ""
      
      # Start API server in background
      echo "Starting API server..."
      (cd api && npm start) &
      API_PID=$!
      
      # Wait a moment for API to start
      sleep 3
      
      # Start frontend server
      echo "Starting frontend development server..."
      (cd client && npm run dev) &
      CLIENT_PID=$!
      
      # Function to cleanup on exit
      cleanup() {
        echo ""
        echo "Shutting down servers..."
        kill $API_PID 2>/dev/null || true
        kill $CLIENT_PID 2>/dev/null || true
        exit 0
      }
      
      # Set up signal handlers
      trap cleanup SIGINT SIGTERM
      
      # Wait for both processes
      wait $API_PID
      wait $CLIENT_PID
    }

    # Make the function available
    export -f startup-servers

    echo "Available commands:"
    echo "• install-deps      # Install all dependencies"
    echo "• build-all         # Build both API and client"
    echo "• test-api          # Run API tests"
    echo "• test-client       # Run client tests"
    echo "• start-api         # Start API server (production)"
    echo "• dev-api           # Start API server (development with auto-restart)"
    echo "• start-client      # Start client development server"
    echo "• startup-servers   # Start both servers together"
    echo ""
    echo "Quick start:"
    echo "1. Run 'install-deps' to install all dependencies"
    echo "2. Run 'startup-servers' to start both API and frontend"
    echo "3. Open http://localhost:5173 in your browser"
    echo ""
    echo "Ready for development!"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  '';

  # Environment variables
  # Set NODE_ENV for development
  NODE_ENV = "development";
  
  # Ensure npm uses the Nix-provided Node.js
  NPM_CONFIG_PREFIX = "\${HOME}/.npm-global";
  
  # Set default port for API (can be overridden with LGM_PORT)
  LGM_PORT = "3000";
}
