import { generateText } from "ai";
import { CHAT_MODELS } from "@/ai/chat-model-config";
import { createModel } from "@/ai/model-factory";

const TITLE_SYSTEM_PROMPT =
	"Generate a short, catchy title (3-6 words) for a conversation or session that starts with the message below. Return ONLY the title text. No quotes, no punctuation, no explanation.";

export async function generateTitle(
	input: string,
	options: { apiKey: string },
): Promise<string> {
	const model = createModel({
		apiKey: options.apiKey,
		model: CHAT_MODELS.fast.id,
	});

	const { text } = await generateText({
		model,
		system: TITLE_SYSTEM_PROMPT,
		prompt: input,
		maxOutputTokens: 20,
	});

	return text.trim();
}
