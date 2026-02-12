import { tool } from "ai";
import { z } from "zod";

import type { ArtifactService } from "@/agent/artifact-service";
import { getSkillById } from "@/ai/skills";
import type { GitService } from "@/services/git/GitService";

export interface ChatToolContext {
	gameId: string;
	artifactService: ArtifactService;
	gitService?: GitService;
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
				if (ctx.gitService) {
					const data = await ctx.gitService.readFile(ctx.gameId, filename);
					if (!data) {
						return { ok: true, exists: false, content: null };
					}
					const content = new TextDecoder().decode(data);
					return { ok: true, exists: true, content };
				}

				const result = await ctx.artifactService.readWorkspaceFile({
					gameId: ctx.gameId,
					filename,
				});
				if (!result) {
					return { ok: true, exists: false, content: null };
				}
				return { ok: true, exists: true, content: result.data };
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
				if (ctx.gitService) {
					const sha = await ctx.gitService.commitFiles(
						ctx.gameId,
						[{ path: filename, content }],
						`AI: Update ${filename}`,
						{ name: "AI Assistant", email: "ai@slopcade.app" },
					);
					return { ok: true, commitSha: sha, bytesWritten: content.length };
				}

				const { key } = await ctx.artifactService.storeWorkspaceFile({
					gameId: ctx.gameId,
					filename,
					data: content,
					contentType: "text/plain",
				});
				return { ok: true, key, bytesWritten: content.length };
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
				if (ctx.gitService) {
					const allFiles = await ctx.gitService.listFiles(ctx.gameId);
					const filtered = prefix
						? allFiles.filter((f) => f.startsWith(prefix))
						: allFiles;
					return {
						ok: true,
						files: filtered.map((f) => ({ filename: f })),
					};
				}

				const files = await ctx.artifactService.listWorkspaceFileMeta(
					ctx.gameId,
				);
				const filtered = prefix
					? files.filter((f) => f.filename.startsWith(prefix))
					: files;

				return {
					ok: true,
					files: filtered.map((f) => ({
						filename: f.filename,
						size: f.size,
						uploaded: f.uploaded,
						contentHash: null,
					})),
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
				if (ctx.gitService) {
					const fileResults = await Promise.all(
						filenames.map(async (filename) => {
							const data = await ctx.gitService!.readFile(ctx.gameId, filename);
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
				}

				const results = await ctx.artifactService.readWorkspaceFiles(
					ctx.gameId,
					filenames,
				);

				return {
					ok: true,
					files: filenames.map((filename) => {
						const content = results.get(filename);
						return {
							filename,
							exists: content !== undefined,
							content: content ?? null,
							size: content?.length ?? 0,
						};
					}),
				};
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
				if (!ctx.gitService) {
					return { ok: false, error: "Git history not available" };
				}
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
