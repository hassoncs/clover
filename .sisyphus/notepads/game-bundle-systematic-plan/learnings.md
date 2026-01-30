## Constant Reference Types Implementation

Date: 2026-01-29

### Changes
- Added `constants` field to `GameDefinition` interface
- Created `ConstantRef` type with `{ const: string }` pattern
- Added `NumberOrConstant` and `StringOrConstant` union types for bundle format

### Patterns Discovered
- Zod schemas follow discriminated union patterns for runtime type detection
- Section dividers (`// ==========`) used throughout schemas.ts for organization
- Optional fields use `.optional()` in Zod, `?` in TypeScript

### Gotchas
- None encountered - changes were purely additive
