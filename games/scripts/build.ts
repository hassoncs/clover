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

interface AssetManifestEntry {
  file: string;
  r2Key: string;
}

interface EmbeddedGameEntry {
  gameId: string;
  packId: string;
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

function findPngFiles(dir: string, basePath = ''): string[] {
  if (!existsSync(dir)) return [];
  const result: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const relPath = basePath ? `${basePath}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      result.push(...findPngFiles(join(dir, entry.name), relPath));
    } else if (entry.isFile() && entry.name.endsWith('.png')) {
      result.push(relPath);
    }
  }
  return result;
}

function discoverAssets(gameId: string): { files: string[]; sourceDir: string } | null {
  const assetsDir = join(COMPILED_DIR, gameId, 'assets');
  if (existsSync(assetsDir)) {
    const files = findPngFiles(assetsDir);
    if (files.length > 0) return { files, sourceDir: assetsDir };
  }

  const generatedDir = join(COMPILED_DIR, gameId, 'generated');
  if (existsSync(generatedDir)) {
    const files = findPngFiles(generatedDir);
    if (files.length > 0) return { files, sourceDir: generatedDir };
  }

  return null;
}

function copyGameAssets(
  gameId: string,
  assetInfo: { files: string[]; sourceDir: string },
  gameOutputDir: string,
): { manifest: Record<string, AssetManifestEntry>; totalBytes: number } {
  const assetsOutputDir = join(gameOutputDir, 'assets');
  const manifest: Record<string, AssetManifestEntry> = {};
  let totalBytes = 0;

  for (const file of assetInfo.files) {
    const srcPath = join(assetInfo.sourceDir, file);
    const destPath = join(assetsOutputDir, file);

    mkdirSync(dirname(destPath), { recursive: true });
    copyFileSync(srcPath, destPath);
    totalBytes += statSync(srcPath).size;

    manifest[file] = {
      file: `assets/${file}`,
      r2Key: `generated/${gameId}/${file}`,
    };
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
          const filename = entry.file.replace('assets/', '');
          assetLines.push(
            `  '${game.gameId}/${filename}': require('@/assets/embedded-games/${game.gameId}/assets/${filename}'),`,
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

      const json = JSON.stringify({
        id: entry.id,
        title: entry.title,
        description: entry.description,
        definition: entry.definition,
      }, null, 2);

      // Write to games/dist/ (build cache)
      writeFileSync(join(DIST_DIR, `${id}.json`), json);

      // Write to app/assets/embedded-games/{id}/
      const gameEmbedDir = join(EMBED_DIR, id);
      mkdirSync(gameEmbedDir, { recursive: true });
      writeFileSync(join(gameEmbedDir, 'game.json'), json);

      // Discover and copy assets
      let assetCount = 0;
      let assetBytes = 0;
      const assetInfo = discoverAssets(id);
      if (assetInfo) {
        const { manifest, totalBytes } = copyGameAssets(id, assetInfo, gameEmbedDir);
        assetCount = Object.keys(manifest).length;
        assetBytes = totalBytes;
      }

      const gameTotalBytes = Buffer.byteLength(json) + assetBytes;
      embeddedGames.push({ gameId: id, packId: 'embedded', assetCount, totalBytes: gameTotalBytes });
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
