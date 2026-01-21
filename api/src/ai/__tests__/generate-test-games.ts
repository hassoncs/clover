import { generateGame, type AIConfig } from '../generator';
import { validateGameDefinition, getValidationSummary } from '../validator';
import * as fs from 'fs';
import * as path from 'path';

const TEST_PROMPTS = [
  "A game where I launch balls at stacked blocks to knock them down",
  "A platformer where a cat jumps between clouds to collect stars",
  "A game where I catch falling apples but avoid the bombs",
];

async function main() {
  const apiKey = process.env.OPENROUTER_API_KEY;
  
  if (!apiKey) {
    console.error('❌ OPENROUTER_API_KEY not set');
    console.error('Run with: hush run -- npx tsx api/src/ai/__tests__/generate-test-games.ts');
    process.exit(1);
  }

  const config: AIConfig = {
    provider: 'openrouter',
    apiKey,
    model: 'openai/gpt-4o',
  };

  const outputDir = path.join(__dirname, 'output');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  console.log('🎮 Generating test games with OpenRouter...\n');

  for (let i = 0; i < TEST_PROMPTS.length; i++) {
    const prompt = TEST_PROMPTS[i];
    console.log(`\n[${ i + 1}/${TEST_PROMPTS.length}] Prompt: "${prompt}"`);
    console.log('⏳ Generating...');

    const startTime = Date.now();
    const result = await generateGame(prompt, config, {
      maxRetries: 1,
      temperature: 0.7,
    });
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

    if (!result.success || !result.game) {
      console.error(`❌ Failed: ${result.error?.message}`);
      continue;
    }

    const game = result.game;
    const validation = validateGameDefinition(game);
    
    console.log(`✅ Generated "${game.metadata.title}" in ${elapsed}s`);
    console.log(`   Type: ${result.intent?.gameType}, Theme: ${result.intent?.theme}`);
    console.log(`   Entities: ${game.entities.length}, Templates: ${Object.keys(game.templates || {}).length}`);
    console.log(`   Validation: ${validation.valid ? '✅ Valid' : `⚠️ ${validation.errors.length} errors`}`);
    
    if (!validation.valid) {
      console.log(`   ${getValidationSummary(validation)}`);
    }

    const filename = `game-${i + 1}-${game.metadata.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.json`;
    const filepath = path.join(outputDir, filename);
    
    fs.writeFileSync(filepath, JSON.stringify(game, null, 2));
    console.log(`   💾 Saved: ${filename}`);
  }

  console.log('\n✨ Done! Games saved to api/src/ai/__tests__/output/');
}

main().catch(console.error);
