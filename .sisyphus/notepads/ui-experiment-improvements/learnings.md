# UI Experiment Tool Improvements

## A/B Comparison Feature
Added an interactive A/B comparison mode to the UI experiment tool to allow pixel-perfect verification of generated assets against their source silhouettes.

### Changes
- **Background Removal Skipped**: Temporarily disabled background removal in `ui-experiment.ts` to allow comparison of raw generation output.
- **Interactive Overlay**: Updated `ui-compare.ts` to generate an HTML report with an overlay view instead of side-by-side images.
- **Comparison Modes**:
  - **Silhouette**: Shows the original silhouette.
  - **Generated**: Shows the AI generated image.
  - **Click to Switch**: Allows toggling between silhouette and generated image on mouse click/hold for rapid "eye doctor" style comparison.

### Usage
Run the experiment tool as usual:
```bash
npx tsx api/scripts/ui-experiment.ts --type button --theme "cyberpunk"
```
Open the generated `comparison.html` in the output directory to use the new comparison tools.
