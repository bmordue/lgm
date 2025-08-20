# Player Management Implementation Plan

## Overview

Based on the LGM roadmap analysis, **Player Management** is identified as the next critical feature to implement. This system will enhance game joining mechanics, add host permissions, and improve overall multiplayer experience.

## Current State Analysis

### What's Already Implemented
- Basic game joining via `joinGame()` in GameLifecycleService
- Hard-coded maximum of 4 players per game (`MAX_PLAYERS_PER_GAME = 4`)
- Duplicate username prevention within the same game
- Basic player storage in the Store with gameId and username
- GameSummary includes `playerCount`, `maxPlayers`, and `isFull` fields

### Current Limitations & Issues
- Game creator has no special permissions or control
- Fixed player limit cannot be customized per game
- No way to kick or manage players once joined
- Missing validation for player session management across multiple games
- No distinction between host and regular players
- Limited error handling for edge cases

## Feature Requirements

### 1. Dynamic Player Limits
- Game creators should set player limits when creating games (2-8 players)
- Default to 4 players if not specified
- Update API spec and models to support configurable limits

### 2. Host Permissions System
- Game creator becomes the "host" with special permissions
- Host can:
  - Kick players from the game
  - Change game settings (before game starts)
  - Start the game when ready
  - Transfer host status to another player

### 3. Enhanced Join Validation
- Prevent same user session from joining a game twice
- Allow users to be in multiple games simultaneously
- Better error messages for join failures
- Validate game state (can't join started/completed games)

### 4. Game State Management
- Add game phases: `LOBBY`, `IN_PROGRESS`, `COMPLETED`
- Only allow joins during `LOBBY` phase
- Host controls transition from `LOBBY` to `IN_PROGRESS`

## Implementation Plan

### Phase 1: Data Model Updates (2-3 hours)

#### 1.1 Update Game Model
```typescript
export interface Game {
    id?: number;
    players?: Array<number>;
    hostPlayerId?: number;           // NEW: Host player ID
    maxPlayers?: number;             // NEW: Configurable limit (2-8)
    gameState?: GameState;           // NEW: Game phase
    turn: number;
    worldId: number;
    createdAt?: Date;                // NEW: Creation timestamp
    startedAt?: Date;                // NEW: Game start timestamp
}

export enum GameState {
    LOBBY = 'LOBBY',
    IN_PROGRESS = 'IN_PROGRESS', 
    COMPLETED = 'COMPLETED'
}
```

#### 1.2 Update Player Model
```typescript
export interface Player {
    id?: number;
    gameId: number;
    username?: string;
    isHost?: boolean;                // NEW: Host flag
    joinedAt?: Date;                 // NEW: Join timestamp
    sessionId?: string;              // NEW: Session tracking
}
```

#### 1.3 Update API Spec
- Add `maxPlayers` parameter to `POST /games` endpoint
- Add host management endpoints:
  - `DELETE /games/{gameId}/players/{playerId}` (kick player)
  - `PUT /games/{gameId}/host` (transfer host)
  - `PUT /games/{gameId}/start` (start game)
- Update GameSummary response to include host information

### Phase 2: Core Logic Implementation (4-5 hours)

#### 2.1 Update Game Creation
```typescript
// In GameLifecycleService.ts
export async function createGame(maxPlayers?: number): Promise<CreateGameResponse> {
    const playerLimit = Math.min(Math.max(maxPlayers || 4, 2), 8); // Clamp 2-8
    
    const newGame: Game = {
        turn: 0,
        worldId: await createWorld(),
        maxPlayers: playerLimit,
        gameState: GameState.LOBBY,
        createdAt: new Date(),
        players: []
    };
    
    const gameId = await store.create<Game>(store.keys.games, newGame);
    return { gameId };
}
```

#### 2.2 Enhanced Join Game Logic
```typescript
export async function joinGame(gameId: number, username?: string, sessionId?: string): Promise<JoinGameResponse> {
    const game = await store.read<Game>(store.keys.games, gameId);
    
    // Validation checks
    if (game.gameState !== GameState.LOBBY) {
        throw new Error("Cannot join game: Game already started");
    }
    
    if (game.players.length >= game.maxPlayers) {
        throw new Error("Cannot join game: Game is full");
    }
    
    // Check for duplicate username in this game
    await validateUniqueUsername(game, username);
    
    // Check for duplicate session in this game  
    await validateUniqueSession(game, sessionId);
    
    // Create player
    const isHost = game.players.length === 0; // First player is host
    const player = {
        gameId,
        username,
        sessionId,
        isHost,
        joinedAt: new Date()
    };
    
    const playerId = await store.create(store.keys.players, player);
    
    // Update game
    game.players.push(playerId);
    if (isHost) {
        game.hostPlayerId = playerId;
    }
    
    await store.replace(store.keys.games, gameId, game);
    
    // Setup actors and return filtered game
    const world = await store.read<World>(store.keys.worlds, game.worldId);
    const actors = await rules.setupActors(game, playerId);
    world.actors = world.actors.concat(actors);
    await store.replace(store.keys.worlds, game.worldId, world);
    
    return await rules.filterGameForPlayer(gameId, playerId);
}
```

#### 2.3 Host Management Functions
```typescript
export async function kickPlayer(gameId: number, playerIdToKick: number, requestingPlayerId: number): Promise<void> {
    const game = await store.read<Game>(store.keys.games, gameId);
    await validateHostPermissions(game, requestingPlayerId);
    
    if (game.gameState !== GameState.LOBBY) {
        throw new Error("Cannot kick players: Game already started");
    }
    
    if (playerIdToKick === game.hostPlayerId) {
        throw new Error("Cannot kick the host player");
    }
    
    // Remove player from game
    game.players = game.players.filter(pid => pid !== playerIdToKick);
    await store.replace(store.keys.games, gameId, game);
    
    // Remove player's actors from world
    await removePlayerActors(game.worldId, playerIdToKick);
    
    // Delete player record
    await store.remove(store.keys.players, playerIdToKick);
}

export async function startGame(gameId: number, requestingPlayerId: number): Promise<void> {
    const game = await store.read<Game>(store.keys.games, gameId);
    await validateHostPermissions(game, requestingPlayerId);
    
    if (game.gameState !== GameState.LOBBY) {
        throw new Error("Game already started");
    }
    
    if (game.players.length < 2) {
        throw new Error("Need at least 2 players to start game");
    }
    
    game.gameState = GameState.IN_PROGRESS;
    game.startedAt = new Date();
    await store.replace(store.keys.games, gameId, game);
}

export async function transferHost(gameId: number, newHostPlayerId: number, requestingPlayerId: number): Promise<void> {
    const game = await store.read<Game>(store.keys.games, gameId);
    await validateHostPermissions(game, requestingPlayerId);
    
    if (!game.players.includes(newHostPlayerId)) {
        throw new Error("New host must be a player in the game");
    }
    
    // Update host in game
    game.hostPlayerId = newHostPlayerId;
    await store.replace(store.keys.games, gameId, game);
    
    // Update player records
    const oldHost = await store.read(store.keys.players, requestingPlayerId);
    const newHost = await store.read(store.keys.players, newHostPlayerId);
    
    oldHost.isHost = false;
    newHost.isHost = true;
    
    await store.replace(store.keys.players, requestingPlayerId, oldHost);
    await store.replace(store.keys.players, newHostPlayerId, newHost);
}
```

### Phase 3: API Endpoints (2-3 hours)

#### 3.1 Update Game Controller
```typescript
// Add new endpoints to GameController.ts
export async function kickPlayer(req: Request, res: Response) {
    try {
        const { gameId, playerId } = req.params;
        const requestingPlayerId = extractPlayerIdFromAuth(req);
        
        await gameLifecycleService.kickPlayer(
            parseInt(gameId), 
            parseInt(playerId), 
            requestingPlayerId
        );
        
        res.status(200).json({ success: true });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
}

export async function startGame(req: Request, res: Response) {
    try {
        const { gameId } = req.params;
        const requestingPlayerId = extractPlayerIdFromAuth(req);
        
        await gameLifecycleService.startGame(parseInt(gameId), requestingPlayerId);
        res.status(200).json({ success: true });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
}

export async function transferHost(req: Request, res: Response) {
    try {
        const { gameId } = req.params;
        const { newHostPlayerId } = req.body;
        const requestingPlayerId = extractPlayerIdFromAuth(req);
        
        await gameLifecycleService.transferHost(
            parseInt(gameId), 
            newHostPlayerId, 
            requestingPlayerId
        );
        
        res.status(200).json({ success: true });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
}
```

#### 3.2 Update OpenAPI Specification
Add new endpoints to `spec/api.yml`:
- `DELETE /games/{gameId}/players/{playerId}`
- `PUT /games/{gameId}/start` 
- `PUT /games/{gameId}/host`
- Update `POST /games` to accept `maxPlayers` parameter

### Phase 4: Frontend Integration (3-4 hours)

#### 4.1 Update Vue Components
- Add host controls to game lobby view
- Show player list with host indicator
- Add kick player buttons (host only)
- Add "Start Game" button (host only)
- Show game state and player count

#### 4.2 Update Pinia Stores
```typescript
// In Games.store.ts
export const useGamesStore = defineStore('games', () => {
    // ... existing state
    
    const kickPlayer = async (gameId: number, playerId: number) => {
        try {
            await api.delete(`/games/${gameId}/players/${playerId}`);
            // Refresh game state
            await fetchGame(gameId);
        } catch (error) {
            console.error('Failed to kick player:', error);
            throw error;
        }
    };
    
    const startGame = async (gameId: number) => {
        try {
            await api.put(`/games/${gameId}/start`);
            await fetchGame(gameId);
        } catch (error) {
            console.error('Failed to start game:', error);
            throw error;
        }
    };
    
    const transferHost = async (gameId: number, newHostPlayerId: number) => {
        try {
            await api.put(`/games/${gameId}/host`, { newHostPlayerId });
            await fetchGame(gameId);
        } catch (error) {
            console.error('Failed to transfer host:', error);
            throw error;
        }
    };
    
    return {
        // ... existing returns
        kickPlayer,
        startGame, 
        transferHost
    };
});
```
### Phase 5: Testing & Validation (2-3 hours)

#### 5.1 Backend Tests
```typescript
// Add to GameService.test.ts
describe('Player Management', () => {
    it('should create game with custom player limit', async () => {
        const response = await gameService.createGame(6);
        const game = await store.read<Game>(store.keys.games, response.gameId);
        expect(game.maxPlayers).to.equal(6);
    });
    
    it('should make first player the host', async () => {
        const gameResponse = await gameService.createGame();
        const joinResponse = await gameService.joinGame(gameResponse.gameId, 'host-player');
        
        const player = await store.read(store.keys.players, joinResponse.playerId);
        expect(player.isHost).to.be.true;
    });
    
    it('should prevent joining started games', async () => {
        // Create game, join as host, start game, then try to join
        const gameResponse = await gameService.createGame();
        const hostJoin = await gameService.joinGame(gameResponse.gameId, 'host');
        await gameService.joinGame(gameResponse.gameId, 'player2');
        await gameService.startGame(gameResponse.gameId, hostJoin.playerId);
        
        await expect(
            gameService.joinGame(gameResponse.gameId, 'latecomer')
        ).to.be.rejectedWith('Cannot join game: Game already started');
    });
    
    it('should allow host to kick players', async () => {
        const gameResponse = await gameService.createGame();
        const hostJoin = await gameService.joinGame(gameResponse.gameId, 'host');
        const playerJoin = await gameService.joinGame(gameResponse.gameId, 'player');
        
        await gameService.kickPlayer(
            gameResponse.gameId, 
            playerJoin.playerId, 
            hostJoin.playerId
        );
        
        const game = await store.read<Game>(store.keys.games, gameResponse.gameId);
        expect(game.players).to.not.include(playerJoin.playerId);
    });
    
    it('should prevent non-hosts from kicking players', async () => {
        const gameResponse = await gameService.createGame();
        const hostJoin = await gameService.joinGame(gameResponse.gameId, 'host');
        const player1Join = await gameService.joinGame(gameResponse.gameId, 'player1');
        const player2Join = await gameService.joinGame(gameResponse.gameId, 'player2');
        
        await expect(
            gameService.kickPlayer(
                gameResponse.gameId, 
                player2Join.playerId, 
                player1Join.playerId // Non-host trying to kick
            )
        ).to.be.rejectedWith('Only the host can perform this action');
    });
});
```

#### 5.2 Integration Tests
- Test complete player management workflow
- Test edge cases and error conditions
- Validate API responses match OpenAPI spec
- Test frontend components with mock data

#### 5.3 Manual Testing Checklist
- [ ] Create game with different player limits
- [ ] Join game as multiple players
- [ ] Verify host can kick players
- [ ] Verify non-hosts cannot kick players
- [ ] Test host transfer functionality
- [ ] Verify game starts only when host initiates
- [ ] Test joining full games (should fail)
- [ ] Test joining started games (should fail)
- [ ] Test duplicate username prevention
- [ ] Test session validation across multiple games

## Migration Strategy

### Database Migration
Since the current system uses in-memory storage, no database migration is needed. However, when implementing database persistence later, we'll need migration scripts to:
- Add new columns to games table
- Add new columns to players table
- Set default values for existing games

### API Backward Compatibility
- Maintain existing endpoints unchanged
- Add new optional parameters with sensible defaults
- New endpoints are additive, not replacing existing ones

## Success Metrics

- [ ] All existing tests continue to pass
- [ ] New tests achieve >90% code coverage for new functionality
- [ ] API responses match updated OpenAPI specification
- [ ] Frontend successfully integrates with new backend features
- [ ] Manual testing scenarios all pass
- [ ] Performance remains acceptable (< 100ms for join operations)

## Timeline Estimate

- **Phase 1 (Data Models)**: 2-3 hours
- **Phase 2 (Backend Logic)**: 4-5 hours  
- **Phase 3 (API Endpoints)**: 2-3 hours
- **Phase 4 (Frontend)**: 3-4 hours
- **Phase 5 (Testing)**: 2-3 hours

**Total Estimated Time**: 13-18 hours over 2-3 development sessions

## Next Steps

1. Review and approve this implementation plan
2. Create feature branch: `feature/player-management`
3. Begin with Phase 1 (Data Model Updates)
4. Implement incrementally with tests at each phase
5. Integrate frontend components
6. Conduct thorough testing before merge

## Post-Implementation

After completing Player Management, the next roadmap priorities would be:
1. **Real-time Updates** - WebSocket integration for live game state
2. **Database Integration** - Persistent storage to replace in-memory store
3. **Frontend Testing** - Vue component test coverage

This implementation addresses the critical player management gaps while maintaining system stability and providing a foundation for future multiplayer enhancements.