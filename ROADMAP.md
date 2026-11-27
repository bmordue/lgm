# Roadmap

`ROADMAP.md` is the single backlog for LGM. For the current architecture and
known technical debt, see [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Shipped

- [x] Combat system: weapons, range validation, line of sight, damage
- [x] Per-player fog of war / visibility filtering
- [x] Player management: per-game player cap, duplicate-join prevention, host,
      kick, transfer host, start game
- [x] Player-specific game state endpoint
- [x] Interactive hex-grid board, actor tokens, and order submission UI
- [x] Turn submission and result flow
- [x] Real-time game-list and game-state updates over Socket.IO
- [x] PostgreSQL persistence with in-memory fallback
- [x] Reverse-proxy authentication with development stub identity
- [x] Health, metrics, rate limiting, security headers, request validation
- [x] Fair, deterministic actor placement using spawn zones and minimum distance
- [x] API and client unit test suites, including combat and Vue component tests
- [x] Documentation consolidation; this file is the only backlog

## Next

1. **Remove dead persistence and legacy code.** Delete the unused Prisma path
   (or adopt it fully), `PlayerService`, pass-through `GameService`/`Store`
   aliases, `.disabled` files, and dead helpers (`inBox`, `extractActorId`).
2. **Standardize API responses and errors.** Remove the deprecated `gameId` alias
   from game creation, align success/error shapes and status codes with the
   OpenAPI contract, and make controllers/services use the typed errors in
   `api/utils/Errors.ts` consistently. Update the client and tests with the
   contract.
3. **Improve actor visibility information.** Resolve the redaction TODO in
   `api/service/Visibility.ts`: visible enemy actors currently expose full stats.
   Decide whether to redact weapon/health details unless fully identified, and
   whether to track explored/last-seen state.
4. **Expand E2E and PostgreSQL coverage.** Make the database-backed path a
   first-class test target and add combat, turn-advance, host/kick, and
   multi-player flows to the E2E suite.
5. **Improve persistence operations.** Add connection pooling, fail fast on
   startup migration/connection errors, and shut down gracefully.
6. **Improve turn-engine testability.** Inject randomness and reduce in-place
   mutation in rule application.

## Later

- Cache visibility and pathfinding results where profiling shows a need.
- Add observability beyond the baseline in-memory metrics (structured traces,
  durable metrics).
- Decide whether to keep the unused `Draw` manual-test helper: give it real tests
  or delete it.
- Evaluate a plugin/module boundary for game rules and game modes.
- Publish a client SDK if external integrations become a goal.
