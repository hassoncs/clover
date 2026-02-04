#!/usr/bin/env tsx
import { createServer } from 'http';
import { readdir, readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIST_DIR = join(__dirname, '..', 'dist');
const COMPILED_DIR = join(__dirname, '..', 'compiled');
const PORT = 3847;

interface GameJson {
  id: string;
  title: string;
  description: string;
  definition: unknown;
}

async function loadGame(id: string): Promise<GameJson | null> {
  const filePath = join(DIST_DIR, `${id}.json`);
  if (!existsSync(filePath)) return null;
  const content = await readFile(filePath, 'utf-8');
  return JSON.parse(content);
}

async function listGames(): Promise<GameJson[]> {
  if (!existsSync(DIST_DIR)) {
    console.warn(`[games-server] dist dir not found: ${DIST_DIR}`);
    return [];
  }
  
  const files = await readdir(DIST_DIR);
  const games: GameJson[] = [];
  
  for (const file of files) {
    if (!file.endsWith('.json') || file === 'manifest.json') continue;
    const id = file.replace('.json', '');
    const game = await loadGame(id);
    if (game) games.push(game);
  }
  
  return games;
}

async function loadPackManifest(packName: string): Promise<any | null> {
  const [gameId] = packName.split('-');
  const COMPILED_DIR = join(__dirname, '..', 'compiled');
  const generatedDir = join(COMPILED_DIR, gameId, 'generated', gameId);
  
  if (!existsSync(generatedDir)) return null;
  
  const packDirs = await readdir(generatedDir, { withFileTypes: true });
  const packDir = packDirs.find(d => d.isDirectory());
  
  if (!packDir) return null;
  
  const manifestPath = join(generatedDir, packDir.name, 'manifest.json');
  if (!existsSync(manifestPath)) return null;
  
  const manifestJson = await readFile(manifestPath, 'utf-8');
  const manifest = JSON.parse(manifestJson);
  
  const entries = Object.entries(manifest).map(([templateId, entry]: [string, any]) => ({
    templateId,
    r2Key: entry.r2Key,
    imageUrl: null,
    placement: null,
  }));
  
  return {
    id: packName,
    name: packName,
    baseGameId: gameId,
    description: `Local pack for ${gameId}`,
    entries,
  };
}

const server = createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Content-Type', 'application/json');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  const url = new URL(req.url || '/', `http://localhost:${PORT}`);
  
  if (url.pathname === '/games') {
    const games = await listGames();
    res.writeHead(200);
    res.end(JSON.stringify(games));
    return;
  }
  
  const gameMatch = url.pathname.match(/^\/games\/(.+)$/);
  if (gameMatch) {
    const id = gameMatch[1];
    const game = await loadGame(id);
    if (game) {
      res.writeHead(200);
      res.end(JSON.stringify(game));
    } else {
      res.writeHead(404);
      res.end(JSON.stringify({ error: 'Game not found' }));
    }
    return;
  }
  
  const packMatch = url.pathname.match(/^\/packs\/(.+)$/);
  if (packMatch) {
    const packName = packMatch[1];
    const pack = await loadPackManifest(packName);
    if (pack) {
      res.writeHead(200);
      res.end(JSON.stringify(pack));
    } else {
      res.writeHead(404);
      res.end(JSON.stringify({ error: 'Pack not found' }));
    }
    return;
  }
  
  const assetMatch = url.pathname.match(/^\/assets\/(.+)$/);
  if (assetMatch) {
    const assetPath = assetMatch[1];
    const filePath = join(COMPILED_DIR, assetPath);
    const resolvedPath = join(filePath);
    
    if (!resolvedPath.startsWith(COMPILED_DIR)) {
      res.writeHead(403);
      res.end(JSON.stringify({ error: 'Forbidden' }));
      return;
    }
    
    if (existsSync(resolvedPath)) {
      const fileBuffer = await readFile(resolvedPath);
      const ext = filePath.split('.').pop()?.toLowerCase();
      const contentType = ext === 'png' ? 'image/png' :
                         ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' :
                         ext === 'webp' ? 'image/webp' :
                         'application/octet-stream';
      
      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      res.writeHead(200);
      res.end(fileBuffer);
    } else {
      res.writeHead(404);
      res.end(JSON.stringify({ error: 'Asset not found' }));
    }
    return;
  }
  
  if (url.pathname === '/health') {
    res.writeHead(200);
    res.end(JSON.stringify({ status: 'ok', gamesDir: DIST_DIR }));
    return;
  }
  
  res.writeHead(404);
  res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(PORT, () => {
  console.log(`[games-server] Running on http://localhost:${PORT}`);
  console.log(`[games-server] Serving games from: ${DIST_DIR}`);
});
