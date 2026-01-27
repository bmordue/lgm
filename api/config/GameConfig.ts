/**
 * Game Configuration
 * Centralizes all game-related constants and configuration values
 */

export interface GameConfiguration {
  /** Maximum number of timesteps per turn */
  timestepMax: number;
  
  /** Default world dimensions */
  world: {
    /** Width of the game world grid */
    width: number;
    /** Height of the game world grid */
    height: number;
  };
  
  /** Player-related configuration */
  players: {
    /** Maximum number of players allowed per game */
    maxPlayers: number;
  };
  
  /** Visibility and line-of-sight configuration */
  visibility: {
    /** Maximum visibility range in hexes */
    maxRange: number;
    /** Default sight range for actors */
    defaultSightRange: number;
  };
  
  /** Actor placement configuration */
  actors: {
    /** Number of actors per player */
    countPerPlayer: number;
    /** Formation width for actor placement */
    formationWidth: number;
    /** Formation height for actor placement */
    formationHeight: number;
  };
}

/**
 * Default game configuration
 * Can be overridden via environment variables
 */
export const DEFAULT_CONFIG: GameConfiguration = {
  timestepMax: 10,
  
  world: {
    width: parseInt(process.env.LGM_WORLD_WIDTH || '10', 10),
    height: parseInt(process.env.LGM_WORLD_HEIGHT || '10', 10),
  },
  
  players: {
    maxPlayers: parseInt(process.env.LGM_MAX_PLAYERS || '4', 10),
  },
  
  visibility: {
    maxRange: parseInt(process.env.LGM_VISIBILITY_RANGE || '10', 10),
    defaultSightRange: parseInt(process.env.LGM_DEFAULT_SIGHT_RANGE || '7', 10),
  },
  
  actors: {
    countPerPlayer: 9,
    formationWidth: 3,
    formationHeight: 3,
  },
};

/**
 * Frozen game configuration instance
 * Initialized once at module load time for efficiency
 */
export const GAME_CONFIG: Readonly<GameConfiguration> = Object.freeze({ ...DEFAULT_CONFIG });

/**
 * Get the current game configuration
 * Returns a frozen copy to prevent accidental modification
 */
export function getConfig(): Readonly<GameConfiguration> {
  return GAME_CONFIG;
}

/**
 * Server configuration
 */
export const SERVER_CONFIG = {
  port: parseInt(process.env.LGM_PORT || '3000', 10),
  debug: process.env.LGM_DEBUG === 'true',
};
