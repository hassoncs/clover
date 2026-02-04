import { execSync } from 'child_process';
import { existsSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname, basename } from 'path';
import type { GameDefinition } from '@slopcade/shared';

export interface CompileTypeScriptResult {
  success: boolean;
  gameDefinition: GameDefinition | null;
  metadata: { title: string; description?: string } | null;
  error?: string;
}

export function compileTypeScriptGame(gamePath: string): CompileTypeScriptResult {
  if (!existsSync(gamePath)) {
    return {
      success: false,
      gameDefinition: null,
      metadata: null,
      error: `Game file not found: ${gamePath}`,
    };
  }

  try {
    const script = `
      import game from '${gamePath}';
      import { metadata } from '${gamePath}';
      console.log(JSON.stringify({ game, metadata: metadata || null }));
    `;

    const result = execSync(`npx tsx -e "${script.replace(/"/g, '\\"').replace(/\n/g, ' ')}"`, {
      encoding: 'utf-8',
      timeout: 30000,
      cwd: dirname(gamePath),
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    const parsed = JSON.parse(result.trim()) as {
      game: GameDefinition;
      metadata: { title: string; description?: string } | null;
    };

    return {
      success: true,
      gameDefinition: parsed.game,
      metadata: parsed.metadata,
    };
  } catch (err) {
    const error = err as Error & { stderr?: Buffer };
    const stderr = error.stderr?.toString() || error.message;
    return {
      success: false,
      gameDefinition: null,
      metadata: null,
      error: `Failed to compile TypeScript game: ${stderr}`,
    };
  }
}

export interface BundleOutputFiles {
  'manifest.json': Record<string, unknown>;
  'constants.json': Record<string, unknown>;
  'templates/all.json': unknown[];
  'entities/initial.json': unknown[];
  'rules/gameplay.json': unknown[];
}

export function gameDefinitionToBundleFiles(gameDef: GameDefinition): BundleOutputFiles {
  const templates = gameDef.templates || {};
  const templateArray = Object.entries(templates).map(([templateId, template]) => {
    const { id: _existingId, ...rest } = template as unknown as Record<string, unknown>;
    return { id: templateId, ...rest };
  });

  return {
    'manifest.json': {
      name: gameDef.metadata?.id || 'unnamed-game',
      version: gameDef.metadata?.version || '1.0.0',
      title: gameDef.metadata?.title,
      description: gameDef.metadata?.description,
      instructions: gameDef.metadata?.instructions,
      world: gameDef.world,
      background: gameDef.background,
      camera: gameDef.camera,
      ui: gameDef.ui,
      variables: gameDef.variables,
    },
    'constants.json': gameDef.constants || {},
    'templates/all.json': templateArray,
    'entities/initial.json': gameDef.entities || [],
    'rules/gameplay.json': gameDef.rules || [],
  };
}

export function writeBundleToDirectory(bundlePath: string, files: BundleOutputFiles): void {
  const dirs = ['templates', 'entities', 'rules'];
  for (const dir of dirs) {
    const dirPath = join(bundlePath, dir);
    if (!existsSync(dirPath)) {
      mkdirSync(dirPath, { recursive: true });
    }
  }

  for (const [filePath, content] of Object.entries(files)) {
    const fullPath = join(bundlePath, filePath);
    const dir = dirname(fullPath);

    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    writeFileSync(fullPath, JSON.stringify(content, null, 2));
  }
}

export function convertTypeScriptToBundle(
  tsGamePath: string,
  outputBundlePath: string
): { success: boolean; error?: string } {
  const result = compileTypeScriptGame(tsGamePath);

  if (!result.success || !result.gameDefinition) {
    return { success: false, error: result.error };
  }

  const bundleFiles = gameDefinitionToBundleFiles(result.gameDefinition);
  
  if (!existsSync(outputBundlePath)) {
    mkdirSync(outputBundlePath, { recursive: true });
  }

  writeBundleToDirectory(outputBundlePath, bundleFiles);

  return { success: true };
}
