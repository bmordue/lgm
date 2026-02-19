# Implementation Plan: Standardize API Response Formats

**Issue ID**: lgm-092
**Priority**: P2
**Type**: Chore

## 1. Summary

Standardize response formats across all API endpoints to match the OpenAPI specification. Currently, some endpoints return inconsistent response structures, making the API harder to use and maintain.

## 2. Problem

The API has several inconsistencies in response formats:

- Some endpoints return bare objects, others wrap in additional properties
- Error responses have inconsistent structures
- Success responses don't consistently follow OpenAPI schema definitions
- Missing or inconsistent HTTP status codes for error cases

Examples from `GameController.ts`:
- `createGame()` returns `{ id: result.gameId }` instead of following the schema
- `joinGame()` has custom error handling that may not match spec
- `turnResults()` has complex conditional logic for response structure
- Some endpoints return `{ success: true }` while others return different structures

## 3. Current State Analysis

### Endpoints to Review
1. `POST /games` - createGame
2. `PUT /games/{id}` - joinGame
3. `GET /games` - listGames
4. `POST /games/{gameId}/turns/{turn}/players/{playerId}` - postOrders
5. `GET /games/{gameId}/turns/{turn}/players/{playerId}` - turnResults
6. `DELETE /games/{gameId}/players/{playerId}` - kickPlayer
7. `PUT /games/{gameId}/start` - startGame
8. `PUT /games/{gameId}/host` - transferHost
9. `GET /games/{gameId}/players/{playerId}` - getPlayerGameState
10. `POST /users/login` - login

### Common Issues
- Inconsistent error message format (`message` vs `error` vs `msg`)
- Missing standard HTTP status codes (201 for creation, 204 for no content)
- Response schemas not fully defined in OpenAPI spec
- Controller logic manually setting status codes instead of using spec

## 4. Proposed Solution

Create a standardized response structure that:

1. **Success Responses**: Follow OpenAPI schema definitions exactly
2. **Error Responses**: Use consistent `ErrorMessageResponse` schema
3. **HTTP Status Codes**: Use appropriate codes per REST conventions
4. **Controller Logic**: Simplify by relying on Exegesis middleware

### Standard Response Schemas

```typescript
// Success responses follow specific schemas defined in api.yml
// Error responses always use:
interface ErrorMessageResponse {
    message: string;
    code?: string;  // Optional error code for client handling
}
```

### Standard HTTP Status Codes
- `200 OK` - Successful GET/PUT/DELETE
- `201 Created` - Successful POST creating a resource
- `204 No Content` - Successful operation with no response body
- `400 Bad Request` - Client error (validation, bad input)
- `403 Forbidden` - Authentication/authorization failure
- `404 Not Found` - Resource not found
- `500 Internal Server Error` - Server error

## 5. Implementation Plan

### Phase 1: Update OpenAPI Specification (2-3 hours)

#### 1.1 Define Complete Response Schemas
Update `api/spec/api.yml` with complete, consistent schemas:

```yaml
components:
  schemas:
    ErrorMessageResponse:
      type: object
      required:
        - message
      properties:
        message:
          type: string
          description: Human-readable error message
        code:
          type: string
          description: Machine-readable error code

    GameCreatedResponse:
      type: object
      required:
        - gameId
      properties:
        gameId:
          type: integer
          description: ID of newly created game

    JoinGameResponse:
      type: object
      required:
        - playerId
        - gameId
        - world
      properties:
        playerId:
          type: integer
        gameId:
          type: integer
        world:
          $ref: '#/components/schemas/World'

    SuccessResponse:
      type: object
      required:
        - success
      properties:
        success:
          type: boolean
          example: true
```

#### 1.2 Update All Endpoint Definitions
For each endpoint, ensure:
- All possible responses are defined (200, 201, 400, 403, 404, 500)
- Response schemas are explicitly referenced
- Status codes match REST conventions

Example:
```yaml
/games:
  post:
    responses:
      "201":
        description: Game created successfully
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/GameCreatedResponse'
      "400":
        description: Invalid request
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/ErrorMessageResponse'
      "500":
        description: Server error
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/ErrorMessageResponse'
```

### Phase 2: Refactor Controller Error Handling (3-4 hours)

#### 2.1 Create Standard Error Handler Utility
Create `api/utils/ErrorHandler.ts`:

```typescript
import { ExegesisContext } from "exegesis";

export class ApiError extends Error {
    constructor(
        public statusCode: number,
        public message: string,
        public code?: string
    ) {
        super(message);
        this.name = 'ApiError';
    }
}

export function handleControllerError(context: ExegesisContext, error: any) {
    if (error instanceof ApiError) {
        context.res.status(error.statusCode);
        return {
            message: error.message,
            ...(error.code && { code: error.code })
        };
    }

    // Unknown error - log and return generic 500
    console.error('Unexpected error in controller:', error);
    context.res.status(500);
    return {
        message: 'An unexpected error occurred',
        code: 'INTERNAL_ERROR'
    };
}
```

#### 2.2 Refactor GameController.ts
Update each controller method to:
1. Remove manual error handling
2. Use ApiError for known error cases
3. Return response matching OpenAPI schema exactly
4. Let Exegesis handle HTTP status codes where possible

Example refactor:
```typescript
// BEFORE
module.exports.createGame = async function createGame(context: ExegesisContext) {
  const maxPlayers = context.requestBody?.maxPlayers;
  const result = await GameLifecycleService.createGame(maxPlayers);
  return { id: result.gameId };  // Wrong property name!
};

// AFTER
module.exports.createGame = async function createGame(context: ExegesisContext) {
  try {
    const maxPlayers = context.requestBody?.maxPlayers;
    const result = await GameLifecycleService.createGame(maxPlayers);
    context.res.status(201);  // Created
    return { gameId: result.gameId };  // Matches schema
  } catch (error) {
    return handleControllerError(context, error);
  }
};
```

#### 2.3 Update Service Layer Error Throwing
Update services to throw ApiError instead of generic Error:

```typescript
// In GameLifecycleService.ts
import { ApiError } from '../utils/ErrorHandler';

export async function joinGame(gameId: number, username?: string, sessionId?: string) {
    const game = await store.read<Game>(store.keys.games, gameId);

    if (!game) {
        throw new ApiError(404, `Game ${gameId} not found`, 'GAME_NOT_FOUND');
    }

    if (game.gameState !== GameState.LOBBY) {
        throw new ApiError(400, "Cannot join game: Game already started", 'GAME_STARTED');
    }

    if (game.players.length >= (game.maxPlayers || 4)) {
        throw new ApiError(400, "Cannot join game: Game is full", 'GAME_FULL');
    }

    // ... rest of logic
}
```

### Phase 3: Update All Controllers (2-3 hours)

Apply the same standardization to:

#### 3.1 GameController.ts
- `createGame` - Return 201 with `{ gameId }`
- `joinGame` - Return 200 with full JoinGameResponse
- `listGames` - Return 200 with `{ games: [...] }`
- `postOrders` - Return 200 with confirmation
- `turnResults` - Simplify conditional logic, consistent response
- `kickPlayer` - Return 200 with `{ success: true }`
- `startGame` - Return 200 with `{ success: true }`
- `transferHost` - Return 200 with `{ success: true }`
- `getPlayerGameState` - Return 200 with game state

#### 3.2 UsersController.ts
- `login` - Return 200 with `{ token, username }`
- Add consistent error handling

### Phase 4: Testing (2-3 hours)

#### 4.1 Update Unit Tests
Update existing tests in `api/test/` to expect new response formats:

```typescript
// In GameController.test.ts
describe('POST /games', () => {
    it('should return 201 with gameId', async () => {
        const response = await request(app)
            .post('/games')
            .set('Authorization', `Bearer ${token}`)
            .expect(201);

        expect(response.body).to.have.property('gameId');
        expect(response.body.gameId).to.be.a('number');
    });

    it('should return 400 on invalid input', async () => {
        const response = await request(app)
            .post('/games')
            .send({ maxPlayers: 999 })  // Invalid
            .set('Authorization', `Bearer ${token}`)
            .expect(400);

        expect(response.body).to.have.property('message');
    });
});
```

#### 4.2 API Spec Validation Tests
Add tests to validate responses match OpenAPI spec:

```typescript
import { OpenAPIValidator } from 'express-openapi-validator';

describe('OpenAPI Compliance', () => {
    it('should validate all responses match spec', async () => {
        // Test each endpoint and validate response against spec
    });
});
```

#### 4.3 Integration Tests
Ensure `GameService.test.ts` and `GameLifecycleService.test.ts` work with new error handling.

### Phase 5: Documentation (1 hour)

#### 5.1 Update API Documentation
- Document standard error codes in OpenAPI spec
- Add examples for all response types
- Document HTTP status code usage

#### 5.2 Update CONTRIBUTING.md
Add section on API response standards:
```markdown
## API Response Standards

All API endpoints must:
- Return responses matching OpenAPI schema exactly
- Use standard HTTP status codes (200, 201, 400, 403, 404, 500)
- Return errors in ErrorMessageResponse format
- Include error codes for programmatic handling
```

## 6. Migration Strategy

### Backward Compatibility
This change **may break** existing API clients if they rely on:
- `{ id }` instead of `{ gameId }` from createGame
- Specific error message formats
- HTTP status codes

**Recommended approach**:
1. Version the API (add `/v1/` prefix to routes)
2. Deploy new version alongside old
3. Deprecate old version after migration period

OR (if no external clients):
1. Make changes in one release
2. Update frontend client simultaneously
3. Document breaking changes

### Frontend Updates Required
- Update API client expectations in `client/src/stores/`
- Handle new error response format
- Update to expect correct property names

## 7. Success Metrics

- [ ] All API responses match OpenAPI specification
- [ ] All endpoints use appropriate HTTP status codes
- [ ] Error responses use consistent ErrorMessageResponse format
- [ ] All unit tests pass with new response formats
- [ ] OpenAPI spec validation passes for all endpoints
- [ ] Frontend client works with new API responses
- [ ] No regression in existing functionality

## 8. Timeline Estimate

- **Phase 1 (OpenAPI Spec)**: 2-3 hours
- **Phase 2 (Error Handling)**: 3-4 hours
- **Phase 3 (Controllers)**: 2-3 hours
- **Phase 4 (Testing)**: 2-3 hours
- **Phase 5 (Documentation)**: 1 hour

**Total Estimated Time**: 10-14 hours over 2-3 development sessions

## 9. Dependencies

None - this task is ready to start.

## 10. Risks and Considerations

### Breaking Changes
Major risk: This will break API compatibility. Mitigation:
- Coordinate with frontend team
- Deploy frontend and backend together
- Consider API versioning if external clients exist

### Test Updates
All existing tests will need updates. Mitigation:
- Update tests incrementally alongside controller changes
- Run full test suite frequently

### Complexity
Some endpoints have complex response logic. Mitigation:
- Start with simple endpoints (listGames, kickPlayer)
- Tackle complex ones (turnResults) after pattern established
- Add comprehensive tests for complex cases

## 11. Post-Implementation

After completing this standardization:
1. **Monitor**: Watch for any issues in production
2. **Document**: Update API consumer documentation
3. **Communicate**: Notify of any breaking changes
4. **Future**: Enforce standards via linting/validation

This standardization provides a foundation for:
- Better API documentation
- Easier client development
- More maintainable codebase
- Clear error handling patterns
