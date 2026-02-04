#!/usr/bin/env npx tsx
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { createTRPCClient, httpLink } from '@trpc/client';
import type { AppRouter } from '../src/trpc/router';

/**
 * CLI tool to apply a theme to a game via tRPC API.
 * 
 * Usage:
 *   npx tsx api/scripts/theme-game.ts --game=<gameId> --theme=<themeId>
 *   npx tsx api/scripts/theme-game.ts --game=<gameId> --theme-name="Halloween" --prompt="spooky theme"
 */

async function main() {
  const argv = await yargs(hideBin(process.argv))
    .usage('Usage: $0 --game=<gameId> [options]')
    .option('game', {
      type: 'string',
      description: 'Required: Game ID to theme',
      demandOption: true,
    })
    .option('theme', {
      type: 'string',
      description: 'Use existing theme ID',
    })
    .option('theme-name', {
      type: 'string',
      description: 'Create new theme with this name',
    })
    .option('prompt', {
      type: 'string',
      description: 'Theme prompt modifier (required if --theme-name is used)',
    })
    .option('style', {
      choices: ['pixel', 'cartoon', '3d', 'flat'],
      description: 'Style override',
    })
    .option('local', {
      type: 'boolean',
      default: true,
      description: 'Use local API (http://localhost:8789)',
    })
    .option('production', {
      type: 'boolean',
      description: 'Use production API (https://slopcade-api.hassoncs.workers.dev)',
    })
    .option('dry-run', {
      type: 'boolean',
      description: 'Show what would be done without making API calls',
    })
    .option('auth-token', {
      type: 'string',
      description: 'Supabase auth token (JWT)',
      default: process.env.SLOPCADE_AUTH_TOKEN,
    })
    .check((argv) => {
      if (!argv.theme && !argv['theme-name']) {
        throw new Error('Error: Must provide either --theme or --theme-name');
      }
      if (argv['theme-name'] && !argv.prompt) {
        throw new Error('Error: --prompt is required when using --theme-name');
      }
      return true;
    })
    .help()
    .alias('h', 'help')
    .argv;

  const baseUrl = argv.production 
    ? 'https://slopcade-api.hassoncs.workers.dev' 
    : 'http://localhost:8789';

  const input = {
    gameId: argv.game,
    themeId: argv.theme,
    newTheme: argv['theme-name'] ? {
      name: argv['theme-name'],
      promptModifier: argv.prompt || '',
    } : undefined,
    style: argv.style as 'pixel' | 'cartoon' | '3d' | 'flat' | undefined,
    setAsActive: true,
  };

  if (argv['dry-run']) {
    console.log('═'.repeat(60));
    console.log('  DRY RUN: Apply Theme to Game');
    console.log('═'.repeat(60));
    console.log(`API: ${baseUrl}`);
    console.log('Input:', JSON.stringify(input, null, 2));
    console.log('═'.repeat(60));
    return;
  }

  const authToken = argv['auth-token'];
  if (!authToken && !argv.production) {
    console.warn('Warning: No auth token provided. Local API might reject the request if auth is enabled.');
    console.warn('Set SLOPCADE_AUTH_TOKEN environment variable or use --auth-token flag.');
  }

  const client = createTRPCClient<AppRouter>({
    links: [
      httpLink({
        url: `${baseUrl}/trpc`,
        headers: authToken ? {
          Authorization: `Bearer ${authToken}`,
        } : {},
      }),
    ],
  });

  try {
    console.log(`Applying theme to game ${argv.game}...`);
    const result = await client.assetSystem.applyThemeToGame.mutate(input);

    console.log('\n✅ Theme applied successfully!');
    console.log('═'.repeat(60));
    console.log(`Theme ID:   ${result.themeId}`);
    console.log(`Pack ID:    ${result.packId}`);
    console.log(`Job ID:     ${result.jobId}`);
    console.log(`Task Count: ${result.taskCount}`);
    console.log('═'.repeat(60));
    
    console.log(`\nNext steps:`);
    console.log(`1. Monitor job status: npx tsx api/scripts/get-job-status.ts ${result.jobId}`);
    console.log(`2. Process the job:    npx tsx api/scripts/process-job.ts ${result.jobId}`);
  } catch (error: any) {
    console.error('\n❌ Error applying theme:');
    if (error.data?.code) {
      console.error(`[${error.data.code}] ${error.message}`);
    } else {
      console.error(error.message || error);
    }
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
