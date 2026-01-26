# Godot UI Theming System - Local Testing CLI Plan

## Context

**User Requirement**: "I want to run all of this locally through a script. I want all the code to be shared with the API (DRY). I want to trigger it easily locally using a Node script CLI style. I want to be able to generate any of these controls, and it should be the same script - not separate scripts per control."

**Goal**: Create ONE unified CLI script that can generate any UI control locally, using the same code as the API, without requiring deployment.

---

## Architecture

### Shared Code Strategy (DRY Principle)

```
api/src/ai/
  pipeline/              ← SHARED: Core generation logic
    types.ts
    stages/ui-component.ts
    silhouettes/ui-component-svg.ts
    prompt-builder.ts
  
  cli/                   ← NEW: CLI-specific wrappers
    generate-ui.ts       ← Main CLI entry point
    adapters.ts          ← Local Node.js adapters (reuses api/src/ai/pipeline/adapters/node.ts)
  
  trpc/routes/
    ui-components.ts     ← API: Uses same pipeline as CLI
```

**Key Principle**: CLI and API both import from `api/src/ai/pipeline/*`. Zero duplication.

---

## CLI Features

### Command Structure

```bash
# Generate single control
pnpm generate:ui button --theme "medieval fantasy"

# Generate multiple controls
pnpm generate:ui panel progress_bar --theme "sci-fi neon"

# Generate full theme (all 6 controls)
pnpm generate:ui --all --theme "cartoon bright"

# Specify output directory
pnpm generate:ui button --theme "medieval" --output ./test-output

# Use theme preset
pnpm generate:ui button --preset medieval

# Verbose mode (show pipeline stages)
pnpm generate:ui panel --theme "stone" --verbose
```

### CLI Arguments

| Argument | Type | Required | Description | Example |
|----------|------|----------|-------------|---------|
| `<controls...>` | string[] | Yes* | Control type(s) to generate | `button panel` |
| `--all` | flag | Yes* | Generate all 6 controls | `--all` |
| `--theme` | string | Yes | Theme description | `"medieval fantasy"` |
| `--preset` | string | No | Use built-in theme preset | `medieval` |
| `--output` | string | No | Output directory | `./output` |
| `--verbose` | flag | No | Show detailed logs | `--verbose` |

*Either `<controls...>` OR `--all` required, not both.

---

## Implementation Plan

### Task 1: Create CLI Entry Point

**File**: `api/src/cli/generate-ui.ts`

```typescript
#!/usr/bin/env node
import { parseArgs } from 'node:util';
import { generateUIControls } from './generate-ui-impl';

async function main() {
  const { values, positionals } = parseArgs({
    args: process.argv.slice(2),
    options: {
      all: { type: 'boolean', default: false },
      theme: { type: 'string' },
      preset: { type: 'string' },
      output: { type: 'string', default: './api/debug-output/ui-cli' },
      verbose: { type: 'boolean', default: false },
    },
    allowPositionals: true,
  });

  // Validate arguments
  if (!values.all && positionals.length === 0) {
    console.error('Error: Specify controls or use --all');
    process.exit(1);
  }

  if (!values.theme && !values.preset) {
    console.error('Error: --theme or --preset required');
    process.exit(1);
  }

  // Determine controls to generate
  const controls = values.all 
    ? ['button', 'checkbox', 'panel', 'progress_bar', 'scroll_bar_h', 'scroll_bar_v', 'tab_bar']
    : positionals;

  // Get theme
  const theme = values.theme || getPresetTheme(values.preset);

  // Generate
  await generateUIControls({
    controls,
    theme,
    outputDir: values.output,
    verbose: values.verbose,
  });
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
```

**Must Have**:
- ✅ Parse CLI arguments using Node.js `parseArgs`
- ✅ Validate required arguments
- ✅ Support both control list and `--all` flag
- ✅ Support theme string or preset
- ✅ Default output directory
- ✅ Verbose logging option

**Must NOT Have**:
- ❌ No separate scripts per control
- ❌ No hardcoded control lists (use shared types)
- ❌ No deployment logic (local only)

---

### Task 2: Implement Generation Logic (DRY)

**File**: `api/src/cli/generate-ui-impl.ts`

```typescript
import { executeGameAssets } from '../ai/pipeline';
import { createNodeAdapters } from '../ai/pipeline/adapters/node';
import { UI_CONTROL_CONFIG } from '../ai/pipeline/ui-control-config';
import type { GameAssetConfig, UIComponentSheetSpec } from '../ai/pipeline/types';

export interface GenerateUIOptions {
  controls: string[];
  theme: string;
  outputDir: string;
  verbose: boolean;
}

export async function generateUIControls(options: GenerateUIOptions) {
  const { controls, theme, outputDir, verbose } = options;

  // Create pipeline adapters (local Node.js environment)
  const adapters = await createNodeAdapters({
    scenarioApiKey: process.env.SCENARIO_API_KEY!,
    r2Config: {
      accountId: process.env.R2_ACCOUNT_ID!,
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
      bucketName: process.env.R2_BUCKET_NAME || 'slopcade-assets-dev',
    },
  });

  // Build asset specs (SHARED with API logic)
  const assets: UIComponentSheetSpec[] = controls.map((controlType) => {
    const config = UI_CONTROL_CONFIG[controlType];
    
    return {
      type: 'sheet',
      kind: 'ui_component',
      id: `cli-${controlType}-${Date.now()}`,
      componentType: controlType,
      states: config.states,
      ninePatchMargins: config.margins,
      width: config.dimensions.width,
      height: config.dimensions.height,
      layout: { type: 'manual' },
      promptConfig: {
        basePrompt: config.description,
        commonModifiers: ['Transparent background', 'Nine-patch ready'],
      },
    };
  });

  // Create game config
  const gameConfig: GameAssetConfig = {
    gameId: `ui-cli-${Date.now()}`,
    gameTitle: 'UI CLI Test',
    theme,
    style: 'pixel',
    r2Prefix: `generated/ui-cli-${Date.now()}`,
    localOutputDir: outputDir,
    assets,
  };

  // Execute pipeline (SHARED with API)
  console.log(`\n🎨 Generating ${controls.length} UI controls...`);
  console.log(`Theme: ${theme}`);
  console.log(`Output: ${outputDir}\n`);

  for (const asset of assets) {
    const controlType = (asset as UIComponentSheetSpec).componentType;
    console.log(`\n📦 Generating ${controlType}...`);
    
    try {
      const result = await executeGameAssets(
        { ...gameConfig, assets: [asset] },
        adapters,
        verbose ? console.log : undefined
      );
      
      console.log(`✅ ${controlType} complete`);
      console.log(`   States: ${(asset as UIComponentSheetSpec).states.join(', ')}`);
      console.log(`   R2 Keys: ${result.results[0].r2Keys.join(', ')}`);
    } catch (error) {
      console.error(`❌ ${controlType} failed:`, error.message);
    }
  }

  console.log(`\n✨ Done! Check ${outputDir} for debug output.\n`);
}
```

**Key Points**:
- ✅ Imports `executeGameAssets` (SHARED with API)
- ✅ Uses `UI_CONTROL_CONFIG` (SHARED type system)
- ✅ Creates same `GameAssetConfig` as API
- ✅ Sequential generation with progress output
- ✅ Error handling per control (continue on failure)

---

### Task 3: Theme Presets

**File**: `api/src/cli/theme-presets.ts`

```typescript
export const THEME_PRESETS: Record<string, string> = {
  medieval: 'medieval fantasy with stone textures and ornate metalwork',
  scifi: 'futuristic sci-fi with neon glows and holographic effects',
  cartoon: 'cartoon style with bright colors and bold outlines',
  cyberpunk: 'cyberpunk neon with glowing edges and dark backgrounds',
  fantasy: 'high fantasy with magical glows and ethereal effects',
  minimal: 'minimal modern design with clean lines and subtle gradients',
};

export function getPresetTheme(presetName?: string): string | undefined {
  if (!presetName) return undefined;
  
  const theme = THEME_PRESETS[presetName.toLowerCase()];
  if (!theme) {
    const available = Object.keys(THEME_PRESETS).join(', ');
    throw new Error(`Unknown preset: ${presetName}. Available: ${available}`);
  }
  
  return theme;
}

export function listPresets(): void {
  console.log('\n📚 Available theme presets:\n');
  for (const [name, description] of Object.entries(THEME_PRESETS)) {
    console.log(`  ${name.padEnd(12)} - ${description}`);
  }
  console.log();
}
```

**Presets Included**:
- `medieval` - Stone textures, ornate metalwork
- `scifi` - Neon glows, holographic effects
- `cartoon` - Bright colors, bold outlines
- `cyberpunk` - Dark backgrounds, glowing edges
- `fantasy` - Magical glows, ethereal
- `minimal` - Clean lines, subtle gradients

---

### Task 4: Package.json Script

**File**: `package.json` (root)

```json
{
  "scripts": {
    "generate:ui": "tsx api/src/cli/generate-ui.ts",
    "generate:ui:help": "tsx api/src/cli/generate-ui.ts --help"
  }
}
```

**Usage Examples**:
```bash
# Generate button with medieval theme
pnpm generate:ui button --theme "medieval fantasy"

# Generate panel and progress bar with preset
pnpm generate:ui panel progress_bar --preset scifi

# Generate all controls
pnpm generate:ui --all --preset cartoon

# Verbose output
pnpm generate:ui button --theme "neon" --verbose
```

---

### Task 5: Environment Setup

**File**: `api/.env.example`

```bash
# Required for local UI generation CLI
SCENARIO_API_KEY=your_scenario_api_key_here
R2_ACCOUNT_ID=your_r2_account_id
R2_ACCESS_KEY_ID=your_r2_access_key_id
R2_SECRET_ACCESS_KEY=your_r2_secret_access_key
R2_BUCKET_NAME=slopcade-assets-dev
```

**File**: `.env.local` (user creates from example)

**Setup Instructions**:
```bash
# 1. Copy example
cp api/.env.example api/.env.local

# 2. Fill in credentials
# Edit api/.env.local with your actual keys

# 3. Test CLI
pnpm generate:ui button --preset medieval
```

---

### Task 6: Help Text

Add `--help` flag to CLI:

```typescript
// In generate-ui.ts main()
if (values.help) {
  printHelp();
  process.exit(0);
}

function printHelp() {
  console.log(`
🎨 Godot UI Control Generator

USAGE:
  pnpm generate:ui <controls...> --theme <theme>
  pnpm generate:ui --all --theme <theme>
  pnpm generate:ui <controls...> --preset <preset>

ARGUMENTS:
  <controls...>     Control types: button, checkbox, panel, progress_bar, scroll_bar_h, scroll_bar_v, tab_bar

OPTIONS:
  --all             Generate all 6 controls
  --theme <text>    Theme description (required if no --preset)
  --preset <name>   Use built-in theme preset (see list below)
  --output <dir>    Output directory (default: ./api/debug-output/ui-cli)
  --verbose         Show detailed pipeline logs
  --help            Show this help

THEME PRESETS:
  medieval, scifi, cartoon, cyberpunk, fantasy, minimal

EXAMPLES:
  # Single control with theme
  pnpm generate:ui button --theme "medieval fantasy"
  
  # Multiple controls with preset
  pnpm generate:ui panel progress_bar --preset scifi
  
  # All controls
  pnpm generate:ui --all --preset cartoon
  
  # Custom output directory
  pnpm generate:ui button --preset medieval --output ./my-test

ENVIRONMENT:
  Requires SCENARIO_API_KEY, R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY
  Set in api/.env.local (copy from api/.env.example)
  `);
}
```

---

## File Structure

```
api/
  src/
    ai/
      pipeline/                 ← SHARED (used by both CLI and API)
        types.ts
        stages/ui-component.ts
        silhouettes/ui-component-svg.ts
        prompt-builder.ts
        ui-control-config.ts
        adapters/
          node.ts               ← Local Node.js adapters
      
      cli/                      ← NEW: CLI-specific
        generate-ui.ts          ← Main entry point
        generate-ui-impl.ts     ← Implementation (imports pipeline)
        theme-presets.ts        ← Built-in themes
      
      trpc/routes/
        ui-components.ts        ← API route (imports pipeline)
  
  .env.example                  ← Template for credentials
  .env.local                    ← User's actual credentials (gitignored)

package.json                    ← Scripts: generate:ui, generate:ui:help
```

---

## Verification

### Manual Testing Checklist

- [ ] **Setup**:
  - [ ] Copy `api/.env.example` to `api/.env.local`
  - [ ] Fill in credentials (SCENARIO_API_KEY, R2_*)
  - [ ] Run `pnpm install`

- [ ] **Help Command**:
  - [ ] `pnpm generate:ui --help` → Shows help text

- [ ] **Single Control**:
  - [ ] `pnpm generate:ui button --preset medieval`
  - [ ] Verify output in `api/debug-output/ui-cli/`
  - [ ] Check R2 upload (files exist)

- [ ] **Multiple Controls**:
  - [ ] `pnpm generate:ui panel progress_bar --theme "sci-fi neon"`
  - [ ] Verify 2 controls generated

- [ ] **All Controls**:
  - [ ] `pnpm generate:ui --all --preset cartoon`
  - [ ] Verify 7 controls generated (button, checkbox, panel, progress_bar, scroll_bar_h, scroll_bar_v, tab_bar)

- [ ] **Custom Output**:
  - [ ] `pnpm generate:ui button --preset medieval --output ./test`
  - [ ] Verify files in `./test/` directory

- [ ] **Verbose Mode**:
  - [ ] `pnpm generate:ui panel --theme "stone" --verbose`
  - [ ] Verify detailed pipeline logs shown

- [ ] **Error Handling**:
  - [ ] `pnpm generate:ui` (no args) → Error: Specify controls or use --all
  - [ ] `pnpm generate:ui button` (no theme) → Error: --theme or --preset required
  - [ ] `pnpm generate:ui button --preset invalid` → Error: Unknown preset

---

## Integration with Main Plan

This CLI plan is **supplementary** to the main UI theming plan. It adds Task 14 (optional but recommended):

### Task 14: Local Testing CLI (Optional)

**What to do**:
- Implement Tasks 1-6 from CLI plan
- Create `api/src/cli/` directory
- Add CLI scripts to `package.json`
- Document in README

**Why It Matters**:
- Test generation locally without deployment
- Share code with API (DRY principle)
- Faster iteration during development
- Easy manual QA

**Acceptance Criteria**:
- [ ] `pnpm generate:ui button --preset medieval` works
- [ ] Output appears in `api/debug-output/ui-cli/`
- [ ] R2 uploads successful
- [ ] Same code as API (no duplication)

---

## Benefits

### 1. DRY (Don't Repeat Yourself)
- ✅ CLI imports from `api/src/ai/pipeline/` (same as API)
- ✅ Zero code duplication
- ✅ Changes to pipeline automatically apply to both CLI and API

### 2. Fast Iteration
- ✅ No deployment needed
- ✅ Instant feedback
- ✅ Test all 6 controls in <5 minutes

### 3. Unified Interface
- ✅ One script for all controls
- ✅ Consistent arguments
- ✅ Built-in presets for common themes

### 4. Production Parity
- ✅ Uses exact same pipeline as API
- ✅ Same adapters (Node.js)
- ✅ Same R2 storage

---

## Future Enhancements (Out of Scope)

- Watch mode (regenerate on theme change)
- Interactive theme builder (prompts for theme description)
- Batch generation config files (YAML/JSON)
- Preview in Godot directly from CLI
- Export as .theme resource file

