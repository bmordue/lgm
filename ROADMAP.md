# Roadmap Checklist

## Core Game Mechanics (Critical)
- [ ] Combat System: Currently stubbed out – needs line-of-sight, weapon ranges, damage calculations (PR https://github.com/bmordue/lgm/pull/97)
- [ ] Fog of War: Infrastructure exists but disabled – implement player-specific world filtering (PR https://github.com/bmordue/lgm/pull/100)
- [ ] Player Management: Fix game joining limits, prevent duplicate joins, add host permissions

## Technical Debt (High Priority)
- [ ] Data Model Fixes: Refactor actors to use IDs instead of objects for better performance
- [ ] Actor Placement: Replace "poor" placement algorithm with intelligent spawn system
- [ ] API Consistency: Standardize response formats to match OpenAPI spec

## User Experience (Medium Priority)
- [x] Interactive Game Board: Replace text-based terrain with clickable hex grid (PR https://github.com/bmordue/lgm/pull/101)
- [ ] Order Submission UI: Add visual movement planning and turn submission
- [ ] Real-time Updates: Fix game list refresh and add live game state updates

## Production Readiness (Medium Priority)
- [ ] Database Integration: Replace in-memory storage to persist game state
- [ ] Authentication Enhancement: Add proper user registration and session management
- [ ] WebSocket Support: Enable real-time game updates instead of polling

## Quality & Testing (Ongoing)
- [ ] Frontend Testing: Add Vue component tests (currently missing)
- [ ] E2E Test Coverage: Enable and expand end-to-end scenarios
- [ ] Error Handling: Standardize error patterns across the codebase
