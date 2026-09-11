# EquiReign Difficulty Ranking — 2026-09-11

## Purpose

Define a reproducible difficulty ranking for generated Region Puzzles before assigning player-facing labels. Difficulty must describe the amount and depth of deduction required from the puzzle, not merely board size.

The current runtime labels remain `beginner`, `intermediate`, `advanced`, `expert`, and `king`. This document defines the research rubric used to rank candidates before publishing them into those buckets.

## Ranking principles

1. **Uniqueness is mandatory first.** A candidate must pass the existing validation gate: exactly one solution, connected regions, valid solution, and singleton-region limit.
2. **Board size is a modifier, not the primary difficulty signal.** A well-constrained 16×16 puzzle can be easier than a poorly constrained 10×10 puzzle.
3. **Measure the actual solving search.** Solver metrics are retained for every validated candidate and include nodes visited, branches tried, backtracks, and memo hits.
4. **Prefer human-relevant signals where available.** Region constraints, forced placements, candidate elimination, and required guess depth should eventually supplement raw DFS cost.
5. **Do not classify from one metric.** A single large DFS count can be caused by implementation details rather than player difficulty.

## Stage 1 — objective candidate score

Until a deterministic human-style solver is available, calculate a normalized research score from the validated candidate metrics.

### Base signals

- `N = size`
- `nodes = solverMetrics.nodesVisited`
- `branches = solverMetrics.branchesTried`
- `backtracks = solverMetrics.backtracks`
- `memoHits = solverMetrics.memoHits`
- `singleton = singletonRegionCount`

Use logarithmic scaling for DFS quantities so very large searches do not dominate the score:

```text
searchLoad = log2(1 + nodes)
branchLoad = log2(1 + branches)
backtrackLoad = log2(1 + backtracks)
```

Normalize each metric against the candidate distribution **within the same board size**. This prevents 16×16 puzzles from automatically becoming harder than every 12×12 puzzle.

The initial composite research score is:

```text
score =
  0.45 * percentile(searchLoad) +
  0.25 * percentile(backtrackLoad) +
  0.20 * percentile(branchLoad) +
  0.10 * percentile(singleton)
```

`memoHits` is retained as diagnostic data but is not directly scored because it primarily measures solver reuse rather than puzzle difficulty.

## Stage 2 — human-solving correction

When a deterministic deduction simulator is available, add these signals:

- `forcedMoveCount`: number of moves that can be made without guessing.
- `forcedChainDepth`: longest consecutive forced deduction chain.
- `minimumGuessDepth`: minimum search depth required if deterministic deductions are exhausted.
- `candidatePressure`: average number of legal positions remaining before each forced move.
- `regionTightness`: how strongly region membership reduces candidates.

The target composite should then shift toward human-solving evidence:

```text
humanScore =
  0.30 * guessDepthPercentile +
  0.25 * candidatePressurePercentile +
  0.20 * inverse(forcedChainPercentile) +
  0.15 * searchLoadPercentile +
  0.10 * backtrackLoadPercentile
```

This is intentionally a later-stage formula. Do not use it until the corresponding measurements are implemented and regression-tested.

## Player-facing buckets

Use five labels, with boundaries determined from the published candidate distribution rather than fixed node counts:

| Label | Intended experience | Initial target band |
|---|---|---:|
| 初級 / `beginner` | Strongly constrained; routine deductions | 0–20th percentile |
| 中級 / `intermediate` | Mostly direct deductions; modest search | 20–45th |
| 高級 / `advanced` | Several interacting constraints | 45–70th |
| 進階 / `expert` | Long deduction chains or substantial branching | 70–90th |
| 王者 / `king` | Top-end reasoning/search pressure | 90–100th |

Percentile bands are per size for initial balancing. A second global calibration pass may then select a cross-size mixture for Campaign pacing.

## Given queens

Given queens are treated as a separate accessibility/easing layer, not as a substitute for puzzle difficulty.

For a candidate solution, a given queen is allowed only if it is part of the stored unique solution. Before publishing a given-queen variant, re-run uniqueness validation with that queen fixed.

Initial runtime policy remains:

- beginner: up to 2 given queens
- intermediate: up to 1 given queen
- advanced: 0 given queens
- expert: 0 given queens
- king: 0 given queens

The number of givens should be adjusted downward if a puzzle becomes too trivial after empirical playtesting.

## Campaign policy

Campaign currently targets 6×6 through 16×16. Difficulty should control the local progression inside each size rather than forcing a monotonic size-to-difficulty mapping.

Recommended progression:

- Early levels: mostly beginner/intermediate at 6×6–8×8.
- Mid campaign: intermediate/advanced across 8×8–12×12.
- Late campaign: advanced/expert across 12×12–16×16.
- King: sparse showcase levels selected from the top-ranked validated candidates, not every largest board.

17×17–20×20 are not Campaign levels yet.

## Next implementation step

Build a deterministic `rank-puzzle-candidates` research script that consumes validated candidate JSONL, computes the Stage 1 score, reports per-size distributions, and emits stable rank/percentile metadata. Then use that ranking to select the first 13×13–16×16 Campaign pool.

Do not alter the production solver rules for this ranking work.
