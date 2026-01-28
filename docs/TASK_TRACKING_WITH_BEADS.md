# Task Tracking with Git Beads

## Overview

This project uses **git beads** (`bd`) for distributed, git-backed task management. Beads provides persistent task memory that travels with the codebase, making it ideal for multi-session development and AI coding agents.

## Why Beads?

- **Git-Native**: Tasks are stored in `.beads/` directory and version-controlled with your code
- **Persistent Memory**: Tasks survive across sessions, branches, and clones
- **Dependency Tracking**: Explicit task dependencies form a DAG (Directed Acyclic Graph)
- **Agent-Friendly**: Works seamlessly with AI coding agents
- **Offline-First**: No external service required; works completely offline

## Quick Start

### Installation (Automatic via Nix)

The beads CLI (`bd`) is automatically installed when you enter the Nix development environment:

```bash
nix-shell
# beads is now available as 'bd'
```

### Basic Commands

```bash
# See available work (unblocked tasks)
bd ready

# List all issues
bd list

# View issue details
bd show <id>

# Create a new task
bd create "Task title" --description "Details" --type task --priority 2

# Update issue status
bd update <id> --status in_progress

# Complete work
bd close <id>

# Add dependencies
bd dep add <issue-id> <depends-on-id>

# Sync with git (exports to JSONL)
bd sync
```

## Issue Types

- `feature` - New functionality
- `bug` - Bug fixes
- `task` - General work items
- `chore` - Maintenance, refactoring, tech debt
- `epic` - Large features composed of multiple issues

## Priority Levels

- `P1` (Priority 1) - Highest priority, critical work
- `P2` (Priority 2) - High priority, important features
- `P3` (Priority 3) - Medium priority, nice to have
- `P4` (Priority 4) - Low priority, future improvements

## Current Task Overview

This repository contains **22 beads** tracking all planned work:

### By Type
- **9 features** - New functionality (player management, database, auth, websockets, etc.)
- **7 tasks** - Combat system implementation, testing, and improvements
- **5 chores** - Technical debt and refactoring
- **1 epic** - (Can be added for large multi-phase features)

### By Priority
- **1 P1 issue** - Player management system (highest priority)
- **14 P2 issues** - Core features and technical improvements
- **6 P3 issues** - Quality improvements and minor features
- **1 P4 issue** - Low priority utility improvements

### Ready to Work On

Run `bd ready` to see tasks with no blockers. Currently **10 issues** are unblocked and ready:

1. **lgm-4w9** (P1): Implement player management system
2. **lgm-ajw** (P2): Refactor data model: Use actor IDs instead of objects
3. **lgm-k92** (P2): Replace actor placement algorithm
4. **lgm-092** (P2): Standardize API response formats
5. **lgm-8dy** (P2): Implement database integration
6. **lgm-22y** (P2): Define weapon types and range characteristics
7. **lgm-ahi** (P2): Define damage calculation factors
8. **lgm-bcp** (P3): Add Vue component tests
9. **lgm-2md** (P3): Expand E2E test coverage
10. **lgm-w5i** (P3): Standardize error handling patterns

## Dependency Chain Examples

### Production Features
```
lgm-8dy (Database integration)
  ├─ lgm-2dg (Authentication enhancement) - depends on database
  └─ lgm-j24 (WebSocket support) - depends on database
      └─ lgm-b96 (Live game state updates) - depends on WebSocket
```

### Combat System
```
lgm-22y (Define weapon types)
  └─ lgm-m0a (Weapon range validation) - depends on weapon definitions

lgm-ahi (Define damage factors)
  └─ lgm-sqo (Damage calculation formulas) - depends on factor definitions

lgm-9u0 (Integrate combat mechanics) - depends on both weapon range and damage
  └─ lgm-vfj (Combat unit actions) - depends on integration
      └─ lgm-7eg (Combat system tests) - depends on complete implementation
```

## Workflow for Developers

### Starting Work

1. **Check available tasks**: `bd ready`
2. **View task details**: `bd show <id>`
3. **Claim the task**: `bd update <id> --status in_progress`
4. **Do the work**: Implement, test, commit
5. **Complete the task**: `bd close <id>`
6. **Sync changes**: `bd sync` (exports to JSONL)
7. **Commit and push**: Include `.beads/issues.jsonl` in your commit

### Creating New Tasks

When you identify new work:

```bash
bd create "Task title" \
  --description "Detailed description" \
  --type task \
  --priority 2 \
  --deps lgm-xyz  # Optional: add dependencies
```

### Ending a Session (Landing the Plane)

See [AGENTS.md](../AGENTS.md) for the complete session completion workflow. Key steps:

1. Create beads for any remaining work
2. Update issue statuses
3. Run `bd sync`
4. Commit and push all changes (including `.beads/issues.jsonl`)

## Task Sources

All beads were created by reviewing:

1. **ROADMAP.md** - High-level development priorities
2. **Feature Proposals** in `docs/`:
   - Database integration
   - Authentication enhancement
   - WebSocket support
3. **Implementation Plans**:
   - Player management
   - Combat system
4. **Code TODOs**: Comments in source files marked with TODO/FIXME

## Benefits for This Project

1. **Continuity**: AI agents and developers can pick up where the last session left off
2. **Clarity**: Clear view of what's blocked vs. what's ready to work on
3. **Tracking**: Full history of task evolution in git
4. **Coordination**: Multiple developers/agents can work without conflicts
5. **Context**: Task descriptions link to detailed documentation

## Learn More

- **Official Documentation**: https://github.com/steveyegge/beads
- **Project-Specific Instructions**: See [AGENTS.md](../AGENTS.md)
- **Issue Tracking**: All issues are in `.beads/issues.jsonl`
- **Configuration**: `.beads/config.yaml`

## Integration with Development Workflow

Beads integrates seamlessly with the existing workflow:

- **Nix Environment**: `bd` is auto-installed via `shell.nix`
- **Git Hooks**: Pre-commit, post-merge hooks installed automatically
- **CI/CD**: Tasks can inform build and test strategies
- **Documentation**: Tasks reference detailed docs (PRD, implementation plans)

---

**Last Updated**: 2026-01-28  
**Total Beads**: 22  
**Ready Tasks**: 10
