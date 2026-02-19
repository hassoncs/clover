import {
	createOpenRouter,
	type OpenRouterChatSettings,
} from "@openrouter/ai-sdk-provider";
import { generateObject, type JSONValue, type LanguageModel } from "ai";
import type { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import { type ProviderFamily, resolveModel } from "./models";

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

export function createModelWithConfig(options: {
	apiKey: string;
	modelOrPreset?: string;
}): ModelWithConfig {
	if (!options.apiKey) {
		throw new Error("apiKey is required");
	}

	const openrouter = createOpenRouter({ apiKey: options.apiKey });
	const { id: modelId, providerFamily } = resolveModel(options.modelOrPreset);
	const { settings, providerOptions } = getProviderConfig(providerFamily);

	return {
		model: openrouter.chat(modelId, settings),
		providerOptions,
		providerFamily,
	};
}

export function createModel(options: {
	apiKey: string;
	modelOrPreset?: string;
}): LanguageModel {
	return createModelWithConfig(options).model;
}

export async function generateItems<T>(options: {
	schema: z.ZodType<T>;
	system: string;
	prompt: string;
	apiKey: string;
	model?: string;
	temperature?: number;
}): Promise<T> {
	const { model, providerOptions, providerFamily } = createModelWithConfig({
		apiKey: options.apiKey,
		modelOrPreset: options.model,
	});

	let system = options.system;

	if (providerFamily !== "openai") {
		const jsonSchema = zodToJsonSchema(options.schema);
		const schemaStr = JSON.stringify(jsonSchema, null, 2);
		system = `${options.system}\n\nIMPORTANT: You MUST respond with valid JSON only. No markdown, no explanations, no text before or after the JSON.\n\nYour response must conform to this JSON schema:\n${schemaStr}`;
	}

	const result = await generateObject({
		model,
		schema: options.schema,
		system,
		prompt: options.prompt,
		providerOptions,
		temperature: options.temperature ?? 1.0,
	});
	return result.object as T;
}
