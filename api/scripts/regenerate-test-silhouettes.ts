import { createNinePatchSilhouette } from '../src/ai/pipeline/silhouettes/ui-component';
import { ICON_PATHS } from '../src/ai/pipeline/silhouettes/text-hint';
import * as fs from 'fs';
import * as path from 'path';

const outputDir = path.join(__dirname, '../../debug-output/silhouette-test');
fs.mkdirSync(outputDir, { recursive: true });

(async () => {
  // Button - 2:1 ratio with text hint
  const button = await createNinePatchSilhouette({
    width: 160,
    height: 64,
    marginSize: 12,
    canvasSize: 256,
    textHint: {
      text: 'BUTTON',
      fontSize: 24,
      color: '#E0E0E0',
      fontWeight: 'bold'
    }
  });
  fs.writeFileSync(path.join(outputDir, 'button-silhouette.png'), button);
  console.log('✅ Generated button silhouette (160×64, 2.5:1 ratio)');

  const checkbox = await createNinePatchSilhouette({
    width: 64,
    height: 64,
    marginSize: 12,
    canvasSize: 256,
    iconHint: {
      svgPath: ICON_PATHS.checkmark,
      size: 48,
      color: '#E0E0E0',
      x: 128,
      y: 128
    }
  });
  fs.writeFileSync(path.join(outputDir, 'checkbox-silhouette.png'), checkbox);
  console.log('✅ Generated checkbox silhouette (64×64, checkmark 48px centered)');
  
  console.log('\nSilhouettes saved to:', outputDir);
})();
