#!/usr/bin/env npx tsx
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { createTRPCClient, httpLink } from '@trpc/client';
import type { AppRouter } from '../src/trpc/router';
import { loadGame, GAME_IDS } from '@slopcade/games';

/**
 * CLI tool to apply a theme to a game via tRPC API.
 * 
 * Usage:
 *   # For database games:
 *   npx tsx api/scripts/theme-game.ts --game=<gameId> --theme-name="Halloween" --prompt="spooky theme"
 * 
 *   # For template games (on-disk):
 *   npx tsx api/scripts/theme-game.ts --template=ballSort --theme-name="Gumball" --prompt="colorful gumball candy"
 * 
 *   # With existing theme:
 *   npx tsx api/scripts/theme-game.ts --game=<gameId> --theme=<themeId>
 */

async function main() {
  const argv = await yargs(hideBin(process.argv))
    .usage('Usage: $0 (--game=<gameId> | --template=<templateName>) [options]')
    .option('game', {
      type: 'string',
      description: 'Game ID (UUID) from database',
    })
    .option('template', {
      type: 'string',
      description: `Template game name from disk. Available: ${GAME_IDS.join(', ')}`,
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
      choices: ['pixel', 'cartoon', '3d', 'flat'] as const,
      description: 'Style override',
    })
    .option('process', {
      type: 'boolean',
      default: false,
      description: 'Immediately process the generation job after creating it',
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
      description: 'Auth token (use "dev-token" for local dev)',
      default: process.env.SLOPCADE_AUTH_TOKEN || 'dev-token',
    })
    .check((argv) => {
      if (!argv.game && !argv.template) {
        throw new Error('Error: Must provide either --game or --template');
      }
      if (argv.game && argv.template) {
        throw new Error('Error: Cannot specify both --game and --template');
      }
      if (!argv.theme && !argv['theme-name']) {
        throw new Error('Error: Must provide either --theme or --theme-name');
      }
      if (argv['theme-name'] && !argv.prompt) {
        throw new Error('Error: --prompt is required when using --theme-name');
      }
      if (argv.template && !GAME_IDS.includes(argv.template)) {
        throw new Error(`Error: Unknown template '${argv.template}'. Available: ${GAME_IDS.join(', ')}`);
      }
      return true;
    })
    .help()
    .alias('h', 'help')
    .argv;

  const baseUrl = argv.production 
    ? 'https://slopcade-api.hassoncs.workers.dev' 
    : 'http://localhost:8789';

  if (argv.process && !argv['dry-run']) {
    const hasScenarioCredentials = process.env.SCENARIO_API_KEY && process.env.SCENARIO_SECRET_API_KEY;
    if (!hasScenarioCredentials) {
      console.error('═'.repeat(60));
      console.error('❌ Missing Scenario.com API credentials!');
      console.error('═'.repeat(60));
      console.error('\nRequired environment variables:');
      console.error('  - SCENARIO_API_KEY');
      console.error('  - SCENARIO_SECRET_API_KEY');
      console.error('\nRun this script with hush to inject secrets:');
      console.error(`  hush run -- npx tsx api/scripts/theme-game.ts ${process.argv.slice(2).join(' ')}`);
      console.error('═'.repeat(60));
      process.exit(1);
    }
  }

  const authToken = argv['auth-token'];
  if (authToken === 'dev-token' && !argv.local) {
    console.warn('Warning: Using dev-token with non-local API. This will likely fail.');
    console.warn('Set SLOPCADE_AUTH_TOKEN for production API access.');
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

  let gameId = argv.game;

  if (argv.template) {
    console.log(`\n📦 Loading template game: ${argv.template}`);
    
    const gameEntry = await loadGame(argv.template);
    if (!gameEntry) {
      console.error(`❌ Failed to load template game: ${argv.template}`);
      process.exit(1);
    }

    console.log(`   Title: ${gameEntry.title}`);
    console.log(`   Templates: ${Object.keys(gameEntry.definition.templates ?? {}).length}`);

    if (argv['dry-run']) {
      console.log('\n═'.repeat(60));
      console.log('  DRY RUN: Would sync template to DB');
      console.log('═'.repeat(60));
      console.log(`Template: ${argv.template}`);
      console.log(`Definition size: ${JSON.stringify(gameEntry.definition).length} bytes`);
      console.log('═'.repeat(60));
      return;
    }

    console.log(`\n🔄 Syncing template to local database...`);
    
    try {
      const syncResult = await client.games.syncTemplates.mutate({
        templates: [{
          id: argv.template,
          title: gameEntry.title,
          description: gameEntry.description,
          definition: JSON.stringify(gameEntry.definition),
          isPublic: true,
        }],
      });

      const templateResult = syncResult.results.find(r => r.id === argv.template);
      if (templateResult?.action === 'error') {
        console.error(`❌ Failed to sync template: ${templateResult.error}`);
        process.exit(1);
      }

      console.log(`   ✅ Template ${templateResult?.action}: ${argv.template}`);
      gameId = argv.template;
    } catch (error: any) {
      console.error('\n❌ Error syncing template:');
      console.error(error.message || error);
      process.exit(1);
    }
  }

  if (!gameId) {
    console.error('❌ No game ID determined');
    process.exit(1);
  }

  const input = {
    gameId,
    themeId: argv.theme,
    newTheme: argv['theme-name'] ? {
      name: argv['theme-name'],
      promptModifier: argv.prompt || '',
    } : undefined,
    style: argv.style,
    setAsActive: true,
  };

  if (argv['dry-run']) {
    console.log('\n═'.repeat(60));
    console.log('  DRY RUN: Apply Theme to Game');
    console.log('═'.repeat(60));
    console.log(`API: ${baseUrl}`);
    console.log('Input:', JSON.stringify(input, null, 2));
    console.log('═'.repeat(60));
    return;
  }

  try {
    console.log(`\n🎨 Applying theme to game ${gameId}...`);
    const result = await client.assetSystem.applyThemeToGame.mutate(input);

    console.log('\n✅ Theme job created successfully!');
    console.log('═'.repeat(60));
    console.log(`Theme ID:   ${result.themeId}`);
    console.log(`Pack ID:    ${result.packId}`);
    console.log(`Job ID:     ${result.jobId}`);
    console.log(`Task Count: ${result.taskCount}`);
    console.log('═'.repeat(60));

    if (argv.process) {
      console.log(`\n⚙️  Processing generation job...`);
      
      try {
        const processResult = await client.assetSystem.processGenerationJob.mutate({
          jobId: result.jobId,
        });

        console.log('\n✅ Generation complete!');
        console.log('═'.repeat(60));
        console.log(`Succeeded: ${processResult.successCount}`);
        console.log(`Failed:    ${processResult.failCount}`);
        console.log(`Status:    ${processResult.status}`);
        console.log('═'.repeat(60));

        if (processResult.failCount > 0) {
          console.log('\n⚠️  Some tasks failed. Check job details for errors.');
        }
      } catch (processError: any) {
        console.error('\n❌ Error processing job:');
        console.error(processError.message || processError);
        console.log('\nYou can retry with:');
        console.log(`  npx tsx api/scripts/process-job.ts ${result.jobId}`);
      }
    } else {
      console.log(`\nNext steps:`);
      console.log(`1. Monitor job status: npx tsx api/scripts/get-job-status.ts ${result.jobId}`);
      console.log(`2. Process the job:    npx tsx api/scripts/process-job.ts ${result.jobId}`);
      console.log(`\nOr run with --process flag to generate immediately.`);
    }
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
