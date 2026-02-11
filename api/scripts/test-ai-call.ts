// Run with: hush run -- npx tsx api/scripts/test-ai-call.ts
import { createOpenAI } from '@ai-sdk/openai';
import { generateText } from 'ai';

const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';

async function main() {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    console.error('OPENROUTER_API_KEY not set. Run with: hush run -- npx tsx api/scripts/test-ai-call.ts');
    process.exit(1);
  }

  console.log('Creating OpenRouter client (Chat Completions mode)...');
  const openrouter = createOpenAI({
    apiKey,
    baseURL: OPENROUTER_BASE_URL,
  });

  const model = openrouter.chat('openai/gpt-4o-mini');

  console.log('Calling generateText with openai/gpt-4o-mini via OpenRouter...');
  const startTime = Date.now();

  try {
    const result = await generateText({
      model,
      system: 'You are a helpful assistant. Respond in one short sentence.',
      prompt: 'What is 2 + 2?',
    });

    const elapsed = Date.now() - startTime;
    console.log(`\nResponse (${elapsed}ms):`);
    console.log(result.text);
    console.log(`\nUsage: ${JSON.stringify(result.usage)}`);
    console.log('\n✅ AI call succeeded!');
  } catch (error) {
    const elapsed = Date.now() - startTime;
    console.error(`\n❌ AI call FAILED after ${elapsed}ms:`);
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

main();
