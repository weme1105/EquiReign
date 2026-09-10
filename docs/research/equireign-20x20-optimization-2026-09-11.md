# EquiReign 20×20 structural-search optimization — 2026-09-11

## Goal

Reduce the search cost of the irreducible-placement proof search without changing production Game Core.

## Optimization layers

### 1. Local legal-neighbor bitsets

For each column/value `c`, precompute the values that may follow it under EquiReign's row-adjacency rule:

`|a-b| > 1`.

This removes repeated absolute-difference checks from the inner search loop and turns candidate generation into a bitset operation.

### 2. Forced witness continuation

An unresolved midpoint witness for center `c` requires the consecutive path edge `(c-1,c+1)`.

If exactly one of those endpoints is already used, feasibility requires that endpoint to be the current tail. When it is the tail, the other endpoint is the only possible next value, so the search can force that continuation instead of branching over all legal candidates.

This is stronger than merely rejecting impossible states after candidate generation.

### 3. Incremental witness bookkeeping

The search records midpoint witnesses when a path edge has value difference exactly two. Row-bridge witnesses are decided as soon as the previous row's two neighbors become known. Resolved witness bits are removed from the pending set immediately.

### 4. Symmetry reduction

Column reflection, row reversal, and transpose-related symmetry are used only where the condition is proved to preserve legality and irreducibility. Exact-count runs are kept separate from zero-existence symmetry proofs where canonicalization could otherwise alter multiplicities.

### 5. Forced-chain propagation

The repository TypeScript structural search now contains the forced-chain propagation used by the independent C++ benchmark. After appending a forced value it continues resolving newly forced witnesses until no force remains or a contradiction is found. This remains research-only and is not part of production puzzle generation.

## Benchmark result

An independent C++ implementation of the same structural witness model was benchmarked against the previous implementation.

### Previous optimized baseline

- 19×19: approximately 143.8M nodes → approximately 30.6M nodes.
- 19×19 runtime: approximately 13s → approximately 2.5s.
- 20×20: approximately 101.1M nodes and approximately 19.0s.

### Forced-chain prototype

A fresh full, non-symmetry-reduced 20×20 run produced:

- **54,990,336 DFS states**
- **3,840 irreducible placements**
- **approximately 14.9s** on the same local environment

This is approximately a **45.6% reduction in visited states** and a **21.8% runtime reduction** versus the previous 20×20 prototype benchmark.

The exact count remains **3,840**, matching the independently constructed 4×4 exceptional family:

`2^5 × 5! = 3,840`.

No irreducible placement outside that family was found.

## Validation status

The forced-chain optimization is now represented in the repository TypeScript research search. Existing exact regression results remain the reference points: N=8 → 8, N=12 → 48, N=16 → 384. The independent C++ run establishes N=20 → 3,840. A repository-local full TypeScript 20×20 regression should still be run before treating the TypeScript implementation as the authoritative exact 20×20 counter.

The previously established witness characterization was exhaustively cross-checked against direct deletion for N=6..9 with zero mismatches, providing the basis for this search optimization.

## Runtime / puzzle-size decision — 2026-09-11

The previous 12×12 ceiling was primarily a storage/image-library explosion concern. That concern is no longer a reason to cap the domain at 12: the observed 20×20 irreducible image family is only **3,840** placements, and a local prototype successfully generated all 3,840 SVG solution images.

Decision for the project:

- **Runtime/domain BoardSize expands through 20×20.**
- **Puzzle generator input is accepted through 20×20.**
- **Campaign/actual progression is capped at 16×16 for now.**
- **The currently bundled local challenge pool remains 6×6–12×12 until larger validated puzzle pools are published.**
- **17×17–20×20 remain available as research/runtime targets, not automatically exposed as playable challenge data.**

This keeps the architecture aligned with the new size decision without pretending that a 20×20 solution image is already a playable Region puzzle.

## Next optimization / data targets

1. Replace repeated pending-witness scans with incremental pending bookkeeping if it materially improves the TypeScript search.
2. Add/maintain exact regressions for N=8, 12, 16, and the C++-verified N=20 target.
3. Finish deterministic 20×20 solution/image catalogue generation in-repo; the generator script is already present.
4. Build and validate 13×13–16×16 campaign puzzle pools before exposing those sizes in bundled/offline campaign data.
5. Build 17×17–20×20 validated challenge/research pools separately; do not make them campaign levels yet.

## Important qualification

The computational result is strong exhaustive evidence, not a formal mathematical theorem. The current hypothesis is that irreducible placements occur only for `N ≡ 0 (mod 4)` and that for `N=4k` they are exactly the 4×4 A/B block family.

No production solver rule was changed; the size expansion is an interface/data-pool expansion, while the structural irreducibility work remains research-only.
