import {
	type RuntimeIntentMode,
	VOICE_PRESETS,
	type VoicePresetId,
} from "@slopcade/shared";
import { tool } from "ai";
import { nanoid } from "nanoid";
import { z } from "zod";
import { ElevenLabsService } from "@/ai/providers/elevenlabs";
import { getSkillById } from "@/ai/skills";
import type { GitService } from "@/services/git/GitService";
import type { Env } from "@/trpc/context";

export interface EditorCommandPayload {
	command: string;
	payload: Record<string, unknown>;
}

export interface ChatToolContext {
	gameId: string;
	gitService: GitService;
	onFileChanged?: (payload: { gameId: string; filename: string }) => void;
	onEditorCommand?: (payload: EditorCommandPayload) => Promise<unknown>;
	env?: Env;
}

export function createChatTools(ctx: ChatToolContext) {
	return {
		readFile: tool({
			description:
				"Read a file from the workspace. Returns the current content of the file.",
			inputSchema: z.object({
				filename: z
					.string()
					.min(1)
					.describe('The filename to read (e.g., "document.md", "notes.txt")'),
			}),
			execute: async ({ filename }) => {
				const data = await ctx.gitService.readFile(ctx.gameId, filename);
				if (!data) {
					return { ok: true, exists: false, content: null };
				}
				const content = new TextDecoder().decode(data);
				return { ok: true, exists: true, content };
			},
		}),

		writeFile: tool({
			description:
				"Write content to a file in the workspace. Creates or overwrites the file. Each write is automatically committed.",
			inputSchema: z.object({
				filename: z
					.string()
					.min(1)
					.describe('The filename to write (e.g., "document.md", "notes.txt")'),
				content: z.string().describe("The full content to write to the file"),
			}),
			execute: async ({ filename, content }) => {
				const sha = await ctx.gitService.commitFiles(
					ctx.gameId,
					[{ path: filename, content }],
					`AI: Update ${filename}`,
					{ name: "AI Assistant", email: "ai@slopcade.app" },
				);
				ctx.onFileChanged?.({ gameId: ctx.gameId, filename });
				return { ok: true, commitSha: sha, bytesWritten: content.length };
			},
		}),

		listFiles: tool({
			description:
				"List files in the workspace with optional prefix filter. Returns filenames matching the prefix.",
			inputSchema: z.object({
				prefix: z
					.string()
					.optional()
					.describe(
						'Optional prefix to filter files (e.g., "prefabs/" lists all prefab files)',
					),
			}),
			execute: async ({ prefix }) => {
				const allFiles = await ctx.gitService.listFiles(ctx.gameId);
				const filtered = prefix
					? allFiles.filter((f) => f.startsWith(prefix))
					: allFiles;
				return {
					ok: true,
					files: filtered.map((f) => ({ filename: f })),
				};
			},
		}),

		readFilesBatch: tool({
			description:
				"Read multiple files from the workspace in a single call. More efficient than multiple readFile calls.",
			inputSchema: z.object({
				filenames: z
					.array(z.string().min(1))
					.describe("Array of filenames to read"),
			}),
			execute: async ({ filenames }) => {
				const fileResults = await Promise.all(
					filenames.map(async (filename) => {
						const data = await ctx.gitService.readFile(ctx.gameId, filename);
						if (!data) {
							return { filename, exists: false, content: null, size: 0 };
						}
						const content = new TextDecoder().decode(data);
						return {
							filename,
							exists: true,
							content,
							size: content.length,
						};
					}),
				);
				return { ok: true, files: fileResults };
			},
		}),

		viewHistory: tool({
			description:
				"View recent commit history for this game's workspace. Shows what changes have been made.",
			inputSchema: z.object({
				depth: z
					.number()
					.optional()
					.default(10)
					.describe("Number of commits to show"),
			}),
			execute: async ({ depth }) => {
				const commits = await ctx.gitService.log(ctx.gameId, depth);
				return { ok: true, commits };
			},
		}),

		readSkill: tool({
			description: "Read detailed instructions for an active skill by its ID.",
			inputSchema: z.object({
				skillId: z
					.string()
					.min(1)
					.describe('The skill ID to read (e.g., "game-design", "scripting")'),
			}),
			execute: async ({ skillId }) => {
				const skill = getSkillById(skillId);
				if (!skill) {
					return { ok: false, error: `Unknown skill: ${skillId}` };
				}
				return {
					ok: true,
					id: skill.id,
					name: skill.name,
					content: skill.content,
				};
			},
		}),

		generateSoundEffect: tool({
			description:
				"Generate a sound effect from a text description using AI. Returns a URL to the generated audio file. Use for game sounds like explosions, clicks, whooshes, impacts, etc.",
			inputSchema: z.object({
				text: z
					.string()
					.min(1)
					.describe(
						'Description of the sound effect to generate (e.g., "laser blast", "coin pickup chime", "wooden door creaking open")',
					),
				durationSeconds: z
					.number()
					.min(0.5)
					.max(22)
					.optional()
					.describe("Duration in seconds (0.5-22, auto if omitted)"),
				promptInfluence: z
					.number()
					.min(0)
					.max(1)
					.optional()
					.describe("How closely to follow the prompt (0-1, default ~0.3)"),
			}),
			execute: async ({ text, durationSeconds, promptInfluence }) => {
				if (!ctx.env?.ELEVENLABS_API_KEY) {
					return { ok: false, error: "Audio generation not configured" };
				}

				try {
					const service = new ElevenLabsService(ctx.env.ELEVENLABS_API_KEY);
					const result = await service.generateSFX({
						text,
						durationSeconds,
						promptInfluence,
					});

					const assetId = nanoid();
					const r2Key = `audio/sfx/${assetId}.mp3`;

					await ctx.env.ASSETS.put(r2Key, result.audio, {
						httpMetadata: { contentType: result.contentType },
						customMetadata: {
							type: "sfx",
							prompt: text,
							generatedAt: new Date().toISOString(),
							...(result.durationSeconds != null
								? { durationSeconds: String(result.durationSeconds) }
								: {}),
						},
					});

					return {
						ok: true,
						assetId,
						url: `/assets/${r2Key}`,
						type: "sfx",
						contentType: result.contentType,
						durationSeconds: result.durationSeconds,
					};
				} catch (err) {
					const message = err instanceof Error ? err.message : String(err);
					return { ok: false, error: message };
				}
			},
		}),

		generateVoice: tool({
			description: `Generate speech audio from text using AI voice synthesis. Returns a URL to the generated audio file. Use for narration, character dialogue, announcements, tutorials, etc. Available voice presets: ${Object.entries(
				VOICE_PRESETS,
			)
				.map(([id, p]) => `"${id}" (${p.description})`)
				.join(", ")}`,
			inputSchema: z.object({
				text: z.string().min(1).describe("The text to speak"),
				voicePreset: z
					.enum(
						Object.keys(VOICE_PRESETS) as [VoicePresetId, ...VoicePresetId[]],
					)
					.optional()
					.describe(
						'Voice preset to use (e.g., "narrator", "friendly", "announcer", "villain", "guide"). Defaults to "narrator".',
					),
				stability: z
					.number()
					.min(0)
					.max(1)
					.optional()
					.describe(
						"Voice stability (0=variable/expressive, 1=stable/consistent)",
					),
				similarityBoost: z
					.number()
					.min(0)
					.max(1)
					.optional()
					.describe("How closely to match the original voice (0-1)"),
				style: z
					.number()
					.min(0)
					.max(1)
					.optional()
					.describe("Style exaggeration (0=none, 1=max)"),
			}),
			execute: async ({
				text,
				voicePreset,
				stability,
				similarityBoost,
				style,
			}) => {
				if (!ctx.env?.ELEVENLABS_API_KEY) {
					return { ok: false, error: "Audio generation not configured" };
				}

				try {
					const preset = VOICE_PRESETS[voicePreset ?? "narrator"];
					const service = new ElevenLabsService(ctx.env.ELEVENLABS_API_KEY);
					const result = await service.generateVoice({
						text,
						voiceId: preset.voiceId,
						stability,
						similarityBoost,
						style,
					});

					const assetId = nanoid();
					const r2Key = `audio/voice/${assetId}.mp3`;

					await ctx.env.ASSETS.put(r2Key, result.audio, {
						httpMetadata: { contentType: result.contentType },
						customMetadata: {
							type: "voice",
							text,
							voiceId: preset.voiceId,
							voicePreset: voicePreset ?? "narrator",
							generatedAt: new Date().toISOString(),
						},
					});

					return {
						ok: true,
						assetId,
						url: `/assets/${r2Key}`,
						type: "voice",
						contentType: result.contentType,
						durationSeconds: result.durationSeconds,
						voicePreset: voicePreset ?? "narrator",
						voiceName: preset.name,
					};
				} catch (err) {
					const message = err instanceof Error ? err.message : String(err);
					return { ok: false, error: message };
				}
			},
		}),

		generateBackgroundSound: tool({
			description:
				"Generate ambient background audio from a text description using AI. Returns a URL to the generated audio file. Use for background music, ambient sounds, atmosphere, etc.",
			inputSchema: z.object({
				text: z
					.string()
					.min(1)
					.describe(
						'Description of the background sound (e.g., "peaceful forest with birds chirping", "intense battle drums", "underwater bubbling ambience")',
					),
				durationSeconds: z
					.number()
					.min(0.5)
					.max(22)
					.optional()
					.describe("Duration in seconds (0.5-22, auto if omitted)"),
				promptInfluence: z
					.number()
					.min(0)
					.max(1)
					.optional()
					.describe("How closely to follow the prompt (0-1, default ~0.3)"),
			}),
			execute: async ({ text, durationSeconds, promptInfluence }) => {
				if (!ctx.env?.ELEVENLABS_API_KEY) {
					return { ok: false, error: "Audio generation not configured" };
				}

				try {
					const service = new ElevenLabsService(ctx.env.ELEVENLABS_API_KEY);
					const result = await service.generateBackground({
						text,
						durationSeconds,
						promptInfluence,
					});

					const assetId = nanoid();
					const r2Key = `audio/background/${assetId}.mp3`;

					await ctx.env.ASSETS.put(r2Key, result.audio, {
						httpMetadata: { contentType: result.contentType },
						customMetadata: {
							type: "background",
							prompt: text,
							generatedAt: new Date().toISOString(),
							...(result.durationSeconds != null
								? { durationSeconds: String(result.durationSeconds) }
								: {}),
						},
					});

					return {
						ok: true,
						assetId,
						url: `/assets/${r2Key}`,
						type: "background",
						contentType: result.contentType,
						durationSeconds: result.durationSeconds,
					};
				} catch (err) {
					const message = err instanceof Error ? err.message : String(err);
					return { ok: false, error: message };
				}
			},
		}),

		"editor.listContexts": tool({
			description:
				"List all available preview contexts in the editor. Returns context IDs, labels, modes, and runtime intents. Use this to see what preview panes are available (e.g., host, player) before switching.",
			inputSchema: z.object({}),
			execute: async () => {
				const result = await ctx.onEditorCommand?.({
					command: "listContexts",
					payload: {},
				});
				if (!result) {
					return { ok: false, error: "Editor not connected" };
				}
				return { ok: true, ...(result as Record<string, unknown>) };
			},
		}),

		"editor.switchContext": tool({
			description:
				"Switch the active preview context in the editor. Use editor.listContexts first to see available context IDs. This changes which preview pane is focused for inspection and interaction.",
			inputSchema: z.object({
				contextId: z
					.string()
					.min(1)
					.describe('The context ID to switch to (e.g., "host", "player")'),
			}),
			execute: async ({ contextId }) => {
				const result = await ctx.onEditorCommand?.({
					command: "switchContext",
					payload: { contextId },
				});
				if (!result) {
					return { ok: false, error: "Editor not connected" };
				}
				return { ok: true, ...(result as Record<string, unknown>) };
			},
		}),

		"editor.setRuntimeIntentMode": tool({
			description:
				'Toggle the runtime intent mode for a preview context between "author" (editing/layout) and "live" (running simulation with physics/rules). WARNING: Switching to live mode will start the simulation. Switching to author will stop it.',
			inputSchema: z.object({
				contextId: z
					.string()
					.optional()
					.describe(
						"Target context ID. If omitted, applies to the active context.",
					),
				mode: z
					.enum(["author", "live"] as [
						RuntimeIntentMode,
						...RuntimeIntentMode[],
					])
					.describe('"author" for editing mode, "live" for simulation mode'),
			}),
			execute: async ({ contextId, mode }) => {
				const result = await ctx.onEditorCommand?.({
					command: "setRuntimeIntentMode",
					payload: { contextId, mode },
				});
				if (!result) {
					return { ok: false, error: "Editor not connected" };
				}
				return { ok: true, ...(result as Record<string, unknown>) };
			},
		}),

		"editor.readState": tool({
			description:
				'Read runtime state from the active preview context. Can read game variables (score, lives, custom vars), entity counts, or room state for party games. Use section="variables" for game variables, section="entities" for entity summary, section="room" for party room state, or section="all" for everything.',
			inputSchema: z.object({
				section: z
					.enum(["variables", "entities", "room", "all"])
					.default("all")
					.describe("Which section of state to read"),
				contextId: z
					.string()
					.optional()
					.describe(
						"Target context ID. If omitted, reads from the active context.",
					),
			}),
			execute: async ({ section, contextId }) => {
				const result = await ctx.onEditorCommand?.({
					command: "readState",
					payload: { section, contextId },
				});
				if (!result) {
					return { ok: false, error: "Editor not connected" };
				}
				return { ok: true, ...(result as Record<string, unknown>) };
			},
		}),

		"editor.updateState": tool({
			description:
				"Update a runtime variable in the active preview context. CAUTION: This mutates live game state. Only use when the user asks you to change a value, or when debugging requires it. Changes are not persisted to the game definition — they only affect the current runtime session.",
			inputSchema: z.object({
				key: z
					.string()
					.min(1)
					.describe(
						'The variable key to update (e.g., "score", "lives", "level")',
					),
				value: z
					.union([z.number(), z.string(), z.boolean()])
					.describe("The new value to set"),
				contextId: z
					.string()
					.optional()
					.describe(
						"Target context ID. If omitted, updates the active context.",
					),
			}),
			execute: async ({ key, value, contextId }) => {
				const result = await ctx.onEditorCommand?.({
					command: "updateState",
					payload: { key, value, contextId },
				});
				if (!result) {
					return { ok: false, error: "Editor not connected" };
				}
				return { ok: true, ...(result as Record<string, unknown>) };
			},
		}),

		"editor.inspectTarget": tool({
			description:
				'Run an inspector operation on a specific preview context. Allows querying entities, checking physics state, counting objects, etc. Common operations: "game_state" (overview), "game_find" (find entities), "game_entity" (inspect one entity), "game_count" (count entities). The operation runs against the targeted preview context.',
			inputSchema: z.object({
				operation: z
					.string()
					.min(1)
					.describe(
						'The inspector operation to run (e.g., "game_state", "game_find", "game_entity", "game_count")',
					),
				args: z
					.record(z.unknown())
					.optional()
					.describe(
						'Arguments for the inspector operation (e.g., { "template": "ball" } for game_find)',
					),
				contextId: z
					.string()
					.optional()
					.describe(
						"Target context ID. If omitted, inspects the active context.",
					),
			}),
			execute: async ({ operation, args, contextId }) => {
				const result = await ctx.onEditorCommand?.({
					command: "inspectTarget",
					payload: { operation, args: args ?? {}, contextId },
				});
				if (!result) {
					return { ok: false, error: "Editor not connected" };
				}
				return { ok: true, ...(result as Record<string, unknown>) };
			},
		}),

		askUser: tool({
			description: `Use this tool when you need to ask the user questions during game creation.
This allows you to gather user preferences, clarify ambiguous instructions,
get decisions on implementation choices, or offer direction options.
When 'custom' typing is enabled (always by default), a "Type your own answer"
option is added automatically — do NOT include "Other" or catch-all options.
Answers are returned as arrays of selected label strings.
If you recommend a specific option, make it the FIRST option and add "(Recommended)" to the label.
Set multiple: true to allow selecting more than one option.`,
			inputSchema: z.object({
				questions: z
					.array(
						z.object({
							question: z
								.string()
								.describe("The complete question to ask the user"),
							header: z
								.string()
								.describe(
									"Very short label for the question, max 30 characters",
								),
							options: z
								.array(
									z.object({
										label: z
											.string()
											.describe("Display text, 1-5 words, concise"),
										description: z
											.string()
											.describe("Short explanation of this choice"),
										iconKey: z
											.string()
											.optional()
											.describe("Icon lookup key for future visual options"),
									}),
								)
								.describe("Available choices for the user"),
							multiple: z
								.boolean()
								.optional()
								.describe("Allow selecting multiple choices (default: false)"),
						}),
					)
					.describe("Questions to ask the user"),
			}),
			// No execute — HITL suspension: SDK returns the tool call for app-level handling
		}),
	};
}

export type ChatTools = ReturnType<typeof createChatTools>;
