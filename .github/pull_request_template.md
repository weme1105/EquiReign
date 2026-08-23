## Summary

Describe the change and why it is needed.

## Validation

- [ ] `npm run lint`
- [ ] `npm run typecheck`
- [ ] `npm test`
- [ ] `npm run test:coverage` (70/70/70/70 minimum)
- [ ] `npm run audit`
- [ ] `npm run build`
- [ ] `npm run e2e`
- [ ] DEV build manually checked when UI behavior changed
- [ ] iPhone Safari checked when touch / pointer behavior changed

## Release safety

- [ ] Game rules are covered by tests
- [ ] Solver / puzzle-domain changes do not bypass uniqueness validation
- [ ] Difficulty / hint policy changes do not leak answer information unintentionally
- [ ] Exact release SHA identified before merge to `main`
