
## UI Experiment Tool Implementation
- Created `api/scripts/ui-experiment.ts` and `api/scripts/ui-compare.ts`.
- The tool allows experimenting with UI generation parameters (theme, strength, prompt modifiers) without modifying the core pipeline.
- It generates a structured output directory with intermediate images (silhouette, generated, final).
- It produces an HTML comparison report (`comparison.html`) for easy visual inspection of results.
- Usage: `hush run -- npx tsx api/scripts/ui-experiment.ts --type button --theme "theme1, theme2" --strength 0.95,0.8`
