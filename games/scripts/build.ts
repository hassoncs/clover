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

interface AssetManifestEntry {
  file: string;
  r2Key: string;
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
): { manifest: Record<string, AssetManifestEntry>; totalBytes: number } {
  const manifest: Record<string, AssetManifestEntry> = {};
  let totalBytes = 0;

  for (const pack of packs) {
    for (const [templateId, assetEntry] of Object.entries(pack.assets)) {
      const destRelative = `packs/${pack.name}/${assetEntry.file}`;
      const destPath = join(gameOutputDir, destRelative);

      mkdirSync(dirname(destPath), { recursive: true });
      copyFileSync(assetEntry.fullPath, destPath);
      totalBytes += statSync(assetEntry.fullPath).size;

      const r2Key = `${pack.packId}/${templateId}.png`;
      manifest[`${pack.name}/${templateId}`] = {
        file: destRelative,
        r2Key,
      };
    }
  }

  if (Object.keys(manifest).length > 0) {
    writeFileSync(
      join(gameOutputDir, 'asset-manifest.json'),
      JSON.stringify(manifest, null, 2),
    );
  }

  return { manifest, totalBytes };
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
  const gameJsonLines: string[] = [];
  const assetManifestLines: string[] = [];
  const assetLines: string[] = [];

  for (const game of embeddedGames) {
    gameJsonLines.push(
      `  '${game.gameId}': require('@/assets/embedded-games/${game.gameId}/game.json'),`,
    );

    if (game.assetCount > 0) {
      assetManifestLines.push(
        `  '${game.gameId}': require('@/assets/embedded-games/${game.gameId}/asset-manifest.json'),`,
      );

      const manifestPath = join(EMBED_DIR, game.gameId, 'asset-manifest.json');
      if (existsSync(manifestPath)) {
        const manifest: Record<string, AssetManifestEntry> = JSON.parse(
          readFileSync(manifestPath, 'utf-8'),
        );
        for (const [, entry] of Object.entries(manifest)) {
          assetLines.push(
            `  '${game.gameId}/${entry.file}': require('@/assets/embedded-games/${game.gameId}/${entry.file}'),`,
          );
        }
      }
    }
  }

  const content = `// AUTO-GENERATED - DO NOT EDIT
// Generated by games/scripts/build.ts

export const EMBEDDED_MANIFEST = require('@/assets/embedded-games/manifest.json');

export const EMBEDDED_GAME_JSONS: Record<string, unknown> = {
${gameJsonLines.join('\n')}
};

export const EMBEDDED_ASSET_MANIFESTS: Record<string, Record<string, { file: string; r2Key: string }>> = {
${assetManifestLines.join('\n')}
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
        const { manifest, totalBytes } = copyPackAssets(packs, gameEmbedDir);
        assetCount = Object.keys(manifest).length;
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

      // Re-serialize with resolved activePackId
      const resolvedJson = JSON.stringify({
        id: entry.id,
        title: entry.title,
        description: entry.description,
        definition: entry.definition,
      }, null, 2);
      writeFileSync(join(DIST_DIR, `${id}.json`), resolvedJson);
      writeFileSync(join(gameEmbedDir, 'game.json'), resolvedJson);

      const gameTotalBytes = Buffer.byteLength(resolvedJson) + assetBytes;
      const packEntries = packs.map(p => ({ name: p.name, packId: p.packId, assetCount: Object.keys(p.assets).length }));
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
