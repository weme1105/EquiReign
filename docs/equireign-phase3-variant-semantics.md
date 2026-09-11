# EquiReign Phase 3 — Variant Semantics and Uniqueness Contract

## Status

Phase 3 is under active implementation on `feature/equireign-phase3-variants`.

The formal data model already exposes:

```ts
PuzzleVariants {
  frozenCellIndexes
  lostCellIndexes
  dualRegionCells
}
```

and metadata validation checks indexes, overlaps, region ranges, and Dual-region membership. Those checks are necessary but are **not** a uniqueness proof.

## Non-negotiable invariant

Every published candidate must be verified against the effective rules that a player actually plays:

```text
Base candidate
→ effective board/constraints
→ formal EquiReign solver
→ solutionCount === 1
```

For a special variant:

```text
Base unique
→ variant semantics
→ effective solver constraints
→ solutionCount === 1
```

`solutionCount === 0` and `solutionCount > 1` both reject the candidate.

## Variant contracts

### Frozen

Frozen is a gameplay/presentation mechanism, not merely an excluded cell. The existing implementation tracks frozen and revealed indexes and can reveal frozen cells through crown-triggered chains. Therefore exhaustive uniqueness verification must define the exact information/constraint state represented by a Frozen candidate before translating it to a `BoardSnapshot`.

Do not equate `frozenCellIndexes` with `excluded` cells unless the actual game semantics prove that equivalence for the verification state.

### Lost

The current branch must first locate and document the formal Lost implementation. Before generating candidates, establish whether a Lost cell is equivalent to an unavailable/excluded cell, whether it can contain the solution Queen, and how the runtime completion/solver path treats it.

Until this mapping is explicit, Lost metadata must not be used as an exhaustive uniqueness constraint.

### Dual-region

A Dual-region cell carries two candidate region IDs. Metadata validation requires two distinct valid regions and requires the base region to be one of those candidates. Exhaustive verification must go further: the candidate must be translated into the exact region constraint used during solving.

A metadata-valid Dual cell is not automatically a valid unique puzzle.

## Separation of concerns

Keep these layers distinct:

1. **Metadata validation** — indexes, overlaps, ranges, structural validity.
2. **Semantic translation** — convert the variant layer into effective solver constraints.
3. **Uniqueness verification** — run the formal solver with `requestedLimit = 2` (or equivalent) and require exactly one solution.
4. **Canonicalization** — deduplicate equivalent puzzle/variant states only after semantic validity is established.
5. **Difficulty** — score the verified pool only after exhaustive enumeration and uniqueness filtering.
6. **Campaign limits** — apply player-facing difficulty and mode-familiarity policies last.

## 6×6 exhaustive pipeline

The target audit trail is:

```text
90 legal 6×6 Queen layouts
→ all legal Region Maps
→ Base solutionCount === 1
→ Frozen semantic candidates → solutionCount === 1
→ Lost semantic candidates → solutionCount === 1
→ Dual semantic candidates → solutionCount === 1
→ raw counts
→ canonical/symmetry-reduced counts
→ difficulty distribution
→ Campaign selection
```

The legacy `scripts/enumerate-puzzle-shard.ts` is explicitly excluded from this pipeline because its historical search uses the traditional global diagonal rule and does not provide a trustworthy exhaustive Region Map enumeration.

## Audit requirements

The eventual exhaustive engine must be resumable. Checkpoints should include at least:

- board size;
- Queen-layout index/hash;
- Region Map enumeration state;
- variant enumeration state;
- accepted/rejected counters by layer;
- canonicalization counters;
- deterministic checkpoint hash.

A checkpoint represents progress only. It must not be used to claim completeness unless the search space has been fully exhausted and independently audited.

## Current implementation note

`src/game-core/variant-uniqueness.ts` currently provides the acceptance infrastructure for uniqueness verification and construction of verification boards. It does not, by itself, implement the semantic translation for Frozen, Lost, or Dual-region. That translation remains the primary Phase 3 engineering task.
