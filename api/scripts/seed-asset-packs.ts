import { execSync } from 'child_process';
import { writeFileSync, unlinkSync } from 'fs';
import { resolve } from 'path';
import { randomUUID } from 'crypto';

const now = Date.now();

// Game definitions
const games = [
  { id: randomUUID(), title: 'Ball Sort', gameId: 'ballSort' },
  { id: randomUUID(), title: 'Flappy Bird', gameId: 'flappyBird' },
  { id: randomUUID(), title: 'Slopeggle', gameId: 'slopeggle' },
  { id: randomUUID(), title: 'Breakout Bouncer', gameId: 'breakoutBouncer' },
  { id: randomUUID(), title: 'Breakout Scripted', gameId: 'breakoutScripted' },
  { id: randomUUID(), title: 'Gem Crush', gameId: 'gemCrush' },
];

// Template definitions per game with R2 prefixes
const gameTemplates: Record<string, { r2Prefix: string; templates: string[] }> = {
  ballSort: {
    r2Prefix: 'ballSort',
    templates: [
      'tube',
      'tubeWall',
      'tubeBottom',
      'ball0',
      'ball1',
      'ball2',
      'ball3',
      'ball4',
      'ball5',
      'ball6',
      'ball7',
      'heldBallIndicator',
      'background',
    ],
  },
  flappyBird: {
    r2Prefix: 'flappyBird',
    templates: ['bird', 'pipeTop', 'pipeBottom', 'ground', 'ceiling', 'background'],
  },
  slopeggle: {
    r2Prefix: 'slopeggle',
    templates: [
      'ball',
      'bluePeg',
      'orangePeg',
      'cannon',
      'cannonBase',
      'bucket',
      'portalA',
      'portalB',
      'background',
    ],
  },
  breakoutBouncer: {
    r2Prefix: 'breakout-bouncer',
    templates: ['ball', 'paddle', 'brickRed', 'brickYellow', 'brickGreen', 'brickBlue', 'background'],
  },
  breakoutScripted: {
    r2Prefix: 'breakout-bouncer', // Shares assets with breakoutBouncer
    templates: ['ball', 'paddle', 'brickRed', 'brickYellow', 'brickGreen', 'brickBlue', 'background'],
  },
  gemCrush: {
    r2Prefix: 'gem-crush',
    templates: ['background'], // Only has background, gems use rect visuals
  },
};

// Build SQL statements
let gamesSql = '';
let assetsSql = '';
let packsSql = '';
let entriesSql = '';

for (const game of games) {
  const { id: gameId, title, gameId: gameKey } = game;
  const config = gameTemplates[gameKey];

  if (!config) {
    console.warn(`⚠️  No template config found for ${gameKey}, skipping`);
    continue;
  }

  // 1. Insert game
  gamesSql += `INSERT OR IGNORE INTO games (id, title, definition, created_at, updated_at) VALUES ('${gameId}', '${title}', '{}', ${now}, ${now});\n`;

  // 2. Create asset pack
  const packId = randomUUID();
  const packName = `${gameKey}-default`;
  packsSql += `INSERT OR IGNORE INTO asset_packs (id, base_game_id, name, is_complete, created_at) VALUES ('${packId}', '${gameId}', '${packName}', 1, ${now});\n`;

  // 3. Create assets and entries for each template
  for (const templateId of config.templates) {
    const assetId = randomUUID();
    const imageUrl = `https://slopcade-api.hassoncs.workers.dev/assets/generated/${config.r2Prefix}/${templateId}.png`;

    // Insert asset
    assetsSql += `INSERT OR IGNORE INTO game_assets (id, owner_game_id, source, image_url, created_at) VALUES ('${assetId}', '${gameId}', 'generated', '${imageUrl}', ${now});\n`;

    // Insert pack entry
    const entryId = randomUUID();
    entriesSql += `INSERT OR IGNORE INTO asset_pack_entries (id, pack_id, template_id, asset_id) VALUES ('${entryId}', '${packId}', '${templateId}', '${assetId}');\n`;
  }
}

const sql = `
-- Seed asset packs for test games
-- Generated: ${new Date().toISOString()}

BEGIN TRANSACTION;

-- 1. Games
${gamesSql}

-- 2. Asset packs
${packsSql}

-- 3. Game assets
${assetsSql}

-- 4. Asset pack entries
${entriesSql}

COMMIT;
`;

console.log('Seeding asset packs...');
console.log(sql);

const tempFile = '/tmp/seed-asset-packs.sql';
writeFileSync(tempFile, sql);

try {
  const cwd = process.cwd().includes('/api') ? process.cwd() : resolve(process.cwd(), 'api');
  execSync(`npx wrangler d1 execute slopcade-db --file=${tempFile} --local`, {
    stdio: 'inherit',
    cwd,
  });
  console.log('✅ Asset packs seeded successfully');
  console.log('\nVerify with:');
  console.log(
    '  sqlite3 "api/.wrangler/state/v3/d1/miniflare-D1DatabaseObject/*.sqlite" "SELECT COUNT(*) FROM asset_packs;"'
  );
} finally {
  unlinkSync(tempFile);
}
