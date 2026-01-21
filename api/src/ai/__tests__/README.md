# Scenario.com Testing Suite

Complete testing infrastructure for AI-generated game assets via scenario.com.

## Quick Start

```bash
# Run unit tests (no API key needed)
pnpm test:run

# Generate test images locally (requires API key)
hush run -- npx tsx scenario-visual-test-runner.ts
```

## Files

- **scenario-client.test.ts** - 46 unit tests for ScenarioClient
- **asset-service.test.ts** - 30 unit tests for AssetService  
- **scenario-integration.test.ts** - 20 integration tests (real API)
- **scenario-visual-test-runner.ts** - CLI tool for visual testing
- **run-scenario-tests.sh** - Convenience script

## Output

All generated images saved to: `./output/scenario-visual-tests/`

## Documentation

See `/docs/game-maker/SCENARIO_TEST_GUIDE.md` for complete documentation.
