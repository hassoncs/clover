import Anthropic from "@anthropic-ai/sdk";

/**
 * Create an Anthropic client using the API key from environment.
 * Expects ANTHROPIC_API_KEY to be set (via `hush run --`).
 */
export function createAnthropicClient(): Anthropic {
	const apiKey = process.env.ANTHROPIC_API_KEY;
	if (!apiKey) {
		throw new Error("ANTHROPIC_API_KEY environment variable is required");
	}
	return new Anthropic({ apiKey });
}

/**
 * Generate content using Claude with a simple prompt.
 * Returns the generated text content.
 */
export async function generateContent(prompt: string): Promise<string> {
	const client = createAnthropicClient();

	const response = await client.messages.create({
		model: "claude-3-5-sonnet-20241022",
		max_tokens: 4096,
		messages: [
			{
				role: "user",
				content: prompt,
			},
		],
	});

	const textBlock = response.content.find((block) => block.type === "text");
	if (!textBlock || textBlock.type !== "text") {
		throw new Error("No text content in Claude response");
	}

	return textBlock.text;
}
