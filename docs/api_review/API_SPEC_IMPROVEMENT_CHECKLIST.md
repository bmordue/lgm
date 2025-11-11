# OpenAPI Specification Improvement Checklist

This checklist contains actionable tasks for improving the OpenAPI specification in `api/spec/api.yml`.

## Critical Fixes (Spec/Implementation Mismatches)

- [ ] Fix `PUT /games/{id}` (Join Game) response
  - [ ] Change response status from `204 No Content` to `200 OK`
  - [ ] Add `JoinGameResponse` schema with properties: `gameId`, `playerId`, `turn`, `world`, `playerCount`, `maxPlayers`
  
- [ ] Fix `POST /games/{gameId}/turns/{turn}/players/{playerId}` (Submit Orders) response
  - [ ] Change from `202 Accepted` to include response body schema
  - [ ] Add `PostOrdersResponse` schema with `turnStatus` object

- [ ] Complete `TurnResultsResponse` schema
  - [ ] Remove placeholder property
  - [ ] Add `success` (boolean, required)
  - [ ] Add `results` (object, optional) for turn result data
  - [ ] Add `message` (string, optional)

- [ ] Fix `TurnOrders_orders` schema mismatch
  - [ ] Rename to `ActorOrders` for clarity
  - [ ] Verify properties match implementation: `actorId`, `toQ`, `toR`
  - [ ] Mark all required fields in schema

- [ ] Remove commented-out duplicate `securitySchemes` (lines 242-245)

## Schema Completeness

- [ ] Add `required` arrays to all schemas
  - [ ] `LoginResponse` - mark `token` as required
  - [ ] `TurnOrders` - mark required fields
  - [ ] `GameCreatedResponse` - verify required fields
  - [ ] All other schemas

- [ ] Add missing schema property descriptions
  - [ ] Describe `toQ` and `toR` in `ActorOrders`
  - [ ] Describe `actorId` in `ActorOrders`
  - [ ] Describe all properties in `TurnOrders`
  - [ ] Describe all properties in `GameSummary`

- [ ] Add enum definitions for known value sets
  - [ ] Define `ActorState` enum (ALIVE, DEAD)
  - [ ] Define `Terrain` enum (EMPTY, BLOCKED, UNEXPLORED)
  - [ ] Define `Direction` enum (UP_LEFT, UP_RIGHT, LEFT, RIGHT, DOWN_LEFT, DOWN_RIGHT, NONE)

## Error Response Documentation

- [ ] Add `401 Unauthorized` responses to authenticated endpoints
  - [ ] `POST /games` (Create Game)
  - [ ] `PUT /games/{id}` (Join Game)
  - [ ] `GET /games/{gameId}/turns/{turn}/players/{playerId}` (Get Turn Results)
  - [ ] `POST /games/{gameId}/turns/{turn}/players/{playerId}` (Submit Orders)

- [ ] Add `404 Not Found` responses where applicable
  - [ ] `PUT /games/{id}` - game not found
  - [ ] `GET /games/{gameId}/turns/{turn}/players/{playerId}` - game/player/turn not found
  - [ ] `POST /games/{gameId}/turns/{turn}/players/{playerId}` - game/player/turn not found

- [ ] Add `409 Conflict` response for duplicate operations
  - [ ] `POST /games/{gameId}/turns/{turn}/players/{playerId}` - orders already submitted

- [ ] Expand `400 Bad Request` error documentation
  - [ ] Add specific error message examples
  - [ ] Document validation failure scenarios

## Endpoint Documentation

- [ ] Add detailed descriptions to all endpoints
  - [ ] `POST /games` - explain game creation process
  - [ ] `GET /games` - explain what games are listed
  - [ ] `PUT /games/{id}` - explain join process, constraints (game full, duplicate usernames)
  - [ ] `POST /users/login` - explain authentication flow
  - [ ] `GET /games/{gameId}/turns/{turn}/players/{playerId}` - explain turn results retrieval
  - [ ] `POST /games/{gameId}/turns/{turn}/players/{playerId}` - explain order submission process

- [ ] Add descriptions to all path parameters
  - [ ] `id` in `/games/{id}` - "Unique identifier of the game to join"
  - [ ] `gameId` - "Unique identifier of the game"
  - [ ] `turn` - "Turn number (1-based)"
  - [ ] `playerId` - "Unique identifier of the player"

- [ ] Add request body descriptions
  - [ ] `POST /users/login` - describe username/password requirements
  - [ ] `POST /games/{gameId}/turns/{turn}/players/{playerId}` - describe order format

## Examples and Documentation

- [ ] Add examples to all major schemas
  - [ ] `JoinGameResponse` example
  - [ ] `TurnOrders` example
  - [ ] `ActorOrders` example
  - [ ] `TurnResultsResponse` example
  - [ ] `LoginResponse` example
  - [ ] `ErrorMessageResponse` examples
  - [ ] `GameSummary` example

- [ ] Add format/pattern constraints
  - [ ] Add `format` to `token` field (if specific format used)
  - [ ] Add minimum values for `id` fields (>= 0)
  - [ ] Add constraints to coordinate fields (`toQ`, `toR`)

## Organization and Metadata

- [ ] Add tags for endpoint grouping
  - [ ] Add "Games" tag for game-related endpoints
  - [ ] Add "Users" tag for user-related endpoints
  - [ ] Add "Turns" tag for turn-related endpoints
  - [ ] Apply tags to all endpoints

- [ ] Update `info` section
  - [ ] Add meaningful description of the API
  - [ ] Add contact information
  - [ ] Add license information (if applicable)
  - [ ] Review version number

- [ ] Update `servers` section
  - [ ] Add server description
  - [ ] Consider adding environment-specific URLs (dev, staging, prod)
  - [ ] Document any variables needed

## Security Documentation

- [ ] Enhance `bearerAuth` security scheme
  - [ ] Add description explaining token purpose
  - [ ] Document token format (if specific)
  - [ ] Document token lifetime/expiration
  - [ ] Document how to obtain tokens

- [ ] Review security requirements consistency
  - [ ] Verify `GET /games` should be unauthenticated
  - [ ] Document rationale for endpoints without security

## Validation and Testing

- [ ] Install and run OpenAPI linter (e.g., spectral)
  - [ ] `npm install -g @stoplight/spectral-cli`
  - [ ] `spectral lint api/spec/api.yml`
  - [ ] Fix all linter errors and warnings

- [ ] Validate spec with OpenAPI validator
  - [ ] Use online validator (https://editor.swagger.io/)
  - [ ] Fix any validation errors

- [ ] Test spec against actual API
  - [ ] Start API server
  - [ ] Make requests and compare responses with spec
  - [ ] Update spec for any mismatches found

- [ ] Generate API documentation
  - [ ] Use tool like Redoc or Swagger UI
  - [ ] Review generated docs for clarity
  - [ ] Ensure examples display correctly

## Future Enhancements (Optional)

- [ ] Consider API versioning strategy
  - [ ] Evaluate URL-based versioning (e.g., `/v1/games`)
  - [ ] Or header-based versioning
  - [ ] Document chosen approach

- [ ] Add rate limiting documentation
  - [ ] Document if rate limits exist
  - [ ] Add rate limit headers to responses

- [ ] Add pagination documentation
  - [ ] Document pagination for `GET /games` if applicable
  - [ ] Add pagination parameters and examples

- [ ] Add webhook/callback documentation
  - [ ] If game events trigger callbacks
  - [ ] Document callback formats

## Review and Approval

- [ ] Peer review of spec changes
- [ ] Verify no breaking changes for existing clients
- [ ] Update any client libraries or SDKs
- [ ] Update API documentation site
- [ ] Communicate changes to API consumers
