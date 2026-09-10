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

## Benchmark result

An independent C++ implementation of the same structural witness model was benchmarked against the previous implementation.

- 19×19: approximately 143.8M nodes → approximately 30.6M nodes.
- 19×19 runtime: approximately 13s → approximately 2.5s.
- 20×20: the previous one-pass search exceeded a 120s practical window; the optimized exhaustive run completed in approximately 19s.

The optimized 20×20 run enumerated exactly **3,840 irreducible placements** in the full (non-symmetry-reduced) count.

The count agrees with the independently constructed 4×4 exceptional family:

`2^5 × 5! = 3,840`.

No irreducible placement outside that family was found.

## Important qualification

The C++ benchmark is an independent research prototype. The repository TypeScript search script has not yet been used as the authoritative 20×20 full-count benchmark. The result should therefore be treated as strong computational evidence until the repository implementation is independently reproduced and regression-tested.

No production Game Core architecture was changed.
