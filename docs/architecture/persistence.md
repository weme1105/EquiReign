# Persistence Strategy

## Decision

EquiReign keeps persistence behind an application-facing abstraction. Game Domain and Puzzle / Solver Core must not depend on SQLite, SQL Server, PostgreSQL, NoSQL, file-system APIs, or browser storage APIs.

The first production persistence implementation is local-first:

- Native (Android / iOS): SQLite via `expo-sqlite`.
- Web: browser `localStorage` behind the same persistence contract.
- Existing native JSON saves are treated as legacy data and are migrated into SQLite on first successful read.
- If SQLite cannot initialize or write, native session/progress storage falls back to the legacy JSON files so persistence failure does not interrupt gameplay.

## Boundary

Current storage-facing code depends on `PersistenceStore`:

```text
Game / Progress storage
        |
        v
PersistenceStore
   |          |
   v          v
SQLite      localStorage
(native)      (web)
```

Higher-level domain repositories should be introduced per aggregate/use case when server-side persistence is added. Avoid a generic CRUD `Repository<T>` abstraction that merely mirrors an ORM.

Expected future contracts include `PuzzleRepository`, `GameProgressRepository`, `PuzzleResultRepository`, and later economy-specific repositories such as `WalletRepository` and `InventoryRepository`.

## Server-side evolution

User growth alone is not a reason to move to NoSQL. When EquiReign needs account sync, leaderboards, wallet/economy, purchases, or cloud progress, prefer a relational database such as PostgreSQL or SQL Server unless a concrete access pattern demonstrates that a NoSQL datastore is a better fit.

Database migration must not require changes to Solver Core or Game Domain rules.
