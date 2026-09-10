# EquiReign irreducible-solution verification — 2026-09-10

## Definition

A size-N EquiReign placement is **reducible** if deleting one row and the queen's column, then compressing the remaining columns, produces a legal size-(N-1) EquiReign placement.

A placement is **irreducible** if no such deletion is legal.

The search uses EquiReign's actual rule set: one queen per row/column and adjacent rows must have column difference > 1. Global diagonal attacks are not a constraint.

## Structural witness used by the search

For a row r with queen column c, deletion of row r can fail only when the reduced sequence contains an adjacent-column conflict. The search tracks two equivalent obstruction types:

1. **Value-midpoint witness:** the queens in columns c-1 and c+1 occupy adjacent rows. After deleting column c, those two columns become adjacent.
2. **Row-bridge witness:** after deleting row r, rows r-1 and r+1 become adjacent and their compressed columns conflict. Under the original legality constraint, this is equivalent to their original column values differing by exactly one; the apparent difference-two straddling case would already violate adjacency with c.

Every row of an irreducible solution must have at least one of these witnesses.

### Regression validation of the witness criterion

The two witness conditions are encoded separately in `src/game-core/equireign-irreducible-experiment.ts` as research-only helpers. A regression test compares the witness result against direct row+column deletion and compression for every legal EquiReign placement and every possible deleted row for N=6 through N=9.

Observed exhaustive results:

| N | Legal placements | Witness/direct mismatches | Irreducible |
|---:|---:|---:|---:|
| 6 | 90 | 0 | 0 |
| 7 | 646 | 0 | 0 |
| 8 | 5,242 | 0 | 8 |
| 9 | 47,622 | 0 | 0 |

This regression validates the local obstruction model on the full solution spaces through 9×9.

## Search optimizations

The research DFS works directly on the permutation p[row] = column and prunes using witness feasibility rather than generating every legal permutation and checking irreducibility only at the leaves.

Current optimizations are:

- precomputed bitsets of legal next columns;
- unresolved-witness feasibility checks;
- immediate rejection when a required witness has both endpoints already placed without the witness edge;
- immediate rejection when exactly one endpoint remains but the used endpoint is no longer the tail;
- **forced continuation:** when exactly one endpoint is the tail, the other endpoint is forced as the next column;
- optional D4 symmetry reduction for existence searches;
- `--first=N` sharding by first-row column;
- `--no-symmetry` mode for full, non-symmetry-reduced counts.

The forced-continuation optimization is particularly effective because an unresolved midpoint witness with one endpoint at the current tail has exactly one possible next endpoint; there is no need to branch over unrelated candidates.

## Exact structural search results

An independent optimized C++ implementation of the same structural witness DFS was used as a performance/cross-check prototype. The full-count runs below disable symmetry reduction, so every irreducible placement is counted directly.

| N | Full structural result | Runtime on local prototype | Notes |
|---:|---:|---:|---|
| 16 | 384 | ~0.14 s | matches the complete 4×4 exceptional family |
| 19 | 0 | ~2.5 s | exhaustive structural search |
| 20 | 3,840 | ~19.0 s | exhaustive structural search; exactly matches the known family size |

For N=20, the search visited the complete unsymmetrized structural tree and returned exactly 3,840 irreducibles. The known 4×4-block construction independently produces exactly 3,840 members, so there is no remaining count gap at 20×20 under the validated witness characterization.

The earlier symmetry-reduced search is substantially faster and is useful for existence checks. The unsymmetrized result is the stronger count check because it does not depend on orbit accounting.

Historical symmetry-reduced results:

| N | Search result | Notes |
|---:|---:|---|
| 13 | 0 irreducible | exhaustive structural search |
| 14 | 0 irreducible | exhaustive structural search |
| 15 | 0 irreducible | exhaustive structural search |
| 16 | 136 symmetry-reduced representatives | exactly matches the 4×4-block exceptional family under the same symmetry constraints |
| 17 | 0 irreducible | exhaustive structural search |
| 18 | 0 irreducible | exhaustive structural search |

## 19×19 / 20×20 conclusion

The optimized independent structural search now gives:

- **19×19: 0 irreducible placements**;
- **20×20: exactly 3,840 irreducible placements**.

The 20×20 result exactly equals the separately generated 4×4-block family, whose size is `2^5 × 5! = 3,840`.

These are **exhaustive computational results under the structural witness criterion**, not a formal mathematical theorem. The witness criterion itself has been exhaustively cross-checked against direct deletion/compression through 9×9 and follows from the local deletion analysis used by the search.

## 4k exceptional family

Using the 4×4 primitives

- A = [1, 3, 0, 2]
- B = [2, 0, 3, 1]

and assigning one A/B block to each 4-column band, with arbitrary permutation of the bands across row blocks, produces:

- 8×8: 8 irreducible candidates
- 12×12: 48 irreducible candidates
- 16×16: 384 irreducible candidates
- 20×20: 3,840 irreducible candidates

All generated members were checked for legality and for absence of every N→N-1 legal reduction.

The family size is:

`2^k × k!` for N = 4k.

## Current conclusion

The computational evidence now supports the stronger working statement:

> Among the sizes exhaustively structurally searched through 20×20, irreducibles occur only when N is divisible by 4; at N=4k through k=5, the complete observed irreducible family is the 4×4-block construction with size 2^k × k!.

This is still presented as a computational conclusion rather than a formal theorem for all N. In particular, a general proof for every future N has not been established.

No production Game Core architecture was changed by this research.
