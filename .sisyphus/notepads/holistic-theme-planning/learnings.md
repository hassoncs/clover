# Learnings: Holistic Theme Planning

## Task 3: Database Migration for Theme Plan JSON

### Migration Conventions
- Migration file naming: `YYYYMMDD_description.sql` (e.g., `20260206_theme_plan.sql`)
- Simple ALTER TABLE ADD COLUMN statements for adding nullable columns
- No need for indexes on JSON blob columns used for storage only

### Schema Patterns
- `generation_jobs` table stores job-level metadata
- New column `theme_plan_json TEXT` added after `style TEXT` for consistency
- NULL default ensures backward compatibility with existing rows

### TypeScript Type Mapping
- Database columns use snake_case (e.g., `theme_plan_json`)
- TypeScript interfaces mirror DB columns exactly in `*Row` interfaces
- `toClient*` mapper functions convert snake_case to camelCase for API responses
- All nullable DB columns map to `| null` in TypeScript (not `| undefined`)

### Files Modified
1. `api/migrations/20260206_theme_plan.sql` - Migration to add column
2. `api/schema.sql` - Canonical schema updated
3. `api/src/trpc/routes/asset-system.ts`:
   - `GenerationJobRow` interface: added `theme_plan_json: string | null;`
   - `toClientJob` function: added `themePlanJson: row.theme_plan_json,`

### Verification
- LSP diagnostics clean on asset-system.ts
- TypeScript compilation passes (no errors related to theme_plan changes)
- Backward compatible: existing rows with NULL work without code changes

## Task 1: ThemePlan Type Definitions

### Implementation Details
- Created `api/src/ai/pipeline/theme-plan.ts` with versioned schema (v1)
- Used zod for runtime validation with regex patterns for hex colors
- Followed existing patterns from `api/src/ai/pipeline/types.ts`:
  - JSDoc comments with examples
  - Section dividers (`// =============================================================================`)
  - Clean export style

### Type Structure
- `ThemePlan`: Top-level schema with version literal (1), theme, style, globalPalette, templatePlans, cohesionAnchors, generatedAt, providerModel
- `TemplatePlan`: Per-template design with templateId, conceptName, prompt, negativePrompt, silhouetteColor, rationale
- `CohesionAnchors`: Theme coherence metadata (motifFamily, colorHarmony, moodDescriptor)

### Validation Functions
- `parseThemePlan(json: unknown)`: Validates with zod, throws ZodError on failure
- `validatePlanCoherence(plan: ThemePlan)`: Additional coherence checks:
  - Unique concept names across templates
  - Valid hex colors in silhouettes (redundant with zod but explicit)
  - No duplicate colors in global palette

### Testing Results
- ✓ TypeScript compilation passes (`tsc --noEmit`)
- ✓ LSP diagnostics clean
- ✓ Valid plan parsing works
- ✓ Invalid silhouette color rejected by zod
- ✓ Duplicate concept names detected by coherence validation
- ✓ Duplicate palette colors detected by coherence validation
- ✓ All required exports present

### Patterns to Follow
- Hex color validation: `/^#[0-9A-Fa-f]{6}$/` regex in zod schema
- ISO timestamp: `z.string().datetime()` for generatedAt
- Version field: `z.literal(1)` for future migration support
- Record types: `z.record(z.string(), TemplatePlanSchema)` for templatePlans


## Task 4: Theme Planner Service

### Implementation Details
- Created `api/src/ai/pipeline/theme-planner.ts` with standalone service function
- Uses raw `fetch` to OpenRouter API (not AI SDK) per task requirements
- API key passed as parameter, not read from context

### Function Signature
```typescript
export async function generateThemePlan(
  input: ThemePlannerInput,
  openrouterApiKey: string,
): Promise<ThemePlan | null>
```

### Key Design Decisions
1. **Two-attempt strategy**: First try with temperature 0.7, retry with 0.3 on failure
2. **JSON extraction**: Strips markdown code fences (`\`\`\`json` and `\`\`\``) before parsing
3. **Graceful fallback**: Returns `null` on failure (caller decides fallback behavior)
4. **Validation chain**: parseThemePlan (zod) → validatePlanCoherence (semantic checks)

### System Prompt Structure
- Lists all templates with entityType, physicsShape, tags, whatDescription
- Includes exact JSON schema in prompt for model guidance
- Emphasizes critical requirements: unique concept names, valid hex colors, all templateIds present
- Supports existingAnchors for partial regeneration (Task 5 will use this)

### Exports
- `TemplateInfo` - Template information interface
- `ThemePlannerInput` - Input parameters interface
- `generateThemePlan` - Main service function

### Verification
- ✓ TypeScript compilation passes (`pnpm --filter @slopcade/api exec tsc --noEmit`)
- ✓ LSP diagnostics clean on theme-planner.ts
- ✓ No new dependencies added
- ✓ Follows existing code patterns (section dividers, JSDoc for public API)

## Task 5: Integration into Asset System Routes

### Implementation Details
- Modified `api/src/trpc/routes/asset-system.ts` to integrate theme planner into three job creation routes
- Added imports: `generateThemePlan`, `ThemePlannerInput`, `ThemePlan`
- Created helper function `buildPlannerInput()` to extract template info from game definition

### Helper Function Pattern
```typescript
function buildPlannerInput(
  definition: { templates?: Record<string, any> },
  templateIds: string[],
  theme: string,
  style?: string,
  gameTitle?: string,
): ThemePlannerInput
```
- Extracts `whatDescription`, `entityType`, `physicsShape`, `tags` from each template
- Reuses existing entityType detection logic (tags-based)
- Maps physics.shape to 'box' | 'circle' (defaults to 'box')

### Integration Pattern (Applied to All Three Routes)
1. **After job INSERT, before task loop**: Call `generateThemePlan()` if `OPENROUTER_API_KEY` exists
2. **On success**: UPDATE job row with `theme_plan_json = JSON.stringify(plan)`
3. **In task loop**: Check if `themePlan && themePlan.templatePlans[templateId]` exists
   - If yes: Use `plan.templatePlans[templateId].prompt` as `compiledPrompt`
   - If no: Fall back to `buildStructuredPrompt()` (backward compatible)

### Routes Modified
1. **createGenerationJob** (line ~600):
   - Theme from `input.promptDefaults.themePrompt`
   - Style from `input.promptDefaults.styleOverride`
   - Only runs planner if both API key and themePrompt exist

2. **regeneratePack** (line ~768):
   - Theme from `input.newTheme`
   - Style from `input.newStyle`
   - Only runs planner if both API key and newTheme exist

3. **applyThemeToGame** (line ~1855):
   - Theme from database: `SELECT prompt_modifier FROM themes WHERE id = ?`
   - Style from `input.styleOverride`
   - Fetches theme row before calling planner

### Backward Compatibility
- If `OPENROUTER_API_KEY` is not set: skips planner entirely, uses existing behavior
- If planner returns `null`: falls back to `buildStructuredPrompt()`
- If planner succeeds but missing a templateId: falls back for that specific template
- Existing jobs with `theme_plan_json = NULL` continue to work unchanged

### Logging
- Added console.log statements for key events:
  - `[AssetSystem] Theme planner: generating plan for {route}`
  - `[AssetSystem] Theme planner: plan generated successfully`
  - `[AssetSystem] Theme planner: plan generation failed, falling back to buildStructuredPrompt`

### Verification
- ✓ TypeScript compilation passes (`pnpm --filter @slopcade/api exec tsc --noEmit`)
- ✓ LSP diagnostics clean (only unused import hints, no errors)
- ✓ All three routes follow the same integration pattern
- ✓ Backward compatible with existing behavior

### Key Insights
- The entityType detection logic is duplicated across all three routes (tags-based)
- The helper function `buildPlannerInput()` centralizes this logic for the planner
- The planner is called AFTER the job INSERT to ensure the job exists before updating it
- The UPDATE for `theme_plan_json` is separate from the INSERT (simpler, doesn't break if planner is slow)
- The task loop checks for plan existence on every iteration (safe, handles partial plans)


## Task 6: CLI Integration for Theme Planner

### Implementation Details
- Modified `api/scripts/generate-assets.ts` to integrate theme planner with new CLI flags
- Added three new flags: `--plan-only`, `--reuse-plan=<path>`, `--planner-disable`
- Dynamic imports used for planner modules (consistent with existing pipeline imports)

### CLI Flags
1. **--plan-only**: Generate theme plan JSON, output to stdout and save to file, exit without generating images
2. **--reuse-plan=<path>**: Load previously saved plan JSON from file path instead of generating new plan
3. **--planner-disable**: Skip planner entirely, use legacy prompt building (existing behavior)

### Integration Flow
1. **After specs built, before generation loop**: Planner integration runs
2. **Disable check**: If `--planner-disable` set, skip planner entirely
3. **Reuse plan**: If `--reuse-plan` set, load plan from file path and validate with `parseThemePlan`
4. **Generate new plan**: If theme provided and `OPENROUTER_API_KEY` exists:
   - Build `ThemePlannerInput` from specs array (templateId, whatDescription, entityType, physicsShape, tags)
   - Call `generateThemePlan(input, process.env.OPENROUTER_API_KEY!)`
   - Save plan to `<packDir>/theme-plan.json`
5. **Plan-only mode**: If `--plan-only`, output plan JSON to console and exit
6. **Apply plan to specs**: Override `spec.description` with `plan.templatePlans[spec.id].prompt` and `spec.color` with `silhouetteColor`

### Key Design Decisions
- **Planner runs AFTER packDir creation**: Ensures directory exists for saving theme-plan.json
- **Graceful fallback**: If planner fails or returns null, falls back to legacy prompt building
- **Per-template override**: Only overrides specs where plan has a matching templateId (partial plans supported)
- **Logging**: Clear status messages for each planner state (disabled, loading, generating, success, failure)

### Type Handling
- Removed duplicate `EntityType` declaration (already defined earlier in file)
- Added minimal `ThemePlan` type for local use (only needs `templatePlans` field)
- Used `parseThemePlan` for validation when loading from file

### Verification
- ✓ TypeScript compilation passes (`pnpm --filter @slopcade/api exec tsc --noEmit`)
- ✓ All CLI flags added to parseArgs options
- ✓ Usage string updated with new flags
- ✓ Planner integration follows existing code patterns (dynamic imports, error handling)
- ✓ Backward compatible: existing behavior unchanged when new flags not used

### Usage Examples
```bash
# Generate plan only (no images)
hush run -- pnpm generate:assets --game=ballSort --theme="spooky Halloween" --plan-only

# Generate images with planner (default when theme provided)
hush run -- pnpm generate:assets --game=ballSort --theme="spooky Halloween"

# Reuse existing plan
hush run -- pnpm generate:assets --game=ballSort --reuse-plan=r2/packs/<uuid>/theme-plan.json

# Disable planner (legacy behavior)
hush run -- pnpm generate:assets --game=ballSort --theme="spooky Halloween" --planner-disable
```

### Files Modified
- `api/scripts/generate-assets.ts`:
  - Added CLI flags: `plan-only`, `reuse-plan`, `planner-disable`
  - Added dynamic imports for `generateThemePlan` and `parseThemePlan`
  - Added planner integration flow (60+ lines) after specs built, before generation loop
  - Added spec override logic to apply plan prompts and colors
  - Updated usage string

### Integration Points
- Planner input built from existing `specs` array (reuses entityType detection logic)
- Plan saved to `<packDir>/theme-plan.json` (alongside manifest.json)
- Spec overrides applied before `executeAsset()` calls (transparent to pipeline)
- OPENROUTER_API_KEY read from `process.env` (injected by `hush run --`)


## Task 7: Partial Regeneration Coherence Rules

### Implementation Details
- Modified `regenerateAssets` route in `api/src/trpc/routes/asset-system.ts`
- Added `checkPartialPlanCoherence` helper function near `buildPlannerInput`
- Added `parseThemePlan` to imports from `@/ai/pipeline/theme-plan`

### Key Logic Flow
1. **Load existing plan**: Query most recent generation job for pack with non-null `theme_plan_json`
2. **Parse existing plan**: Use `parseThemePlan(JSON.parse(row.theme_plan_json))` with try/catch fallback
3. **Pass anchors**: Set `plannerInput.existingAnchors = existingPlan.cohesionAnchors` if existing plan found
4. **Generate new plan**: Call `generateThemePlan(plannerInput, apiKey)`
5. **Collision check**: Call `checkPartialPlanCoherence(newPlan, existingPlan, templateIds)` - logs warnings but doesn't fail
6. **Merge plans**: Combine existing plan entries (unchanged templates) with new plan entries (regenerated templates)
7. **Persist merged plan**: Store complete merged plan in `theme_plan_json`

### Helper Function: checkPartialPlanCoherence
```typescript
function checkPartialPlanCoherence(
  newPlan: ThemePlan,
  existingPlan: ThemePlan,
  regeneratedTemplateIds: string[],
): { warnings: string[] }
```
- Collects concept names and silhouette colors from UNCHANGED templates (not in regeneratedTemplateIds)
- Checks new plan entries for collisions with unchanged templates
- Returns warnings array (empty if no collisions)
- Case-insensitive concept name comparison, case-insensitive color comparison

### Plan Merging Strategy
```typescript
themePlan = {
  ...newPlan,
  templatePlans: {
    ...existingPlan.templatePlans,  // Keep unchanged
    ...newPlan.templatePlans,       // Override regenerated
  },
};
```
- New plan metadata (version, theme, style, globalPalette, cohesionAnchors, generatedAt) takes precedence
- Template plans merged: existing entries preserved, regenerated entries overwritten

### Backward Compatibility
- If no existing plan found (legacy pack): proceeds without anchors, stores only new plan entries
- If planner fails: falls back to `buildStructuredPrompt()` for each template
- If `OPENROUTER_API_KEY` not set: skips planner entirely
- Custom prompts (`input.customPrompts`) still take precedence over planner prompts

### Verification
- ✓ TypeScript compilation passes (`pnpm --filter @slopcade/api exec tsc --noEmit`)
- ✓ LSP diagnostics clean (no errors)
- ✓ Only modified `api/src/trpc/routes/asset-system.ts`

## Task 7: Unit Tests and Feature Flag

### Implementation Details
- Created `api/src/ai/__tests__/theme-plan.test.ts` with 10 unit tests for schema validation and coherence checks
- Added `THEME_PLANNER_ENABLED?: string` to `api/src/trpc/context.ts` Env interface
- Added feature flag checks to all four planner integration points in `api/src/trpc/routes/asset-system.ts`

### Test Coverage
1. **Schema validation (parseThemePlan)**:
   - ✓ Valid plan parses successfully
   - ✓ Invalid version rejected (version: 2)
   - ✓ Invalid hex color in silhouette rejected (color: "red")
   - ✓ Invalid hex color in global palette rejected
   - ✓ Missing required theme field rejected
   - ✓ Empty templatePlans accepted (valid schema)

2. **Coherence validation (validatePlanCoherence)**:
   - ✓ Well-formed plan passes validation
   - ✓ Duplicate concept names detected
   - ✓ Duplicate colors in global palette detected (case-insensitive)
   - ✓ Empty templatePlans accepted

### Feature Flag Behavior
- **Default**: Planner enabled when `OPENROUTER_API_KEY` exists (backward compatible)
- **Disabled**: Set `THEME_PLANNER_ENABLED=false` to skip planner entirely
- **Logging**: When disabled, logs `[AssetSystem] Theme planner: disabled via THEME_PLANNER_ENABLED=false`

### Integration Points Updated
All four routes now check feature flag before calling planner:
1. `createGenerationJob` (line ~780)
2. `regeneratePack` (line ~985)
3. `regenerateAssets` (line ~1598)
4. `applyThemeToGame` (line ~2108)

Pattern used in all routes:
```typescript
const plannerEnabled = ctx.env.THEME_PLANNER_ENABLED !== 'false';
if (!plannerEnabled) {
  console.log('[AssetSystem] Theme planner: disabled via THEME_PLANNER_ENABLED=false');
}
if (plannerEnabled && ctx.env.OPENROUTER_API_KEY && <route-specific-condition>) {
  // Call planner
}
```

### Verification
- ✓ All 10 new tests pass
- ✓ TypeScript compilation passes (`pnpm exec tsc --noEmit`)
- ✓ LSP diagnostics clean on context.ts and asset-system.ts
- ✓ Pre-existing test failures unrelated to changes (validator.test.ts, asset-service.test.ts, games.test.ts)
- ✓ Backward compatible: existing behavior unchanged when flag not set

### Files Modified
1. `api/src/ai/__tests__/theme-plan.test.ts` - New test file (10 tests)
2. `api/src/trpc/context.ts` - Added `THEME_PLANNER_ENABLED?: string` to Env interface
3. `api/src/trpc/routes/asset-system.ts` - Added feature flag checks to all four planner integration points

### Key Insights
- Feature flag uses string comparison (`!== 'false'`) to match existing env var patterns in codebase
- Default behavior (flag not set) is planner enabled - maintains backward compatibility
- Logging added for disabled state helps debugging in production
- All four routes follow identical pattern for consistency
- Tests use vitest patterns matching existing test files (import style, describe/it/expect)
