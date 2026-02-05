## 2026-02-05 Discovery Phase

### Pre-existing TypeScript Errors
The codebase has pre-existing TS errors related to `inputEvents` not existing on `RuleContext`.
This suggests someone already started adding inputEvents but didn't finish updating the RuleContext type.
These errors MUST be fixed as part of the trigger standardization work.

### Test Files Already Written for snake_case
Two test files already exist that use `game_loaded` snake_case triggers but fail because the shared types still use camelCase.
These tests will start passing once shared types are updated.
