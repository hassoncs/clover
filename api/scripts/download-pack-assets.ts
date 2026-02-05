#!/usr/bin/env npx tsx
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { createTRPCClient, httpLink } from '@trpc/client';
import type { AppRouter } from '../src/trpc/router';
import { mkdir, writeFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PACKS_ROOT = join(__dirname, '../../r2/packs');

async function main() {
  const argv = await yargs(hideBin(process.argv))
    .usage('Usage: $0 --pack=<packId> --template=<templateName>')
    .option('pack', {
      type: 'string',
      description: 'Pack ID to download assets from',
      demandOption: true,
    })
    .option('template', {
      type: 'string', 
      description: 'Template game name (determines output directory)',
      demandOption: true,
    })
    .option('auth-token', {
      type: 'string',
      description: 'Auth token',
      default: process.env.SLOPCADE_AUTH_TOKEN || 'dev-token',
    })
    .option('api-url', {
      type: 'string',
      description: 'API URL',
      default: 'http://localhost:8789',
    })
    .help()
    .alias('h', 'help')
    .argv;

  const client = createTRPCClient<AppRouter>({
    links: [
      httpLink({
        url: `${argv['api-url']}/trpc`,
        headers: { Authorization: `Bearer ${argv['auth-token']}` },
      }),
    ],
  });

  const outputDir = join(PACKS_ROOT, argv.pack);
  await mkdir(outputDir, { recursive: true });

  console.log(`\n📦 Fetching pack: ${argv.pack}`);

  const pack = await client.assetSystem.getPack.query({ id: argv.pack });

  console.log(`   Pack: ${pack.name}`);
  console.log(`   Entries: ${pack.entries.length}\n`);

  const manifest: Record<string, { file: string; r2Key: string }> = {};

  for (const entry of pack.entries) {
    const templateId = entry.templateId;
    let assetUrl = entry.imageUrl;
    
    if (!assetUrl) {
      console.log(`⏭️  Skipping ${templateId} - no asset URL`);
      continue;
    }

    assetUrl = assetUrl.replace(/http:\/\/[^\/]+/, argv['api-url']);

    console.log(`📥 Downloading ${templateId}...`);

    try {
      const response = await fetch(assetUrl);
      if (!response.ok) {
        console.log(`   ❌ Failed: ${response.status} ${response.statusText}`);
        continue;
      }

      const contentType = response.headers.get('content-type') || 'image/png';
      const ext = contentType.includes('jpeg') || contentType.includes('jpg') ? '.jpg' : '.png';
      const filename = `${templateId}${ext}`;
      const filepath = join(outputDir, filename);

      const buffer = Buffer.from(await response.arrayBuffer());
      await writeFile(filepath, buffer);

      manifest[templateId] = {
        file: filename,
        r2Key: entry.r2Key || '',
      };

      console.log(`   ✅ Saved: ${filename} (${buffer.length} bytes)`);
    } catch (err: any) {
      console.log(`   ❌ Error: ${err.message}`);
    }
  }

  const manifestPath = join(outputDir, 'manifest.json');
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2));
  console.log(`\n📄 Manifest saved: ${manifestPath}`);

  console.log(`\n✅ Downloaded ${Object.keys(manifest).length} assets to:`);
  console.log(`   ${outputDir}\n`);
}

main().catch(err => {
  console.error('Error:', err.message || err);
  process.exit(1);
});
