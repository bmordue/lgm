# OpenAPI Specification Review

This document contains a comprehensive review of the OpenAPI specification in `api/spec/api.yml` with identified areas for improvement.

## Critical Issues

### 1. Incorrect Response Status Code for `PUT /games/{id}` (Join Game)
- **Current**: Returns `204 No Content`
- **Actual Implementation**: Returns `200 OK` with JSON body containing game state
- **Impact**: The spec doesn't document the actual response structure that clients receive
- **Fix Required**: Change status code to `200` and add proper response schema

### 2. Missing Response Schema for Join Game Endpoint
- **Current**: No content defined for successful join response
- **Actual Implementation**: Returns detailed game state including:
  - `gameId` (number)
  - `playerId` (number)
  - `turn` (number)
  - `world` (object with actors and terrain)
  - `playerCount` (number)
  - `maxPlayers` (number)
- **Impact**: API consumers have no documentation of what data they'll receive
- **Fix Required**: Add `JoinGameResponse` schema definition

### 3. Missing `POST /games/{gameId}/turns/{turn}/players/{playerId}` Response Schema
- **Current**: Returns only `202 Accepted` with no body documentation
- **Actual Implementation**: Returns JSON with turn status information
- **Impact**: Clients don't know what to expect in successful responses
- **Fix Required**: Add proper response schema for successful order submission

### 4. Incomplete `TurnResultsResponse` Schema
- **Current**: Only has a placeholder property
- **Actual Implementation**: Returns complex turn results with:
  - `success` (boolean)
  - `results` (turn result data with updated actors)
  - `message` (string, optional)
- **Impact**: Response structure is completely undocumented
- **Fix Required**: Replace placeholder with actual response structure

### 5. Commented-Out Security Scheme Definition
- **Current**: Lines 242-245 have commented `securitySchemes` section
- **Issue**: Duplicate definition location (also at lines 7-11)
- **Impact**: Confusing and potentially error-prone
- **Fix Required**: Remove commented-out duplicate

### 6. Missing Error Response Definitions
- **Current**: Limited error documentation
- **Missing**: Error responses for:
  - `401 Unauthorized` for endpoints requiring authentication
  - `404 Not Found` for non-existent games/players
  - Specific error messages for validation failures
- **Impact**: API consumers don't know what errors to expect
- **Fix Required**: Add comprehensive error response documentation

### 7. Inconsistent Schema Naming for Order Items
- **Current**: Uses `TurnOrders_orders` which appears auto-generated
- **Issue**: Not following OpenAPI naming conventions
- **Impact**: Reduces readability and maintainability
- **Fix Required**: Rename to `ActorOrders` or similar descriptive name

## Documentation Improvements

### 8. Missing Endpoint Descriptions
- **Issue**: Endpoints lack detailed descriptions beyond summary
- **Missing**: 
  - What each endpoint does in detail
  - Business logic constraints (e.g., can only join non-full games)
  - State changes that occur
  - Prerequisites for calling endpoints
- **Fix Required**: Add comprehensive descriptions to all endpoints

### 9. Missing Parameter Descriptions
- **Issue**: Path parameters lack descriptions
- **Examples**: `gameId`, `playerId`, `turn` have no descriptions
- **Impact**: API consumers don't understand what these represent
- **Fix Required**: Add descriptions for all parameters

### 10. Missing Request/Response Examples
- **Current**: Only `GameCreatedResponse` has an example
- **Issue**: Most schemas lack examples
- **Impact**: Harder for developers to understand expected formats
- **Fix Required**: Add examples for all major request/response schemas

### 11. Missing Schema Property Descriptions
- **Issue**: Schema properties lack descriptions
- **Examples**: `ordersList`, `actorId`, `toQ`, `toR` properties need explanation
- **Impact**: Unclear what each field represents (especially `toQ` and `toR`)
- **Fix Required**: Document what each property means

### 12. Incomplete Server Configuration
- **Current**: Single server with URL `/`
- **Issue**: No description or environment-specific URLs
- **Missing**: Development, staging, production server configurations
- **Fix Required**: Add proper server definitions with descriptions

## Schema Design Issues

### 13. Missing Required Fields Validation
- **Issue**: `LoginResponse` doesn't mark `token` as required
- **Issue**: `TurnOrders` doesn't mark properties as required
- **Impact**: Unclear which fields are mandatory
- **Fix Required**: Add `required` arrays to all schemas

### 14. Mismatch Between Spec and Implementation for Orders
- **Current Spec**: Orders use `toQ` and `toR` (axial coordinates)
- **Actual Implementation**: Uses `actorId` and `ordersList` (array of directions)
- **Impact**: Major disconnect between documented and actual API
- **Fix Required**: Update schema to match actual implementation

### 15. Missing Data Type Constraints
- **Issue**: No minimum/maximum values, patterns, or formats defined
- **Examples**:
  - No format for `token` (should be `string` with pattern or format)
  - No min/max for `id` fields
  - No constraints on array lengths
- **Impact**: No validation guidance for API consumers
- **Fix Required**: Add appropriate constraints (minimum, maximum, pattern, format)

### 16. Missing Enum Definitions
- **Issue**: No enumerations defined for known value sets
- **Examples**: 
  - Actor states (ALIVE, DEAD)
  - Terrain types (EMPTY, BLOCKED, UNEXPLORED)
  - Directions (UP_LEFT, UP_RIGHT, LEFT, RIGHT, DOWN_LEFT, DOWN_RIGHT, NONE)
- **Impact**: API consumers don't know valid values
- **Fix Required**: Define enums for these types

## Security Issues

### 17. Missing Security Requirements Documentation
- **Issue**: No documentation of what `bearerAuth` tokens represent
- **Missing**: Token format, expiration, refresh mechanism
- **Impact**: Developers don't understand authentication flow
- **Fix Required**: Add security scheme description

### 18. Inconsistent Security Application
- **Current**: `GET /games` (listGames) doesn't require authentication
- **Issue**: Unclear if this is intentional or oversight
- **Impact**: Potential security concern if games should be protected
- **Fix Required**: Review and document security requirements for each endpoint

## Maintainability Issues

### 19. Missing API Version Strategy
- **Current**: Version is `0.0.1` in info section
- **Issue**: No versioning strategy in URL or headers
- **Impact**: Breaking changes could affect existing clients
- **Fix Required**: Consider URL versioning (e.g., `/v1/games`) or header-based versioning

### 20. No Contact or License Information
- **Issue**: Missing from `info` section
- **Impact**: Users don't know who to contact for support
- **Fix Required**: Add contact and license information

### 21. Missing Tags for Endpoint Organization
- **Issue**: No tags defined for grouping related endpoints
- **Impact**: Poor organization in generated documentation
- **Fix Required**: Add tags like "Games", "Users", "Turns"

## OpenAPI Best Practices Not Followed

### 22. No `operationId` Consistency
- **Current**: Operation IDs match controller method names
- **Issue**: Not following REST naming conventions (e.g., could be `games.create`, `games.join`)
- **Impact**: Generated client code may have inconsistent naming
- **Recommendation**: Consider standardized naming scheme

### 23. Missing Content-Type Specification Consistency
- **Issue**: Not all request bodies specify `content-type`
- **Impact**: Unclear what formats are accepted
- **Fix Required**: Ensure all request/response bodies specify accepted content types

### 24. No Rate Limiting Documentation
- **Issue**: No rate limit headers or descriptions
- **Impact**: Clients don't know if rate limiting exists
- **Recommendation**: Document if rate limiting is implemented

## Action Items Summary

**High Priority (Breaks API Contract):**
- [ ] Fix `PUT /games/{id}` response (status code and schema)
- [ ] Add `JoinGameResponse` schema definition
- [ ] Fix `TurnOrders_orders` schema to match implementation
- [ ] Complete `TurnResultsResponse` schema
- [ ] Add response schema for `POST /games/.../turns/.../players/...`

**Medium Priority (Documentation):**
- [ ] Add descriptions to all endpoints
- [ ] Add descriptions to all parameters
- [ ] Add examples to all schemas
- [ ] Add property descriptions to schemas
- [ ] Add required field markers to schemas
- [ ] Remove commented-out code

**Low Priority (Enhancements):**
- [ ] Add comprehensive error responses
- [ ] Add enum definitions
- [ ] Add data type constraints
- [ ] Add tags for organization
- [ ] Add server descriptions
- [ ] Add contact/license info
- [ ] Review security requirements consistency
- [ ] Consider API versioning strategy
- [ ] Add rate limiting documentation (if applicable)

## Recommended Review Process

1. **Validate Current Spec**: Use OpenAPI validation tools (spectral, swagger-cli)
2. **Compare with Implementation**: Run the API and compare actual responses
3. **Update Schemas**: Fix all critical mismatches between spec and implementation
4. **Add Documentation**: Complete all missing descriptions and examples
5. **Test Generated Clients**: Generate client libraries and test usability
6. **Review Security**: Ensure authentication/authorization is properly documented
7. **Publish Changes**: Update the spec and regenerate any dependent artifacts
