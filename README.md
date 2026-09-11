# EquiReign

EquiReign is the production Region Queens game. iOS and Android are the product mainline; Expo Web is the secondary universal target. `NQueensSimulator` remains the solver/generator laboratory and no simulator UI is copied into this app.

## Rules

- Exactly one Queen in every row, column, and region.
- Queens may share a distant diagonal; only adjacent Queens are forbidden.
- Given Queens are puzzle metadata: immutable, excluded from undo/history, and retained by restart.
- Beginner / Intermediate / Advanced use solver feasibility feedback.
- Expert / King hide feasibility feedback and provide three non-revealing logical-cell hints.

## Puzzle-generation invariants

- A generated base puzzle is publishable only when the formal EquiReign solver reports `solutionCount === 1`.
- Variant metadata validity is **not** a uniqueness proof. Frozen, Lost, and Dual-region candidates must each be translated into their effective game constraints and independently re-verified by the solver.
- Difficulty limits are applied **after** exhaustive candidate generation and difficulty analysis; they must not prune the research pool.
- 6×6 exhaustive work must use an EquiReign-specific Queen enumerator. The legacy `scripts/enumerate-puzzle-shard.ts` is not an exhaustive source because it contains the traditional global-diagonal rule and an impractical region-assignment search.
- The complete 6×6 target is: 90 legal Queen layouts → exhaustive legal Region Maps → unique Base pool → independently unique Frozen/Lost/Dual variants → canonicalization/symmetry audit → difficulty classification → Campaign selection.

## Variant development

Phase 3 is tracked on `feature/equireign-phase3-variants`. The current `PuzzleVariants` model contains `frozenCellIndexes`, `lostCellIndexes`, and `dualRegionCells`; `variant-uniqueness.ts` provides the acceptance-gate infrastructure. The effective constraint semantics for all three modes are still being formalized before exhaustive generation is considered complete.

## Research status

Known EquiReign legal-solution totals include 4=2, 5=14, 6=90, 7=646, 8=5,242, 9=47,622, 10=479,306, 11=5,296,790, and 12=63,779,034. Irreducible research and the 4k exceptional-family hypothesis are documented separately; the hypothesis is not a theorem.

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
