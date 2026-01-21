# Scenario.com Testing Guide

> Complete guide to testing the scenario.com integration for AI-generated game assets.

---

## Quick Start

### Run Unit Tests (No API Key Needed)

```bash
cd api
pnpm test:run src/ai/__tests__/scenario-client.test.ts src/ai/__tests__/asset-service.test.ts
```

### Run Visual Tests (Requires API Key)

```bash
# Using hush (recommended - loads secrets automatically)
hush run -- npx tsx api/src/ai/__tests__/scenario-visual-test-runner.ts

# Or set credentials manually
export SCENARIO_API_KEY=your_key
export SCENARIO_SECRET_API_KEY=your_secret
npx tsx api/src/ai/__tests__/scenario-visual-test-runner.ts
```

### Visual Test Options

```bash
# Test only models (skip API endpoint tests)
npx tsx api/src/ai/__tests__/scenario-visual-test-runner.ts --models-only

# Test only API endpoints (skip model tests)
npx tsx api/src/ai/__tests__/scenario-visual-test-runner.ts --api-only

# Test a specific model
npx tsx api/src/ai/__tests__/scenario-visual-test-runner.ts --model=model_retrodiffusion-plus
```

---

## Test Files Overview

| File | Purpose | Requires API |
|------|---------|--------------|
| `scenario-client.test.ts` | Unit tests for ScenarioClient API methods | No (mocked) |
| `asset-service.test.ts` | Unit tests for AssetService model selection/prompts | No (mocked) |
| `scenario-integration.test.ts` | Integration tests with real API calls | Yes |
| `scenario-visual-test-runner.ts` | CLI tool to generate and save images locally | Yes |

---

## What Gets Tested

### Unit Tests (76 tests)

**ScenarioClient (46 tests)**
- Constructor validation (credentials, API URL)
- Custom endpoint detection for third-party models
- Request formatting for txt2img, img2img, third-party generation
- Job polling and status handling
- Asset download and metadata retrieval
- Model listing

**AssetService (30 tests)**
- Model selection for all entity type/style combinations
- Prompt generation for each entity type
- Placeholder generation when API unavailable
- Batch generation

### Integration Tests (20 tests, skipped without credentials)

- Real API calls to scenario.com
- Model listing (private and public)
- Image generation with flux and retrodiffusion models
- Asset download and verification

### Visual Test Runner

Generates actual images for quality inspection:

| Test | Model | Description |
|------|-------|-------------|
| character-pixel-static | model_retrodiffusion-plus | Pixel art knight at 256×256 |
| character-pixel-animated | model_retrodiffusion-animation | Walk cycle sprite sheet |
| character-cartoon-static | model_c8zak5M1VGboxeMd8kJBr2fn | Cartoon hero |
| enemy-pixel-static | model_retrodiffusion-plus | Pixel art monster |
| item-pixel-static | model_retrodiffusion-plus | Pixel art coin |
| item-3d-static | model_7v2vV6NRvm8i8jJm6DWHf6DM | 3D treasure chest |
| platform-pixel-static | model_retrodiffusion-tile | Tileable grass |
| background-pixel-static | model_uM7q4Ms6Y5X2PXie6oA9ygRa | Forest scene |
| background-cartoon-static | model_hHuMquQ1QvEGHS1w7tGuYXud | Cartoon meadow |
| ui-pixel-static | model_mcYj5uGzXteUw6tKapsaDgBP | Game button |
| ui-flat-static | model_mcYj5uGzXteUw6tKapsaDgBP | Health bar |

Plus API endpoint tests:
- List models
- Remove background
- Image-to-image transformation

---

## Output Location

Visual test outputs are saved to:

```
api/src/ai/__tests__/output/scenario-visual-tests/
├── character-pixel-static-2024-01-15T10-30-00-000Z.png
├── enemy-pixel-static-2024-01-15T10-31-00-000Z.png
├── ...
├── test-report-2024-01-15T10-35-00-000Z.json
└── models-list-2024-01-15T10-30-05-000Z.json
```

---

## Model Matrix Reference

| Entity Type | Style | Animated | Model ID |
|-------------|-------|----------|----------|
| character | pixel | false | model_retrodiffusion-plus |
| character | pixel | true | model_retrodiffusion-animation |
| character | cartoon | false | model_c8zak5M1VGboxeMd8kJBr2fn |
| enemy | pixel | false | model_retrodiffusion-plus |
| enemy | pixel | true | model_retrodiffusion-animation |
| enemy | cartoon | false | model_c8zak5M1VGboxeMd8kJBr2fn |
| item | pixel | false | model_retrodiffusion-plus |
| item | 3d | false | model_7v2vV6NRvm8i8jJm6DWHf6DM |
| platform | pixel | false | model_retrodiffusion-tile |
| background | pixel | false | model_uM7q4Ms6Y5X2PXie6oA9ygRa |
| background | cartoon | false | model_hHuMquQ1QvEGHS1w7tGuYXud |
| ui | pixel | false | model_mcYj5uGzXteUw6tKapsaDgBP |
| ui | flat | false | model_mcYj5uGzXteUw6tKapsaDgBP |

---

## Troubleshooting

### "Scenario API credentials required"

Set both environment variables:
```bash
export SCENARIO_API_KEY=your_api_key
export SCENARIO_SECRET_API_KEY=your_secret_key
```

Or use `hush run` to automatically load secrets.

### "Job timed out"

Generation jobs have a 10-minute timeout (200 attempts × 3 seconds). If you see timeouts:
- Check scenario.com status page
- Try a simpler prompt
- Use a faster model (flux.1-dev is usually fastest)

### Integration tests skipped

This is expected when credentials aren't set. The tests use `describe.skip` to gracefully skip.

### Visual test images look wrong

Check:
1. Model ID is correct (typos cause 404s)
2. Prompt matches model capabilities
3. Dimensions are within model limits

---

## Adding New Tests

### New Model Test

Add to `MODEL_MATRIX` in `scenario-visual-test-runner.ts`:

```typescript
'new-test-key': {
  model: 'model_id',
  description: 'Human-readable description',
  prompt: 'detailed prompt for generation',
  width: 256,
  height: 256,
},
```

### New Unit Test

Add to `scenario-client.test.ts` or `asset-service.test.ts` following existing patterns.

### New Integration Test

Add to `scenario-integration.test.ts` inside the `describeWithCredentials` block.
