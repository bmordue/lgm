# Configuration Guide

## Environment Variables

LGM can be configured using the following environment variables:

### Server Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `LGM_PORT` | `3000` | Port number for the API server |
| `LGM_DEBUG` | `false` | Enable debug logging (set to `true` to enable) |

### Game Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `LGM_WORLD_WIDTH` | `10` | Width of the game world grid (in hexes) |
| `LGM_WORLD_HEIGHT` | `10` | Height of the game world grid (in hexes) |
| `LGM_MAX_PLAYERS` | `4` | Maximum number of players per game |
| `LGM_VISIBILITY_RANGE` | `10` | Maximum visibility range for actors (in hexes) |
| `LGM_DEFAULT_SIGHT_RANGE` | `7` | Default sight range for actors without weapons (in hexes) |

## Usage Examples

### Development

```bash
# Run with debug logging enabled
LGM_DEBUG=true npm start

# Run on a different port
LGM_PORT=8080 npm start

# Larger game world
LGM_WORLD_WIDTH=20 LGM_WORLD_HEIGHT=20 npm start

# More players per game
LGM_MAX_PLAYERS=8 npm start
```

### Production

```bash
# Set multiple environment variables
export LGM_PORT=3000
export LGM_DEBUG=false
export LGM_WORLD_WIDTH=15
export LGM_WORLD_HEIGHT=15
export LGM_MAX_PLAYERS=6
npm start
```

### Docker

```dockerfile
ENV LGM_PORT=3000
ENV LGM_WORLD_WIDTH=20
ENV LGM_WORLD_HEIGHT=20
ENV LGM_MAX_PLAYERS=8
```

## Configuration File

For programmatic access to configuration values, import from `config/GameConfig`:

```typescript
import { getConfig, SERVER_CONFIG } from './config/GameConfig';

const config = getConfig();
console.log(`World size: ${config.world.width}x${config.world.height}`);
console.log(`Max players: ${config.players.maxPlayers}`);
console.log(`Server port: ${SERVER_CONFIG.port}`);
```

## Default Values

All configuration values have sensible defaults and can be used without setting any environment variables. The defaults are:

- **World Size**: 10x10 hexes
- **Max Players**: 4 per game
- **Visibility Range**: 10 hexes
- **Default Sight Range**: 7 hexes
- **Server Port**: 3000
- **Debug Mode**: Disabled

## Notes

- Configuration values are read at startup and cannot be changed without restarting the server
- Invalid values will fall back to defaults (e.g., non-numeric strings will use default values)
- The configuration is immutable at runtime to prevent accidental modifications
