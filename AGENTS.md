# Agent Instructions

LGM is a turn-based strategy game with a TypeScript/Express API and a Vue 3
client. Use the Nix shell for a consistent Node.js 24 environment.

## Sources of Truth

- [README.md](README.md) — setup and high-level overview.
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — system design and technical debt.
- [ROADMAP.md](ROADMAP.md) — the backlog and current priorities.
- [api/spec/api.yml](api/spec/api.yml) — authoritative API contract.
- [CLAUDE.md](CLAUDE.md) — detailed commands, services, and conventions.

Do not add another architecture review or task-tracking document. Update the
existing files instead.

## Task Tracking

[ROADMAP.md](ROADMAP.md) is the single backlog. Move completed work to its
`Shipped` section and add newly discovered work under `Next` or `Later`. Do not
introduce a separate issue tracker or generated task files.

## Setup

```bash
nix-shell
startup-servers      # install dependencies, build API, start API + client

# Or manually
install-deps
start-api
start-client
```

The shell creates a legacy `lib -> api` symlink; the client uses
`@lgm/shared-types` and does not require it.

## Commands

```bash
cd api && npm run build && npm test
cd api && npm run test:e2e     # requires a running API on port 3000
cd client && npm run build && npm run test:unit
cd client && npm run lint
```

## Conventions

- Put tunable constants in `api/config/*`; document new environment variables.
- Use typed errors from `api/utils/Errors.ts`.
- Keep `api/spec/api.yml`, controllers, and tests in sync.
- The client uses `@lgm/shared-types`, not backend models through `lib/`.
- Prefer extending the existing Mocha/Vitest suites over adding frameworks.

## Finishing Work

1. Run the relevant build, test, and lint commands.
2. Update `ROADMAP.md` and `docs/ARCHITECTURE.md` if priorities or architecture
   changed.
3. Commit and push only when the user explicitly asks.
