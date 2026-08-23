# EquiReign

EquiReign is the production Region Queens game. iOS and Android are the product mainline; Expo Web is the secondary universal target. `NQueensSimulator` remains the solver/generator laboratory and no simulator UI is copied into this app.

## Rules

- Exactly one Queen in every row, column, and region.
- Queens may share a distant diagonal; only adjacent Queens are forbidden.
- Given Queens are puzzle metadata: immutable, excluded from undo/history, and retained by restart.
- Beginner / Intermediate / Advanced use solver feasibility feedback.
- Expert / King hide feasibility feedback and provide three non-revealing logical-cell hints.

## Architecture

- `src/game-core`: platform-independent Puzzle, Solver, Rule, Difficulty, GameSession and Result domain.
- `src/puzzles`: unique, generator-verified Region Puzzle catalog.
- `src/features`: React Native presentation.
- `app`: Expo Router shell and screens.
- `tests`: unit and coverage gates.
- `e2e`: Playwright Chromium/WebKit product flows.

Dependencies point inward: `UI → Session → Domain → Puzzle/Solver`. Solver code has no React, account, shop, audio or cosmetic dependency.

## Run

```bash
npm ci
npm test
npm run test:coverage
npm run typecheck
npm run lint
npm run web
```

## Implemented product slice

- five DifficultyPolicy definitions;
- Region-aware unique puzzles and bitmask `countSolutions(limit)`;
- Empty → X → Queen → Empty, long-press X shortcut, Undo and Restart;
- direct Rule Conflict separated from solver-based Solution Feasibility;
- current-board logical hints whose Queen/X answer never reaches UI;
- hint highlight lifecycle and no-charge failure behavior;
- full-board completion, timer, result data and completion screen;
- outer Settings, Operation Tip and Rule Tip routes;
- reproducible CI quality gates and browser E2E flows.

Economy, account backend, leaderboard, daily backend, multiplayer and large cosmetic systems intentionally remain outside this first product slice.
