# EquiReign

EquiReign is the production game built from the NQueensSimulator solver and puzzle-generation work. It targets iOS and Android first, with Web as the universal secondary platform.

## Initial game rules

- Beginner: 2 given queens; realtime answer-position validation.
- Intermediate: 1 given queen; realtime answer-position validation.
- Advanced: no given queens; realtime answer-position validation.
- Expert and King: no given queens; no answer-position validation; 3 hints.
- Expert/King hints highlight the next logical cell without revealing queen or X, and clear on the next board action.
- Direct queen conflicts remain visible at every difficulty.

## Architecture

- `src/game-core`: platform-independent TypeScript rules and state transitions.
- `src/puzzles`: pre-generated, validated puzzle definitions.
- `src/features/game`: React Native presentation only.
- `NQueensSimulator` remains a separate solver/generator/verification tool.
- Future production layers include sessions, progression, economy, and cosmetics.

## CI/CD baseline

The repository follows the established develop → CI → PR → main release discipline. Application quality gates will be enabled as the scaffold gains its lockfile and E2E suite.

## Run

```bash
npm install
npm test
npm run typecheck
npm run android   # or ios / web
```
