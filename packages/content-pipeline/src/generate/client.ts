import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";

const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";
const DEFAULT_MODEL = "anthropic/claude-sonnet-4-20250514";

function createModel() {
	const apiKey = process.env.OPENROUTER_API_KEY;
	if (!apiKey) {
		throw new Error("OPENROUTER_API_KEY environment variable is required");
	}

	const openrouter = createOpenAI({
		apiKey,
		baseURL: OPENROUTER_BASE_URL,
	});

	return openrouter.chat(DEFAULT_MODEL);
}

/**
 * Generate content using Claude via OpenRouter with a simple prompt.
 * Returns the generated text content.
 */
export async function generateContent(prompt: string): Promise<string> {
	const model = createModel();

	const result = await generateText({
		model,
		prompt,
	});

	return result.text;
}
