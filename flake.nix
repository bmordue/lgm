{
  description = "LGM - Turn-based strategy game development environment";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = nixpkgs.legacyPackages.${system};
      in
      {
        devShells.default = pkgs.mkShell {
          name = "lgm-dev-environment";

          buildInputs = with pkgs; [
            # Core development tools
            nodejs_20        # Node.js 20.x LTS
            nodePackages.npm # npm package manager
            git             # Version control
            
            # Additional useful tools
            curl            # For testing API endpoints
            jq              # JSON parsing for API responses
            tree            # Directory structure visualization
            which           # Debugging PATH issues
          ];

          shellHook = ''
            echo "🎮 Welcome to LGM Development Environment (Flake)"
            echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
            echo "Node.js version: $(node --version)"
            echo "npm version: $(npm --version)"
            echo ""

            # Create required symlink if it doesn't exist
            if [ ! -L "./lib" ]; then
              echo "📁 Creating required symlink: lib -> api"
              ln -sf api lib
              echo "✅ Symlink created successfully"
            else
              echo "✅ Required symlink already exists: lib -> api"
            fi

            echo ""
            echo "🔧 Quick commands:"
            echo "• cd api && npm install && npm start        # Start API server"
            echo "• cd client && npm install && npm run dev   # Start frontend"
            echo ""
            echo "🌟 Ready for development!"
            echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
          '';

          # Environment variables
          NODE_ENV = "development";
          LGM_PORT = "3000";
        };
      });
}