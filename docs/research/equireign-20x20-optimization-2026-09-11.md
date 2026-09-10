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

### 5. Forced-chain propagation prototype

A second independent C++ prototype now consumes a forced witness immediately rather than returning to the DFS branching layer for every forced step. After appending the forced value it recomputes only the affected witness state and continues the chain until either no forced value remains or a contradiction is found.

This optimization is currently treated as a research prototype until it is ported to the repository TypeScript implementation and cross-checked against the existing regression suite.

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

The new forced-chain optimization has been validated by a complete 20×20 count in an independent C++ prototype. It has not yet replaced the repository TypeScript search implementation, so the TypeScript implementation remains the repository authority until an equivalent regression run is completed.

The previously established witness characterization was exhaustively cross-checked against direct deletion for N=6..9 with zero mismatches, providing the basis for this search optimization.

## Next optimization targets

1. Port forced-chain propagation into the repository TypeScript research search.
2. Add regression checks for exact counts N=8, 12, 16, and 20.
3. Measure whether incremental pending-witness bookkeeping can remove the repeated `needMask` scan entirely.
4. If correctness remains unchanged, begin deterministic canonical solution/image-library generation from the validated 20×20 family.

## Important qualification

The computational result is strong exhaustive evidence, not a formal mathematical theorem. The current hypothesis is that irreducible placements occur only for `N ≡ 0 (mod 4)` and that for `N=4k` they are exactly the 4×4 A/B block family.

No production Game Core architecture was changed.
