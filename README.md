# EquiReign

EquiReign is the game repository built on top of the NQueensSimulator solver and puzzle-generation work.

## Repository role

- `NQueensSimulator`: solver, generator, rule validation, algorithm playground.
- `EquiReign`: game rules, difficulty system, sessions, hints, progression, economy, cosmetics, and production UI.

## Initial game rules

- Beginner: 2 given queens; realtime queen-position validation enabled.
- Intermediate: 1 given queen; realtime queen-position validation enabled.
- Advanced: no given queens; realtime queen-position validation enabled.
- Expert: no given queens; no answer-position realtime validation; 3 hints per game.
- King: no given queens; no answer-position realtime validation; 3 hints per game.
- Expert/King hints highlight the next logically determinable cell only. They do not reveal whether it is a queen or an X, and remain highlighted until the player's next board action.
- Direct rule conflicts remain visible at all difficulties.

## CI/CD baseline

The repository starts with the same develop → CI → PR → main release discipline established in NQueensSimulator. The workflows are bootstrap-safe until the application scaffold and package lock exist.
