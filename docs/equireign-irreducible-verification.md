# EquiReign Irreducible Solution Verification

## Definition

A solution is **irreducible** if deleting any one row together with its Queen column, then compressing the remaining columns, does not produce a legal `(N-1) x (N-1)` EquiReign solution.

Legality uses the formal EquiReign rule: one Queen per row/column and adjacent rows must have column distance greater than 1. Full diagonal attacks are **not** prohibited.

## Verified results

Independent optimized search was used to search specifically for irreducible solutions, rather than enumerating every solution and checking reduction at the end.

| N | Irreducible solutions | Result |
|---:|---:|---|
| 8 | 8 | exact |
| 9 | 0 | exact |
| 10 | 0 | exact |
| 11 | 0 | exact |
| 12 | 48 | exact |
| 13 | 0 | exact |
| 14 | 0 | exact |
| 15 | 0 | exact |
| 16 | 384 | exact |
| 17 | 0 | exact |
| 18 | 0 | exact |
| 19 | 0 | exact |

For N=19, the search was split by the first-row column across the 10 horizontal-reflection representatives; all 10 branches completed with zero irreducible solutions.

## 4k exceptional family

For `N = 4k`, the following primitive blocks were verified:

```text
A = [1, 3, 0, 2]
B = [2, 0, 3, 1]
```

Construct `k` row blocks. Each block occupies one disjoint 4-column band. The bands may be permuted arbitrarily, and each block independently chooses A or B.

The family size is:

`2^k * k!`

Verified family sizes and irreducibility:

| N | k | Family size | All legal | All irreducible |
|---:|---:|---:|:---:|:---:|
| 8 | 2 | 8 | yes | yes |
| 12 | 3 | 48 | yes | yes |
| 16 | 4 | 384 | yes | yes |
| 20 | 5 | 3840 | yes | yes |

The 20x20 result currently proves the existence of at least 3,840 irreducible solutions. It does **not** yet prove that 3,840 is the complete irreducible set for N=20.

## Current hypothesis

Evidence now supports the stronger pattern:

- irreducible solutions exist at N divisible by 4;
- no irreducible solutions were found for 9, 10, 11, 13, 14, 15, 17, 18, 19;
- for N=8 and N=12, the 4k family accounts for every irreducible solution;
- for N=16, the specialized irreducible search found exactly 384, matching the family size;
- N=20 still needs an exhaustive irreducible search or structural proof to establish whether the family is complete.

This document is research evidence only. It does not change the formal game-core architecture.