## BindingEvaluator Learnings

### expr-eval Configuration
- `Parser` must be constructed with `{ allowMemberAccess: true }` to support dot notation like `variables.score`
- The typed `evaluate()` signature says it returns `number`, but at runtime it returns any value (boolean, string, etc.)
- To avoid type errors, use `parser.parse(expr).evaluate(ctx)` (Expression.evaluate returns `any`) instead of `parser.evaluate(expr, ctx)` (returns `number`)
- Custom functions (formatTime, formatNumber, percent, entityCount) work when passed as properties on the context object — no need to register them on `parser.functions`

### expr-eval Boolean Operators
- Uses `and`/`or`/`not` keywords (NOT `&&`/`||`/`!`)
- This is important for the plan spec — conditions like `variables.health < 20 && variables.lives > 0` should use `and` instead of `&&`
- The `!` operator in expr-eval is factorial, not negation

### @types/expr-eval
- The `@types/expr-eval` package in this repo is essentially empty (no actual .d.ts file)
- Types come from `expr-eval/parser.d.ts` bundled with the package itself

### Test Runner
- App uses `vitest` with `globals: true` and `jsdom` environment
- Test pattern: `import { describe, it, expect } from 'vitest'`
- Config at `app/vitest.config.mjs`, includes `lib/**/*.test.ts`
## Skill Documentation Update
- Replaced `UIConfig` with `OverlayConfig` in `game-definition-reference.md`.
- Added documentation for 7 overlay element types: text, bar, counter, button, image, container, spacer.
- Documented binding expressions and anchoring logic for the overlay system.
- Updated `dialogs` documentation with `showOnState`, `showWhen`, `style`, and `binding` fields.
- Converted legacy `ui:` examples to `overlay:` in `examples.md`.
- Verified zero legacy references to `UIConfig`, `variableDisplays`, `entityCountDisplays`, or `showTimer` in skill files.
