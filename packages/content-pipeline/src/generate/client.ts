import {
	createOpenRouter,
	type OpenRouterChatSettings,
} from "@openrouter/ai-sdk-provider";
import { generateObject, type JSONValue, type LanguageModel } from "ai";
import type { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import { type ProviderFamily, resolveModel } from "./models.js";

type ProviderOptions = Record<string, Record<string, JSONValue | undefined>>;

interface ModelWithConfig {
	model: LanguageModel;
	providerOptions?: ProviderOptions;
	providerFamily: ProviderFamily;
}

function getProviderConfig(providerFamily: ProviderFamily): {
	settings: OpenRouterChatSettings;
	providerOptions?: ProviderOptions;
} {
	const baseSettings: OpenRouterChatSettings = {
		plugins: [{ id: "response-healing" }],
	};

	switch (providerFamily) {
		case "openai":
			return { settings: baseSettings };

		case "anthropic":
			// Force Anthropic routing — without this, OpenRouter may route to Google which ignores JSON mode
			// json_object override needed because Anthropic ignores response_format: json_schema
			return {
				settings: {
					...baseSettings,
					provider: { order: ["Anthropic"] },
				},
				providerOptions: {
					openrouter: {
						response_format: { type: "json_object" },
					},
				},
			};

		case "opensource":
			return {
				settings: baseSettings,
				providerOptions: {
					openrouter: {
						response_format: { type: "json_object" },
					},
				},
			};
	}
}

export function createModelWithConfig(modelOrPreset?: string): ModelWithConfig {
	const apiKey = process.env.OPENROUTER_API_KEY;
	if (!apiKey) {
		throw new Error(
			"OPENROUTER_API_KEY environment variable is required. Use: hush run -- <command>",
		);
	}

	const openrouter = createOpenRouter({ apiKey });
	const { id: modelId, providerFamily } = resolveModel(modelOrPreset);
	const { settings, providerOptions } = getProviderConfig(providerFamily);

	return {
		model: openrouter.chat(modelId, settings),
		providerOptions,
		providerFamily,
	};
}

export function createModel(modelOrPreset?: string): LanguageModel {
	return createModelWithConfig(modelOrPreset).model;
}

export async function generateItems<T>(options: {
	schema: z.ZodType<T>;
	system: string;
	prompt: string;
	model?: string;
	temperature?: number;
}): Promise<T> {
	const { model, providerOptions, providerFamily } = createModelWithConfig(
		options.model,
	);

	let system = options.system;

	// For non-OpenAI providers, inject JSON schema into the system prompt.
	// OpenAI natively supports response_format: json_schema — the model sees the schema.
	// Anthropic and open-source models via OpenRouter ignore response_format entirely,
	// so the model never sees the schema and returns markdown instead of JSON.
	if (providerFamily !== "openai") {
		const jsonSchema = zodToJsonSchema(options.schema);
		const schemaStr = JSON.stringify(jsonSchema, null, 2);
		system = `${options.system}\n\nIMPORTANT: You MUST respond with valid JSON only. No markdown, no explanations, no text before or after the JSON.\n\nYour response must conform to this JSON schema:\n${schemaStr}`;
	}

	const result = await generateObject({
		model,
		output: "object" as const,
		schema: options.schema,
		system,
		prompt: options.prompt,
		providerOptions,
		temperature: options.temperature ?? 1.0,
	});
	return result.object as T;
}
