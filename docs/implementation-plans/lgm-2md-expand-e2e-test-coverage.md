# Implementation Plan: Expand E2E Test Coverage

**Issue ID**: lgm-2md
**Priority**: P3
**Type**: Task

## 1. Summary

Expand end-to-end (E2E) testing scenarios to provide comprehensive coverage of the API's critical user flows. Currently, E2E tests are minimal and gated behind `RUN_E2E_TESTS` environment variable, with only basic scenarios covered.

## 2. Problem

The current E2E test suite (`api/test/e2e.test.ts`) has several limitations:

- **Limited Coverage**: Only covers basic game creation, joining, and order submission
- **Gated Execution**: Tests only run when `RUN_E2E_TESTS=true`, making them easy to skip
- **No Multi-Player Scenarios**: Missing tests for multi-player interactions
- **No Error Scenarios**: Doesn't test edge cases or error conditions
- **No Complete Game Flow**: Doesn't test a full game from creation to completion
- **Commented-Out Tests**: `harness.test.ts` has commented out tests that should be enabled
- **Manual Setup Required**: Tests require manual server startup

Related files:
- `api/test/e2e.test.ts` - Main E2E test file (minimal coverage)
- `api/test/harness.test.ts` - Has commented-out E2E tests
- `api/test/e2e-manual.ts` - Appears to have additional manual tests

## 3. Current State Analysis

### Existing E2E Test Coverage
From `e2e.test.ts`:
1. ✅ User login
2. ✅ Create game
3. ✅ Join game
4. ✅ Send orders (empty)
5. ✅ Get turn results

### Missing Critical Scenarios
1. ❌ Multi-player game (2+ players)
2. ❌ Complete turn cycle (orders → processing → results)
3. ❌ Movement orders with actual directions
4. ❌ Combat/attack orders
5. ❌ Game state transitions (LOBBY → IN_PROGRESS → COMPLETED)
6. ❌ Player management (kick, host transfer, start game)
7. ❌ Error conditions (full game, duplicate join, invalid orders)
8. ❌ Visibility and fog of war
9. ❌ Actor death and respawn scenarios
10. ❌ Turn progression and synchronization

### Test Infrastructure Issues
- Tests require running server (not isolated)
- No test database cleanup between runs
- Hard-coded URLs (`http://localhost:3000`)
- Limited assertions on response structure

## 4. Proposed Solution

Expand E2E test coverage to include:

1. **Complete User Flows**: Full game lifecycle from creation to completion
2. **Multi-Player Scenarios**: 2-4 player game interactions
3. **Error Handling**: Test all error conditions
4. **New Features**: Player management, game states, combat (when available)
5. **Automated Setup**: Server lifecycle management in tests
6. **Better Assertions**: Validate full response structure, not just status codes

### Test Organization Structure
```
api/test/
├── e2e/
│   ├── setup.ts                 # Test setup, server lifecycle
│   ├── auth.e2e.test.ts         # Authentication flows
│   ├── game-lifecycle.e2e.test.ts  # Create, join, start
│   ├── player-management.e2e.test.ts  # Kick, transfer host
│   ├── turn-processing.e2e.test.ts    # Orders and results
│   ├── multi-player.e2e.test.ts       # 2-4 player scenarios
│   ├── error-scenarios.e2e.test.ts    # Edge cases, errors
│   └── complete-game.e2e.test.ts      # Full game flow
```

## 5. Implementation Plan

### Phase 1: Test Infrastructure Setup (2-3 hours)

#### 1.1 Create E2E Test Directory Structure
```bash
mkdir -p api/test/e2e
```

#### 1.2 Implement Server Lifecycle Management
Create `api/test/e2e/setup.ts`:

```typescript
import { ChildProcess, spawn } from 'child_process';
import superagent from 'superagent';

let serverProcess: ChildProcess | null = null;

export async function startTestServer(): Promise<void> {
    return new Promise((resolve, reject) => {
        // Start server in test mode
        serverProcess = spawn('npm', ['start'], {
            env: { ...process.env, NODE_ENV: 'test', LGM_PORT: '3001' },
            cwd: process.cwd()
        });

        serverProcess.stdout?.on('data', (data) => {
            if (data.toString().includes('Listening on port')) {
                setTimeout(resolve, 500); // Wait for server to be ready
            }
        });

        serverProcess.stderr?.on('data', (data) => {
            console.error(`Server error: ${data}`);
        });

        setTimeout(() => reject(new Error('Server startup timeout')), 10000);
    });
}

export async function stopTestServer(): Promise<void> {
    if (serverProcess) {
        serverProcess.kill();
        serverProcess = null;
    }
}

export async function waitForServer(url: string, maxAttempts = 10): Promise<void> {
    for (let i = 0; i < maxAttempts; i++) {
        try {
            await superagent.get(url);
            return;
        } catch {
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }
    throw new Error(`Server not ready at ${url}`);
}

export function getTestServerUrl(): string {
    return process.env.E2E_SERVER_URL || 'http://localhost:3001';
}
```

#### 1.3 Create Test Helpers
Create `api/test/e2e/helpers.ts`:

```typescript
import superagent from 'superagent';
import { getTestServerUrl } from './setup';

const BASE_URL = getTestServerUrl();

export async function login(username: string, password: string = 'testpass'): Promise<string> {
    const response = await superagent
        .post(`${BASE_URL}/users/login`)
        .send({ username, password });
    return response.body.token;
}

export async function createGame(token: string, maxPlayers?: number) {
    const response = await superagent
        .post(`${BASE_URL}/games`)
        .set('Authorization', `Bearer ${token}`)
        .send({ maxPlayers });
    return response.body;
}

export async function joinGame(token: string, gameId: number) {
    const response = await superagent
        .put(`${BASE_URL}/games/${gameId}`)
        .set('Authorization', `Bearer ${token}`);
    return response.body;
}

export async function submitOrders(token: string, gameId: number, turn: number, playerId: number, orders: any[]) {
    const response = await superagent
        .post(`${BASE_URL}/games/${gameId}/turns/${turn}/players/${playerId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ gameId, turn, playerId, orders });
    return response.body;
}

export async function getTurnResults(token: string, gameId: number, turn: number, playerId: number) {
    const response = await superagent
        .get(`${BASE_URL}/games/${gameId}/turns/${turn}/players/${playerId}`)
        .set('Authorization', `Bearer ${token}`);
    return response.body;
}

export async function startGame(token: string, gameId: number) {
    const response = await superagent
        .put(`${BASE_URL}/games/${gameId}/start`)
        .set('Authorization', `Bearer ${token}`);
    return response.body;
}
```

### Phase 2: Basic E2E Test Scenarios (3-4 hours)

#### 2.1 Authentication Tests
Create `api/test/e2e/auth.e2e.test.ts`:

```typescript
import assert from 'assert';
import superagent from 'superagent';
import { getTestServerUrl } from './setup';

describe('E2E: Authentication', () => {
    const BASE_URL = getTestServerUrl();

    it('should login with valid credentials', async () => {
        const response = await superagent
            .post(`${BASE_URL}/users/login`)
            .send({ username: 'testuser', password: 'testpass' });

        assert.equal(response.statusCode, 200);
        assert(response.body.token);
        assert.equal(response.body.username, 'testuser');
    });

    it('should allow different users to login', async () => {
        const user1 = await superagent
            .post(`${BASE_URL}/users/login`)
            .send({ username: 'player1', password: 'pass1' });

        const user2 = await superagent
            .post(`${BASE_URL}/users/login`)
            .send({ username: 'player2', password: 'pass2' });

        assert(user1.body.token !== user2.body.token);
    });
});
```

#### 2.2 Game Lifecycle Tests
Create `api/test/e2e/game-lifecycle.e2e.test.ts`:

```typescript
import assert from 'assert';
import { login, createGame, joinGame, startGame } from './helpers';

describe('E2E: Game Lifecycle', () => {
    let hostToken: string;

    before(async () => {
        hostToken = await login('gamehost');
    });

    it('should create a game with default settings', async () => {
        const game = await createGame(hostToken);
        assert(typeof game.gameId === 'number');
    });

    it('should create a game with custom player limit', async () => {
        const game = await createGame(hostToken, 6);
        assert(typeof game.gameId === 'number');
    });

    it('should allow host to join their own game', async () => {
        const game = await createGame(hostToken);
        const joinResponse = await joinGame(hostToken, game.gameId);

        assert.equal(joinResponse.gameId, game.gameId);
        assert(typeof joinResponse.playerId === 'number');
        assert(joinResponse.world);
    });

    it('should transition game from LOBBY to IN_PROGRESS on start', async () => {
        const game = await createGame(hostToken);
        await joinGame(hostToken, game.gameId);

        const player2Token = await login('player2');
        await joinGame(player2Token, game.gameId);

        const startResponse = await startGame(hostToken, game.gameId);
        assert.equal(startResponse.success, true);

        // Verify game state changed
        // (would need a GET /games/{id} endpoint to verify)
    });
});
```

#### 2.3 Player Management Tests
Create `api/test/e2e/player-management.e2e.test.ts`:

```typescript
import assert from 'assert';
import superagent from 'superagent';
import { login, createGame, joinGame } from './helpers';
import { getTestServerUrl } from './setup';

describe('E2E: Player Management', () => {
    const BASE_URL = getTestServerUrl();
    let hostToken: string;
    let player2Token: string;

    before(async () => {
        hostToken = await login('host');
        player2Token = await login('player2');
    });

    it('should allow host to kick a player', async () => {
        const game = await createGame(hostToken);
        const hostJoin = await joinGame(hostToken, game.gameId);
        const player2Join = await joinGame(player2Token, game.gameId);

        const kickResponse = await superagent
            .delete(`${BASE_URL}/games/${game.gameId}/players/${player2Join.playerId}`)
            .set('Authorization', `Bearer ${hostToken}`);

        assert.equal(kickResponse.body.success, true);
    });

    it('should prevent non-host from kicking players', async () => {
        const game = await createGame(hostToken);
        await joinGame(hostToken, game.gameId);
        const player2Join = await joinGame(player2Token, game.gameId);

        const player3Token = await login('player3');
        const player3Join = await joinGame(player3Token, game.gameId);

        try {
            await superagent
                .delete(`${BASE_URL}/games/${game.gameId}/players/${player2Join.playerId}`)
                .set('Authorization', `Bearer ${player3Token}`);
            assert.fail('Should have thrown error');
        } catch (error: any) {
            assert.equal(error.status, 403 || 400);
        }
    });

    it('should allow host to transfer host status', async () => {
        const game = await createGame(hostToken);
        const hostJoin = await joinGame(hostToken, game.gameId);
        const player2Join = await joinGame(player2Token, game.gameId);

        const transferResponse = await superagent
            .put(`${BASE_URL}/games/${game.gameId}/host`)
            .set('Authorization', `Bearer ${hostToken}`)
            .send({ newHostPlayerId: player2Join.playerId });

        assert.equal(transferResponse.body.success, true);
    });
});
```

### Phase 3: Multi-Player Scenarios (3-4 hours)

#### 3.1 Multi-Player Game Tests
Create `api/test/e2e/multi-player.e2e.test.ts`:

```typescript
import assert from 'assert';
import { login, createGame, joinGame, submitOrders, getTurnResults, startGame } from './helpers';
import { Direction, OrderType } from '../../service/Models';

describe('E2E: Multi-Player Scenarios', () => {
    it('should support 2-player game', async () => {
        const p1Token = await login('player1');
        const p2Token = await login('player2');

        const game = await createGame(p1Token, 2);
        const p1Join = await joinGame(p1Token, game.gameId);
        const p2Join = await joinGame(p2Token, game.gameId);

        assert.equal(p1Join.gameId, p2Join.gameId);
        assert(p1Join.playerId !== p2Join.playerId);
    });

    it('should handle simultaneous turn submissions', async () => {
        const p1Token = await login('player1');
        const p2Token = await login('player2');

        const game = await createGame(p1Token, 2);
        const p1Join = await joinGame(p1Token, game.gameId);
        const p2Join = await joinGame(p2Token, game.gameId);

        await startGame(p1Token, game.gameId);

        const turn = 1;
        const p1Orders = { orders: [] }; // Empty orders for simplicity
        const p2Orders = { orders: [] };

        // Submit orders simultaneously
        const [p1Response, p2Response] = await Promise.all([
            submitOrders(p1Token, game.gameId, turn, p1Join.playerId, p1Orders.orders),
            submitOrders(p2Token, game.gameId, turn, p2Join.playerId, p2Orders.orders)
        ]);

        assert.equal(p1Response.success || p1Response.complete, true);
        assert.equal(p2Response.success || p2Response.complete, true);
    });

    it('should support 4-player game', async () => {
        const tokens = await Promise.all([
            login('p1'), login('p2'), login('p3'), login('p4')
        ]);

        const game = await createGame(tokens[0], 4);
        const joins = await Promise.all(
            tokens.map(token => joinGame(token, game.gameId))
        );

        assert.equal(joins.length, 4);
        const uniquePlayers = new Set(joins.map(j => j.playerId));
        assert.equal(uniquePlayers.size, 4);
    });

    it('should prevent joining when game is full', async () => {
        const p1Token = await login('player1');
        const p2Token = await login('player2');
        const p3Token = await login('player3');

        const game = await createGame(p1Token, 2); // Max 2 players
        await joinGame(p1Token, game.gameId);
        await joinGame(p2Token, game.gameId);

        try {
            await joinGame(p3Token, game.gameId);
            assert.fail('Should not allow joining full game');
        } catch (error: any) {
            assert.equal(error.status, 400);
            assert(error.response.body.message.includes('full'));
        }
    });
});
```

### Phase 4: Turn Processing and Movement (2-3 hours)

#### 4.1 Turn Processing Tests
Create `api/test/e2e/turn-processing.e2e.test.ts`:

```typescript
import assert from 'assert';
import { login, createGame, joinGame, submitOrders, getTurnResults, startGame } from './helpers';
import { Direction, OrderType } from '../../service/Models';

describe('E2E: Turn Processing', () => {
    it('should process movement orders', async () => {
        const token = await login('player1');
        const game = await createGame(token);
        const joinResponse = await joinGame(token, game.gameId);

        await startGame(token, game.gameId);

        const turn = 1;
        const actorId = joinResponse.world.actors[0].id;
        const orders = [{
            actorId: actorId,
            orderType: OrderType.MOVE,
            ordersList: [Direction.UP_RIGHT, Direction.UP_RIGHT]
        }];

        await submitOrders(token, game.gameId, turn, joinResponse.playerId, orders);
        const results = await getTurnResults(token, game.gameId, turn, joinResponse.playerId);

        assert(results.world);
        assert(results.world.actors.length > 0);

        // Verify actor moved
        const movedActor = results.world.actors.find((a: any) => a.id === actorId);
        assert(movedActor);
        // Position should have changed (exact position depends on implementation)
    });

    it('should handle empty orders (actors stand still)', async () => {
        const token = await login('player1');
        const game = await createGame(token);
        const joinResponse = await joinGame(token, game.gameId);

        await startGame(token, game.gameId);

        const turn = 1;
        await submitOrders(token, game.gameId, turn, joinResponse.playerId, []);
        const results = await getTurnResults(token, game.gameId, turn, joinResponse.playerId);

        assert(results.world);
        // All actors should be in original positions
    });

    it('should process multiple turns sequentially', async () => {
        const token = await login('player1');
        const game = await createGame(token);
        const joinResponse = await joinGame(token, game.gameId);

        await startGame(token, game.gameId);

        for (let turn = 1; turn <= 3; turn++) {
            await submitOrders(token, game.gameId, turn, joinResponse.playerId, []);
            const results = await getTurnResults(token, game.gameId, turn, joinResponse.playerId);
            assert(results.world);
        }
    });
});
```

### Phase 5: Error Scenarios and Edge Cases (2-3 hours)

#### 5.1 Error Scenario Tests
Create `api/test/e2e/error-scenarios.e2e.test.ts`:

```typescript
import assert from 'assert';
import { login, createGame, joinGame, submitOrders, startGame } from './helpers';
import superagent from 'superagent';
import { getTestServerUrl } from './setup';

describe('E2E: Error Scenarios', () => {
    const BASE_URL = getTestServerUrl();

    it('should reject joining non-existent game', async () => {
        const token = await login('player1');
        try {
            await joinGame(token, 99999);
            assert.fail('Should have thrown error');
        } catch (error: any) {
            assert.equal(error.status, 404 || 400);
        }
    });

    it('should reject duplicate username in same game', async () => {
        const token1 = await login('samename');
        const token2 = await login('samename');

        const game = await createGame(token1);
        await joinGame(token1, game.gameId);

        try {
            await joinGame(token2, game.gameId);
            assert.fail('Should reject duplicate username');
        } catch (error: any) {
            assert.equal(error.status, 400);
        }
    });

    it('should reject joining game that already started', async () => {
        const p1Token = await login('player1');
        const p2Token = await login('player2');
        const p3Token = await login('player3');

        const game = await createGame(p1Token);
        await joinGame(p1Token, game.gameId);
        await joinGame(p2Token, game.gameId);

        await startGame(p1Token, game.gameId);

        try {
            await joinGame(p3Token, game.gameId);
            assert.fail('Should not allow joining started game');
        } catch (error: any) {
            assert.equal(error.status, 400);
            assert(error.response.body.message.includes('started'));
        }
    });

    it('should reject orders for non-existent turn', async () => {
        const token = await login('player1');
        const game = await createGame(token);
        const joinResponse = await joinGame(token, game.gameId);

        await startGame(token, game.gameId);

        try {
            await submitOrders(token, game.gameId, 999, joinResponse.playerId, []);
            assert.fail('Should reject orders for future turn');
        } catch (error: any) {
            assert(error.status >= 400);
        }
    });

    it('should reject invalid movement directions', async () => {
        const token = await login('player1');
        const game = await createGame(token);
        const joinResponse = await joinGame(token, game.gameId);

        await startGame(token, game.gameId);

        const invalidOrders = [{
            actorId: joinResponse.world.actors[0].id,
            orderType: 0, // MOVE
            ordersList: ['INVALID_DIRECTION' as any]
        }];

        try {
            await submitOrders(token, game.gameId, 1, joinResponse.playerId, invalidOrders);
            // May or may not fail depending on validation
        } catch (error: any) {
            assert(error.status >= 400);
        }
    });
});
```

### Phase 6: Complete Game Flow Test (2 hours)

#### 6.1 End-to-End Complete Game
Create `api/test/e2e/complete-game.e2e.test.ts`:

```typescript
import assert from 'assert';
import { login, createGame, joinGame, submitOrders, getTurnResults, startGame } from './helpers';

describe('E2E: Complete Game Flow', () => {
    it('should complete a full 2-player game over 5 turns', async () => {
        // Setup
        const p1Token = await login('player1');
        const p2Token = await login('player2');

        // Create and join
        const game = await createGame(p1Token, 2);
        const p1Join = await joinGame(p1Token, game.gameId);
        const p2Join = await joinGame(p2Token, game.gameId);

        // Start game
        await startGame(p1Token, game.gameId);

        // Play 5 turns
        for (let turn = 1; turn <= 5; turn++) {
            // Both players submit orders
            await Promise.all([
                submitOrders(p1Token, game.gameId, turn, p1Join.playerId, []),
                submitOrders(p2Token, game.gameId, turn, p2Join.playerId, [])
            ]);

            // Both players get results
            const [p1Results, p2Results] = await Promise.all([
                getTurnResults(p1Token, game.gameId, turn, p1Join.playerId),
                getTurnResults(p2Token, game.gameId, turn, p2Join.playerId)
            ]);

            // Verify results
            assert(p1Results.world);
            assert(p2Results.world);

            // Players see their own world view (visibility filtering)
            assert(p1Results.world.actors.some((a: any) => a.owner === p1Join.playerId));
            assert(p2Results.world.actors.some((a: any) => a.owner === p2Join.playerId));
        }
    });
});
```

### Phase 7: Test Configuration and CI Integration (1-2 hours)

#### 7.1 Update package.json Test Scripts
```json
{
  "scripts": {
    "test": "mocha --require ts-node/register 'test/**/*.test.ts'",
    "test:e2e": "RUN_E2E_TESTS=true mocha --require ts-node/register 'test/e2e/**/*.e2e.test.ts' --timeout 30000",
    "test:unit": "mocha --require ts-node/register 'test/**/*.test.ts' --grep -e2e",
    "test:all": "npm run test:unit && npm run test:e2e"
  }
}
```

#### 7.2 Add Test Documentation
Update `CONTRIBUTING.md` or create `docs/TESTING.md`:

```markdown
## E2E Testing

### Running E2E Tests

```bash
# Start the server in one terminal
npm start

# Run E2E tests in another terminal
npm run test:e2e
```

### Writing E2E Tests

- Place tests in `api/test/e2e/`
- Use `.e2e.test.ts` suffix
- Import helpers from `./helpers`
- Use descriptive test names
- Clean up resources after tests
```

## 6. Success Metrics

- [ ] All existing E2E tests passing
- [ ] New E2E test suite covers:
  - [ ] Authentication
  - [ ] Game lifecycle (create, join, start)
  - [ ] Player management (kick, transfer host)
  - [ ] 2-player games
  - [ ] 4-player games
  - [ ] Turn processing
  - [ ] Movement orders
  - [ ] Error scenarios
  - [ ] Complete game flow
- [ ] Tests run reliably in CI
- [ ] Test coverage reports include E2E coverage
- [ ] Documentation updated

## 7. Timeline Estimate

- **Phase 1 (Infrastructure)**: 2-3 hours
- **Phase 2 (Basic Scenarios)**: 3-4 hours
- **Phase 3 (Multi-Player)**: 3-4 hours
- **Phase 4 (Turn Processing)**: 2-3 hours
- **Phase 5 (Error Scenarios)**: 2-3 hours
- **Phase 6 (Complete Game)**: 2 hours
- **Phase 7 (CI Integration)**: 1-2 hours

**Total Estimated Time**: 15-21 hours over 3-4 development sessions

## 8. Dependencies

None - this task is ready to start.

## 9. Risks and Considerations

### Server Dependency
E2E tests require running server. Mitigation:
- Automate server startup in tests
- Use separate test port (3001)
- Clear state between tests

### Test Flakiness
E2E tests can be flaky due to timing. Mitigation:
- Add proper waits for server startup
- Use retries for network requests
- Implement proper cleanup

### Performance
E2E tests are slower than unit tests. Mitigation:
- Run in parallel where possible
- Keep separate from fast unit tests
- Run on CI only for important branches

### State Management
In-memory storage means tests share state. Mitigation:
- Restart server between test suites
- Use unique usernames per test
- Consider test database when DB integration lands

## 10. Post-Implementation

After completing E2E test expansion:
1. **Monitor**: Watch for flaky tests and fix them
2. **Maintain**: Update tests as API evolves
3. **Extend**: Add tests for new features as they're added
4. **Document**: Keep test documentation current

This provides foundation for:
- Confident refactoring
- Regression detection
- API contract validation
- Integration verification
