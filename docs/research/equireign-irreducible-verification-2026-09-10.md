# EquiReign irreducible-solution verification — 2026-09-10

## Definition

A size-N EquiReign placement is **reducible** if deleting one row and the queen's column, then compressing the remaining columns, produces a legal size-(N-1) EquiReign placement.

A placement is **irreducible** if no such deletion is legal.

The search uses EquiReign's actual rule set: one queen per row/column and adjacent rows must have column difference > 1. Global diagonal attacks are not a constraint.

## Structural witness used by the search

For a row r with queen column c, deletion of row r can fail only when the reduced sequence contains an adjacent-column conflict. The search tracks two equivalent obstruction types:

1. **Value-midpoint witness:** the queens in columns c-1 and c+1 occupy adjacent rows. After deleting column c, those two columns become adjacent.
2. **Row-bridge witness:** after deleting row r, rows r-1 and r+1 become adjacent and their compressed columns conflict. This occurs when their original columns differ by 1, or differ by 2 with c between them.

Every row of an irreducible solution must have at least one of these witnesses.

### Regression validation of the witness criterion

The two witness conditions are now encoded separately in `src/game-core/equireign-irreducible-experiment.ts` as research-only helpers. A regression test compares the witness result against direct row+column deletion and compression for every legal EquiReign placement and every possible deleted row for N=6 through N=9.

Observed exhaustive results:

| N | Legal placements | Witness/direct mismatches | Irreducible |
|---:|---:|---:|---:|
| 6 | 90 | 0 | 0 |
| 7 | 646 | 0 | 0 |
| 8 | 5,242 | 0 | 8 |
| 9 | 47,622 | 0 | 0 |

This regression validates the local obstruction model on the full solution spaces through 9×9. It strengthens confidence in the structural search implementation, but it is not by itself a proof of the 19×19 or 20×20 result.

## Exact structural search results

The optimized independent search was run with D4 symmetry-breaking constraints. The symmetry constraints do not change whether an irreducible solution exists; they only avoid equivalent search branches.

| N | Search result | Notes |
|---:|---:|---|
| 13 | 0 irreducible | exhaustive structural search |
| 14 | 0 irreducible | exhaustive structural search |
| 15 | 0 irreducible | exhaustive structural search |
| 16 | 136 symmetry-reduced representatives | exactly matches the 4×4-block exceptional family under the same symmetry constraints |
| 17 | 0 irreducible | exhaustive structural search |
| 18 | 0 irreducible | exhaustive structural search |

For N=16, the known exceptional family contains 384 placements. Under the search's two symmetry-breaking constraints it contains exactly 136 representatives, matching the complete search result. This is strong evidence that the known 4×4-block family accounts for all N=16 irreducibles.

## 19×19 / 20×20 status

A full structural search for N=19 was started but exceeds the current practical search window because the candidate tree grows rapidly. No irreducible placement was found during the bounded run.

A deterministic random legal-placement check of 200,000 placements found no irreducible placement for N=19.

The same 200,000-placement deterministic random check found no irreducible placement for N=20 outside the separately constructed exceptional family; the known 3,840-member family was independently verified exhaustively.

These random checks are evidence only, not proof of absence.

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

The evidence now supports the working hypothesis:

> Irreducible EquiReign placements occur only at N divisible by 4, and for N=4k the complete irreducible family is the 4×4-block construction with size 2^k × k!.

This remains a **working hypothesis**, not a formal theorem. In particular, complete absence of additional irreducibles at N=19 and N=20 has not yet been proven.

No production Game Core architecture was changed by this research.
