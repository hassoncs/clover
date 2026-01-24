# Asset Pipeline Debug Output

**Category**: debugging
**Detected From**: docs/asset-generation-knowledge.md
**Proposed for AGENTS.md**: Yes

## Description

Save intermediate files for each pipeline stage to `api/debug-output/{gameId}/{assetId}/` with descriptive filenames like `{stage}_{artifact}.{ext}`.

## Pattern

```
api/debug-output/{gameId}/{assetId}/
├── {stage1}_{artifact}.{ext}
├── {stage2}_{artifact}.{ext}
├── {stage3}_{artifact}.{ext}
└── manifest.json
```

## Examples

### Physics Stacker Game
```
api/debug-output/physics-stacker/
├── foundation_1_silhouette.png      # Input silhouette
├── foundation_2_prompt.txt          # Full prompt + negative prompt
├── foundation_3_generated.jpg       # Generated image (before bg removal)
├── foundation_4_final.png           # Final transparent PNG
├── background_final.jpg             # Background image
└── run-{timestamp}_manifest.json    # Config, results, timing
```

### Asset Pipeline Stages

| Stage | Artifact | Filename Pattern |
|-------|----------|------------------|
| Silhouette creation | PNG silhouette | `{assetId}_silhouette.png` |
| Prompt building | Text prompt | `{assetId}_prompt.txt` |
| AI generation | Generated image | `{assetId}_generated.{ext}` |
| Background removal | Transparent PNG | `{assetId}_no-bg.png` |
| Final output | Final asset | `{assetId}_final.{ext}` |

## Benefits

1. **Debugging**: Inspect each stage to identify where issues occur
2. **Iteration**: Compare prompts and results across runs
3. **Documentation**: Visual examples for documentation
4. **Reproducibility**: Manifest includes all parameters for reproduction

## Manifest Format

```json
{
  "gameId": "physics-stacker",
  "theme": "wooden toy blocks",
  "style": "cartoon",
  "timestamp": "2026-01-23T10:30:00Z",
  "assets": [
    {
      "id": "foundation",
      "type": "entity",
      "shape": "box",
      "width": 4.0,
      "height": 0.6,
      "description": "a sturdy wooden table",
      "stages": {
        "silhouette": { "duration": 45, "file": "foundation_1_silhouette.png" },
        "prompt": { "duration": 2, "file": "foundation_2_prompt.txt" },
        "img2img": { "duration": 12500, "file": "foundation_3_generated.jpg" },
        "removeBg": { "duration": 8200, "file": "foundation_4_final.png" }
      },
      "r2Key": "generated/physics-stacker/foundation.png"
    }
  ]
}
```

## Implementation

```typescript
// Enable debug output
const DEBUG_OUTPUT = process.env.DEBUG_ASSET_GENERATION === 'true';

if (DEBUG_OUTPUT) {
  const debugDir = path.join(__dirname, '../debug-output', gameId, assetId);
  await fs.mkdir(debugDir, { recursive: true });
  
  // Save artifact
  await fs.writeFile(
    path.join(debugDir, `${stage}_${artifact}.${ext}`),
    buffer
  );
}
```

## Related Files

- `api/src/ai/pipeline/executor.ts` - Pipeline execution with debug output
- `api/scripts/generate-game-assets.ts` - CLI script with debug support
- `docs/asset-generation-knowledge.md` - Full asset generation documentation
