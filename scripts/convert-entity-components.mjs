#!/usr/bin/env node
/**
 * Bulk converter for entity component system migration
 * Converts old format: sprite + physics (with shape) 
 * To new format: visual + physics (body only) + collider (shape/material)
 */

import fs from 'fs';
import path from 'path';

const FILES_TO_CONVERT = [
  // Test games
  'app/lib/test-games/games/ballSort/game.ts',
  'app/lib/test-games/games/blockDrop/game.ts',
  'app/lib/test-games/games/breakoutBouncer/game.ts',
  'app/lib/test-games/games/bubbleShooter/game.ts',
  'app/lib/test-games/games/catsFallingObjects/game.ts',
  'app/lib/test-games/games/catsPlatformer/game.ts',
  'app/lib/test-games/games/connect4/game.ts',
  'app/lib/test-games/games/dominoChain/game.ts',
  'app/lib/test-games/games/dropPop/game.ts',
  'app/lib/test-games/games/dungeonCrawler/game.ts',
  'app/lib/test-games/games/endlessScrollPlayground/game.ts',
  'app/lib/test-games/games/flappyBird/game.ts',
  'app/lib/test-games/games/game2048/game.ts',
  'app/lib/test-games/games/gemCrush/game.ts',
  'app/lib/test-games/games/iceSlide/game.ts',
  'app/lib/test-games/games/memoryMatch/game.ts',
  'app/lib/test-games/games/physicsStacker/game.ts',
  'app/lib/test-games/games/pinballLite/game.ts',
  'app/lib/test-games/games/puyoPuyo/game.ts',
  'app/lib/test-games/games/renderTest/game.ts',
  'app/lib/test-games/games/rpgProgressionDemo/game.ts',
  'app/lib/test-games/games/simplePlatformer/game.ts',
  'app/lib/test-games/games/slopeggle/game.ts',
  'app/lib/test-games/games/slotMachine/game.ts',
  'app/lib/test-games/games/sportsProjectile/game.ts',
  'app/lib/test-games/games/stackAttack/game.ts',
  'app/lib/test-games/games/stackMatch/game.ts',
  'app/lib/test-games/games/tetris/game.ts',
  'app/lib/test-games/games/tipScale/game.ts',
  'app/lib/test-games/games/towerDefense/game.ts',
  'app/lib/test-games/games/ballLauncher/game.ts',
  'app/lib/test-games/games/candyCrush/game.ts',
  'app/lib/test-games/games/match3/game.ts',
  'app/lib/test-games/games/jumpyCat/game.ts',
  'app/lib/test-games/games/hillRacer/game.ts',
  'app/lib/test-games/games/fallingCatcher/game.ts',
  'app/lib/test-games/games/stackAttack/game.ts',
  'app/lib/test-games/games/match3/game.ts',
  
  // Examples
  'app/examples/draggable_cubes.tsx',
  'app/examples/dynamic_images.tsx',
  'app/examples/dynamic_shader.tsx',
  'app/examples/font_test.tsx',
  'app/examples/shader_test.tsx',
  'app/examples/spinning_wheel.tsx',
  'app/examples/vfx_showcase.tsx',
  
  // Core files
  'app/lib/game-engine/EntityManager.ts',
  'app/lib/game-engine/__tests__/EntityManager.hierarchy.test.ts',
  'app/lib/game-engine/systems/Match3GameSystem.ts',
  'app/lib/game-engine/rules/actions/SetEntitySizeActionExecutor.ts',
  'app/lib/game-engine/rules/utils.ts',
  'app/lib/game-engine/rules/triggers/InputTriggerEvaluator.ts',
  'app/lib/assets/AssetManifest.ts',
  
  // Editor components
  'components/editor/AssetAlignment/AlignmentPreviewCanvas.tsx',
  'components/editor/AssetAlignment/PrimitivePreview.tsx',
  'components/editor/AssetGallery/TemplateAssetCard.tsx',
  'components/editor/EditorProvider.tsx',
  'components/editor/InteractionLayer.tsx',
  'components/editor/panels/AssetsPanel.tsx',
  'components/editor/panels/LayersPanel.tsx',
  'components/editor/panels/PropertiesPanel.tsx',
  'components/editor/AIGenerateModal.tsx',
  
  // Shared
  'shared/src/systems/dynamic-collider/index.ts',
  'shared/src/expressions/evaluator.ts',
  
  // API
  'api/src/ai/templates/fallingCatcher.ts',
  'api/src/ai/templates/hillRacer.ts',
  'api/src/ai/templates/match3.ts',
  'api/src/ai/templates/stackAttack.ts',
  'api/src/ai/templates/ballLauncher.ts',
  'api/src/ai/templates/jumpyCat.ts',
  'api/src/ai/templates/tetris.ts',
  'api/src/ai/__tests__/generator.test.ts',
  'api/src/ai/__tests__/validator.test.ts',
  'api/src/ai/schemas.ts',
  'api/src/trpc/routes/games.test.ts',
  'api/src/trpc/routes/asset-system.ts',
];

function convertFile(filePath) {
  const fullPath = path.join('/Users/hassoncs/Workspaces/Personal/slopcade', filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️  Skipping (not found): ${filePath}`);
    return;
  }
  
  let content = fs.readFileSync(fullPath, 'utf8');
  const originalContent = content;
  
  // Convert sprite: -> visual:
  content = content.replace(/sprite:/g, 'visual:');
  content = content.replace(/\.sprite/g, '.visual');
  content = content.replace(/entity\.sprite/g, 'entity.visual');
  content = content.replace(/template\.sprite/g, 'template.visual');
  content = content.replace(/definition\.sprite/g, 'definition.visual');
  content = content.replace(/childDef\.sprite/g, 'childDef.visual');
  
  // Convert SpriteComponent -> VisualComponent
  content = content.replace(/SpriteComponent/g, 'VisualComponent');
  
  // Convert physics: { shape:, width:, height:, ... } 
  // To: physics: { ... } + collider: { shape:, width:, height:, ... }
  // This is complex - we'll use a regex approach
  
  // Pattern to match physics with shape properties
  const physicsPattern = /physics:\s*\{([^}]*)(shape:\s*["']([^"']+)["'])([^}]*)\}/g;
  
  content = content.replace(physicsPattern, (match, before, shapeLine, shapeValue, after) => {
    // Extract properties from the physics block
    const props = {};
    const propMatches = match.match(/(\w+):\s*([^,}]+)/g) || [];
    
    propMatches.forEach(prop => {
      const [key, ...valueParts] = prop.split(':');
      const value = valueParts.join(':').trim();
      props[key.trim()] = value;
    });
    
    // Separate physics properties from collider properties
    const physicsProps = [];
    const colliderProps = [`shape: '${shapeValue}'`];
    
    Object.entries(props).forEach(([key, value]) => {
      if (key === 'bodyType' || key === 'density' || key === 'mass' || 
          key === 'gravityScale' || key === 'linearDamping' || 
          key === 'angularDamping' || key === 'fixedRotation' || 
          key === 'ccd' || key === 'initialVelocity' || 
          key === 'initialAngularVelocity' || key === 'bullet') {
        physicsProps.push(`${key}: ${value}`);
      } else if (key !== 'shape') {
        colliderProps.push(`${key}: ${value}`);
      }
    });
    
    const physicsStr = physicsProps.length > 0 
      ? `physics: { ${physicsProps.join(', ')} }` 
      : 'physics: { bodyType: "dynamic" }';
    
    const colliderStr = `collider: { ${colliderProps.join(', ')} }`;
    
    return `${physicsStr},\n      ${colliderStr}`;
  });
  
  // Also handle zone templates with sprite
  content = content.replace(
    /(type:\s*["']zone["'][^}]*zone:[^}]*\}[^}]*?)sprite:/g,
    '$1visual:'
  );
  
  if (content !== originalContent) {
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log(`✅ Converted: ${filePath}`);
  } else {
    console.log(`⏭️  No changes: ${filePath}`);
  }
}

console.log('🚀 Starting bulk conversion...\n');

FILES_TO_CONVERT.forEach(convertFile);

console.log('\n✨ Conversion complete!');
console.log('Next steps:');
console.log('1. Run TypeScript check: npx tsc --noEmit');
console.log('2. Fix any remaining issues manually');
console.log('3. Regenerate registry: pnpm generate:registry');
console.log('4. Test the games');
