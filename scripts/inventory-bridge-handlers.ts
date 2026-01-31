import * as fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface HandlerInfo {
  name: string;
  tsMethod: string;
  lineNumber: number;
  targetModule: string;
}

function categorizeHandler(handlerName: string): string {
  const name = handlerName.toLowerCase();

  if (name.includes('velocity') || name.includes('impulse') || name.includes('force') || name.includes('torque')) {
    return 'PhysicsController';
  }

  if (name.includes('spawn') || name.includes('destroy_entity') || name.includes('entity_destroyed')) {
    return 'EntityManager';
  }

  if (name.includes('transform') || name.includes('position') || name.includes('rotation') || name.includes('scale')) {
    return 'TransformSystem';
  }

  if (name.includes('image') || name.includes('opacity') || name.includes('visual') || name.includes('texture') || name.includes('atlas')) {
    return 'VisualRenderer';
  }

  if (name.includes('joint') || name.includes('motor') || name.includes('mouse_target')) {
    return 'JointManager';
  }

  if (name.includes('collision') || name.includes('sensor') || name.includes('input_event') || name.includes('on_') || name.includes('input')) {
    return 'EventEmitter';
  }

  if (name.includes('sync') || name.includes('watch') || name.includes('tracked')) {
    return 'SyncSystem';
  }

  if (name.includes('query') || name.includes('raycast') || name.includes('aabb')) {
    return 'QuerySystem';
  }

  if (name.includes('camera')) {
    return 'CameraController';
  }

  if (name.includes('ui') || name.includes('sound') || name.includes('particle') || name.includes('button')) {
    return 'UIManager';
  }

  if (name.includes('3d') || name.includes('viewport')) {
    return 'Viewport3D';
  }

  if (name.includes('screenshot') || name.includes('world_info')) {
    return 'DebugInfo';
  }

  if (name.includes('create_body') || name.includes('add_fixture') || name.includes('set_sensor') || name.includes('user_data') || name.includes('body')) {
    return 'BodyAPI';
  }

  if (name.includes('load_game') || name.includes('clear_game') || name.includes('inspect_mode') || name.includes('pause_physics') || name.includes('resume_physics')) {
    return 'UIManager';
  }

  return 'UIManager';
}

function godotToTsMethod(godotMethod: string): string {
  let tsMethod = godotMethod.replace(/^_js_/, '');
  tsMethod = tsMethod.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
  tsMethod = tsMethod.replace(/3d/g, '3D');
  return tsMethod;
}

function parseGameBridge(filePath: string): HandlerInfo[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const handlers: HandlerInfo[] = [];

  const funcPattern = /^func (_js_\w+)\(_?args: Array\)/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(funcPattern);
    
    if (match) {
      const godotName = match[1];
      const lineNumber = i + 1;
      const tsMethod = godotToTsMethod(godotName);
      const targetModule = categorizeHandler(godotName);

      handlers.push({
        name: godotName,
        tsMethod,
        lineNumber,
        targetModule
      });
    }
  }

  return handlers;
}

function main() {
  const godotProjectPath = join(__dirname, '..', 'godot_project');
  const gameBridgePath = join(godotProjectPath, 'scripts', 'GameBridge.gd');
  const outputPath = join(__dirname, '..', '.sisyphus', 'handler-inventory.json');

  if (!fs.existsSync(gameBridgePath)) {
    console.error(`Error: GameBridge.gd not found at ${gameBridgePath}`);
    process.exit(1);
  }

  const handlers = parseGameBridge(gameBridgePath);

  handlers.sort((a, b) => a.lineNumber - b.lineNumber);

  fs.writeFileSync(outputPath, JSON.stringify(handlers, null, 2));

  console.log(`Extracted ${handlers.length} handlers from GameBridge.gd`);
  console.log(`Output written to ${outputPath}`);
  
  const moduleCounts: Record<string, number> = {};
  handlers.forEach(h => {
    moduleCounts[h.targetModule] = (moduleCounts[h.targetModule] || 0) + 1;
  });
  
  console.log('\nHandlers by module:');
  Object.entries(moduleCounts).forEach(([module, count]) => {
    console.log(`  ${module}: ${count}`);
  });
}

main();
