#!/usr/bin/env tsx
import {
  writeFileSync, readFileSync, mkdirSync, existsSync, rmSync,
  readdirSync, copyFileSync, statSync, symlinkSync, unlinkSync, lstatSync,
} from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { build as esbuild } from 'esbuild';
import { GAME_IDS, loadGame } from '../src/registry';

const __dirname = dirname(fileURLToPath(import.meta.url));
const GAMES_ROOT = join(__dirname, '..');
const APP_ROOT = join(GAMES_ROOT, '..', 'app');
const COMPILED_DIR = join(GAMES_ROOT, 'compiled');
const DIST_DIR = join(GAMES_ROOT, 'dist');
const EMBED_DIR = join(APP_ROOT, 'assets', 'embedded-games');
const REGISTRY_PATH = join(APP_ROOT, 'lib', 'offline', 'embedded-games-registry.ts');
const PUBLIC_GAMES = join(APP_ROOT, 'public', 'games');
const PUBLIC_SLOPCADE_GAMES = join(APP_ROOT, 'public', 'slopcade', 'games');

interface PackManifest {
  version: number;
  packId: string;
  name: string;
  assets: Record<string, { file: string }>;
}

interface PackInfo {
  name: string;
  packId: string;
  manifestPath: string;
  assets: Record<string, { file: string; fullPath: string }>;
}

interface EmbeddedGameEntry {
  gameId: string;
  packs: Array<{ name: string; packId: string; assetCount: number }>;
  assetCount: number;
  totalBytes: number;
}

interface BuildResult {
  id: string;
  success: boolean;
  assetCount: number;
  totalBytes: number;
  hasScript: boolean;
  error?: string;
}

async function bundleGameScript(gameId: string): Promise<string | undefined> {
  const scriptPath = join(COMPILED_DIR, gameId, 'script.ts');
  if (!existsSync(scriptPath)) return undefined;

  try {
    const result = await esbuild({
      entryPoints: [scriptPath],
      bundle: true,
      format: 'cjs',
      platform: 'browser',
      target: 'es2020',
      write: false,
      minify: false,
      treeShaking: true,
    });

    return result.outputFiles[0].text;
  } catch (error) {
    console.error(`  ⚠ Failed to bundle script for ${gameId}:`, error);
    return undefined;
  }
}


function discoverPacks(gameId: string): PackInfo[] {
  const packsDir = join(COMPILED_DIR, gameId, 'packs');
  if (!existsSync(packsDir)) return [];

  const packs: PackInfo[] = [];
  for (const entry of readdirSync(packsDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;

    const manifestPath = join(packsDir, entry.name, 'manifest.json');
    if (!existsSync(manifestPath)) continue;

    const manifest: PackManifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));
    const packDir = join(packsDir, entry.name);

    const assets: Record<string, { file: string; fullPath: string }> = {};
    for (const [templateId, assetEntry] of Object.entries(manifest.assets)) {
      assets[templateId] = {
        file: assetEntry.file,
        fullPath: join(packDir, assetEntry.file),
      };
    }

    packs.push({
      name: manifest.name,
      packId: manifest.packId,
      manifestPath,
      assets,
    });
  }

  return packs;
}

function copyPackAssets(
  packs: PackInfo[],
  gameOutputDir: string,
): { totalBytes: number } {
  let totalBytes = 0;

  for (const pack of packs) {
    const packDir = join(gameOutputDir, 'packs', pack.name);
    mkdirSync(packDir, { recursive: true });

    // Copy pack manifest.json
    copyFileSync(pack.manifestPath, join(packDir, 'manifest.json'));

    for (const [, assetEntry] of Object.entries(pack.assets)) {
      const destPath = join(packDir, assetEntry.file);

      mkdirSync(dirname(destPath), { recursive: true });
      copyFileSync(assetEntry.fullPath, destPath);
      totalBytes += statSync(assetEntry.fullPath).size;
    }
  }

  return { totalBytes };
}

function createSymlink(target: string, linkPath: string): void {
  try {
    const stats = lstatSync(linkPath);
    if (stats) unlinkSync(linkPath);
  } catch {}
  try {
    symlinkSync(target, linkPath, 'dir');
  } catch (err) {
    console.error(`  ⚠ Symlink failed: ${linkPath} -> ${target}`, err);
  }
}

function setupSymlinks(embeddedGames: EmbeddedGameEntry[]): void {
  mkdirSync(PUBLIC_GAMES, { recursive: true });
  mkdirSync(PUBLIC_SLOPCADE_GAMES, { recursive: true });

  for (const game of embeddedGames) {
    const source = join(EMBED_DIR, game.gameId);
    if (!existsSync(source)) continue;
    createSymlink(source, join(PUBLIC_GAMES, game.gameId));
    createSymlink(source, join(PUBLIC_SLOPCADE_GAMES, game.gameId));
  }
  console.log(`✓ Symlinks created in app/public/games/ and app/public/slopcade/games/`);
}

function generateEmbeddedRegistry(embeddedGames: EmbeddedGameEntry[]): void {
  const definitionLines: string[] = [];
  const metadataLines: string[] = [];
  const packManifestLines: string[] = [];
  const assetLines: string[] = [];

  for (const game of embeddedGames) {
    definitionLines.push(
      `  '${game.gameId}': require('@/assets/embedded-games/${game.gameId}/definition.json'),`,
    );
    metadataLines.push(
      `  '${game.gameId}': require('@/assets/embedded-games/${game.gameId}/metadata.json'),`,
    );

    if (game.packs.length > 0) {
      const packEntries = game.packs.map(p =>
        `    '${p.name}': require('@/assets/embedded-games/${game.gameId}/packs/${p.name}/manifest.json'),`
      );
      packManifestLines.push(`  '${game.gameId}': {\n${packEntries.join('\n')}\n  },`);

      for (const pack of game.packs) {
        const manifestPath = join(EMBED_DIR, game.gameId, 'packs', pack.name, 'manifest.json');
        if (existsSync(manifestPath)) {
          const manifest: PackManifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));
          for (const [, assetEntry] of Object.entries(manifest.assets)) {
            assetLines.push(
              `  '${game.gameId}/packs/${pack.name}/${assetEntry.file}': require('@/assets/embedded-games/${game.gameId}/packs/${pack.name}/${assetEntry.file}'),`,
            );
          }
        }
      }
    }
  }

  const content = `// AUTO-GENERATED - DO NOT EDIT
// Generated by games/scripts/build.ts

export const EMBEDDED_MANIFEST = require('@/assets/embedded-games/manifest.json');

export const EMBEDDED_DEFINITIONS: Record<string, unknown> = {
${definitionLines.join('\n')}
};

export const EMBEDDED_METADATA: Record<string, unknown> = {
${metadataLines.join('\n')}
};

export const EMBEDDED_PACK_MANIFESTS: Record<string, Record<string, unknown>> = {
${packManifestLines.join('\n')}
};

export const EMBEDDED_ASSETS: Record<string, number> = {
${assetLines.join('\n')}
};
`;

  mkdirSync(dirname(REGISTRY_PATH), { recursive: true });
  writeFileSync(REGISTRY_PATH, content);
  console.log(`✓ Generated embedded-games-registry.ts`);
}

async function build(): Promise<void> {
  console.log('Building games...\n');

  mkdirSync(DIST_DIR, { recursive: true });

  if (existsSync(EMBED_DIR)) {
    rmSync(EMBED_DIR, { recursive: true });
  }
  mkdirSync(EMBED_DIR, { recursive: true });

  const results: BuildResult[] = [];
  const embeddedGames: EmbeddedGameEntry[] = [];

  for (const id of GAME_IDS) {
    try {
      const entry = await loadGame(id);
      if (!entry) {
        results.push({ id, success: false, error: 'Failed to load game', assetCount: 0, totalBytes: 0, hasScript: false });
        continue;
      }

      const scriptCode = await bundleGameScript(id);
      if (scriptCode) {
        entry.definition.script = scriptCode;
      }

      const gameEmbedDir = join(EMBED_DIR, id);
      mkdirSync(gameEmbedDir, { recursive: true });

      // Discover and copy pack assets
      let assetCount = 0;
      let assetBytes = 0;
      const packs = discoverPacks(id);
      if (packs.length > 0) {
        const { totalBytes } = copyPackAssets(packs, gameEmbedDir);
        assetCount = packs.reduce((sum, p) => sum + Object.keys(p.assets).length, 0);
        assetBytes = totalBytes;
      }

      // Resolve activePackId: human-readable name → UUID
      const definition = entry.definition as { assetSystem?: { activePackId?: string } };
      if (definition.assetSystem?.activePackId && packs.length > 0) {
        const activeName = definition.assetSystem.activePackId;
        const matchingPack = packs.find(p => p.name === activeName);
        if (matchingPack) {
          definition.assetSystem.activePackId = matchingPack.packId;
        }
      }

      // Write definition.json (raw GameDefinition)
      const definitionJson = JSON.stringify(entry.definition, null, 2);
      writeFileSync(join(gameEmbedDir, 'definition.json'), definitionJson);

      // Write metadata.json (lightweight summary)
      const packEntries = packs.map(p => ({ name: p.name, packId: p.packId, assetCount: Object.keys(p.assets).length }));
      const metadata = {
        id: entry.id,
        title: entry.title,
        description: entry.description,
        version: (entry.definition.metadata as { version?: string })?.version ?? '1.0.0',
        thumbnailUrl: null,
        packs: packEntries,
        activePackId: (definition.assetSystem?.activePackId) ?? null,
        updatedAt: Date.now(),
      };
      writeFileSync(join(gameEmbedDir, 'metadata.json'), JSON.stringify(metadata, null, 2));

      // Write dist file (definition.json per game)
      writeFileSync(join(DIST_DIR, `${id}.json`), definitionJson);

      const gameTotalBytes = Buffer.byteLength(definitionJson) + assetBytes;
      embeddedGames.push({ gameId: id, packs: packEntries, assetCount, totalBytes: gameTotalBytes });
      results.push({ id, success: true, assetCount, totalBytes: gameTotalBytes, hasScript: !!scriptCode });

      const parts = [id];
      if (scriptCode) parts.push('+ script');
      if (assetCount > 0) parts.push(`${assetCount} assets`);
      console.log(`✓ ${parts.join(' | ')}`);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      results.push({ id, success: false, error: errorMsg, assetCount: 0, totalBytes: 0, hasScript: false });
      console.error(`✗ ${id}: ${errorMsg}`);
    }
  }

  // Write dist manifest
  writeFileSync(join(DIST_DIR, 'manifest.json'), JSON.stringify({
    version: 1,
    buildTime: new Date().toISOString(),
    games: results.filter(r => r.success).map(r => ({ id: r.id, file: `${r.id}.json` })),
  }, null, 2));

  // Write embedded manifest
  const totalBytes = embeddedGames.reduce((sum, g) => sum + g.totalBytes, 0);
  writeFileSync(join(EMBED_DIR, 'manifest.json'), JSON.stringify({
    version: 1,
    buildTime: new Date().toISOString(),
    totalGames: embeddedGames.length,
    totalBytes,
    games: embeddedGames,
  }, null, 2));

  // Generate the app's TypeScript registry
  generateEmbeddedRegistry(embeddedGames);

  // Create symlinks for web development
  setupSymlinks(embeddedGames);

  const succeeded = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  const totalAssets = results.reduce((sum, r) => sum + r.assetCount, 0);

  console.log(`\nBuild complete:`);
  console.log(`  Games: ${succeeded} succeeded, ${failed} failed`);
  console.log(`  Assets: ${totalAssets} files`);
  console.log(`  Size: ${(totalBytes / 1024 / 1024).toFixed(2)} MB`);

  if (failed > 0) {
    process.exit(1);
  }
}

build().catch(err => {
  console.error('Build failed:', err);
  process.exit(1);
});
