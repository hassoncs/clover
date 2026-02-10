import { tool } from 'ai';
import { z } from 'zod';

import type { GameDefinition } from '@slopcade/shared/types/GameDefinition';

import { GameDefinitionSchema } from '@/ai/game/schemas';
import { validateGameDefinition } from '@/ai/game/validator';
import type { ArtifactService } from '@/agent/artifact-service';

export interface StageExecutionContext {
  runId: string;
  stepId: string;
  stepIndex: number;
  stage: 'planning' | 'build' | 'refine' | 'theme' | 'asset' | 'chat';
  userPrompt?: string;
  planningDoc: string;
  gameDefinition: GameDefinition | null;
  gameId?: string;
  templates: string[];
  existingGames: Array<{ id: string; title: string; summary?: string }>;
  previousOutputs: Partial<Record<'planning' | 'build' | 'refine' | 'theme' | 'asset' | 'chat', unknown>>;
  artifactService?: ArtifactService;
}

export function createStageTools(context: StageExecutionContext) {
  return {
    readGameDefinition: tool({
      description: 'Read the current game definition from execution context or R2.',
      inputSchema: z.object({
        source: z.enum(['context', 'active', 'step']).default('context'),
      }),
      execute: async ({ source }) => {
        if (source === 'context') {
          return {
            hasGameDefinition: context.gameDefinition !== null,
            gameDefinition: context.gameDefinition,
          };
        }

        if (!context.artifactService) {
          return {
            hasGameDefinition: false,
            gameDefinition: null,
            error: 'ArtifactService not available',
          };
        }

        if (source === 'active') {
          if (!context.gameId) {
            return {
              hasGameDefinition: false,
              gameDefinition: null,
              error: 'No gameId in context',
            };
          }

          const data = await context.artifactService.readActiveDefinition(context.gameId);
          if (!data) {
            return {
              hasGameDefinition: false,
              gameDefinition: null,
            };
          }

          try {
            const parsed = JSON.parse(data);
            return {
              hasGameDefinition: true,
              gameDefinition: parsed,
            };
          } catch {
            return {
              hasGameDefinition: false,
              gameDefinition: null,
              error: 'Failed to parse active definition',
            };
          }
        }

        if (source === 'step') {
          const result = await context.artifactService.readStepArtifact({
            runId: context.runId,
            stepIndex: context.stepIndex,
            filename: 'definition.json',
          });

          if (!result) {
            return {
              hasGameDefinition: false,
              gameDefinition: null,
            };
          }

          try {
            const parsed = JSON.parse(result.data);
            return {
              hasGameDefinition: true,
              gameDefinition: parsed,
            };
          } catch {
            return {
              hasGameDefinition: false,
              gameDefinition: null,
              error: 'Failed to parse step definition',
            };
          }
        }

        return {
          hasGameDefinition: false,
          gameDefinition: null,
        };
      },
    }),

    writeGameDefinition: tool({
      description: 'Write/update game definition to context and R2. Rejects invalid definitions.',
      inputSchema: z.object({
        gameDefinition: z.unknown(),
      }),
      execute: async ({ gameDefinition }) => {
        const parsed = GameDefinitionSchema.safeParse(gameDefinition);
        if (!parsed.success) {
          return {
            ok: false,
            reason: 'schema_validation_failed',
            errors: parsed.error.issues.map(issue => issue.message),
          };
        }

        const semantic = validateGameDefinition(parsed.data as unknown as GameDefinition);
        if (!semantic.valid) {
          return {
            ok: false,
            reason: 'game_validation_failed',
            errors: semantic.errors,
          };
        }

        context.gameDefinition = parsed.data as unknown as GameDefinition;

        if (context.artifactService) {
          try {
            const { key } = await context.artifactService.storeStepArtifact({
              runId: context.runId,
              stepIndex: context.stepIndex,
              filename: 'definition.json',
              data: JSON.stringify(parsed.data, null, 2),
              contentType: 'application/json',
            });

            return { ok: true, key };
          } catch (error) {
            return {
              ok: false,
              reason: 'r2_write_failed',
              errors: [error instanceof Error ? error.message : String(error)],
            };
          }
        }

        return { ok: true };
      },
    }),

    publishGameDefinition: tool({
      description: 'Promote the current step artifact to the active game pointer.',
      inputSchema: z.object({}),
      execute: async () => {
        if (!context.artifactService) {
          return {
            ok: false,
            reason: 'artifact_service_unavailable',
          };
        }

        if (!context.gameId) {
          return {
            ok: false,
            reason: 'no_game_id',
          };
        }

        const sourceKey = `agent-runs/${context.runId}/steps/${context.stepIndex}/definition.json`;

        try {
          const result = await context.artifactService.publishToActive({
            runId: context.runId,
            gameId: context.gameId,
            sourceKey,
          });

          return {
            ok: true,
            publishedKey: result.publishedKey,
            previousKey: result.previousKey,
          };
        } catch (error) {
          return {
            ok: false,
            reason: 'publish_failed',
            error: error instanceof Error ? error.message : String(error),
          };
        }
      },
    }),

    validateGameDefinition: tool({
      description: 'Validate a game definition against schema and semantic validator.',
      inputSchema: z.object({
        gameDefinition: z.unknown().optional(),
      }),
      execute: async ({ gameDefinition }) => {
        const candidate = gameDefinition ?? context.gameDefinition;
        const parsed = GameDefinitionSchema.safeParse(candidate);
        if (!parsed.success) {
          return {
            valid: false,
            errors: parsed.error.issues.map(issue => issue.message),
          };
        }

        const semantic = validateGameDefinition(parsed.data as unknown as GameDefinition);
        return {
          valid: semantic.valid,
          errors: semantic.errors,
          warnings: semantic.warnings,
        };
      },
    }),

    readPlanningDoc: tool({
      description: 'Read the current planning document from context.',
      inputSchema: z.object({}),
      execute: async () => ({ planningDoc: context.planningDoc }),
    }),

    updatePlanningDoc: tool({
      description: 'Update the planning document in context.',
      inputSchema: z.object({
        mode: z.enum(['replace', 'append']).default('replace'),
        content: z.string().min(1),
      }),
      execute: async ({ mode, content }) => {
        context.planningDoc = mode === 'append'
          ? [context.planningDoc, content].filter(Boolean).join('\n\n')
          : content;

        return {
          ok: true,
          planningDoc: context.planningDoc,
        };
      },
    }),

    readFile: tool({
      description: 'Read a file from the workspace. Returns the current content of the file.',
      inputSchema: z.object({
        filename: z.string().min(1).describe('The filename to read (e.g., "document.md", "notes.txt")'),
      }),
      execute: async ({ filename }) => {
        if (!context.artifactService) {
          return { ok: false, error: 'Storage not available' };
        }
        const result = await context.artifactService.readStepArtifact({
          runId: context.runId,
          stepIndex: context.stepIndex,
          filename,
        });
        if (!result) {
          return { ok: true, exists: false, content: null };
        }
        return { ok: true, exists: true, content: result.data };
      },
    }),

    writeFile: tool({
      description: 'Write content to a file in the workspace. Creates or overwrites the file.',
      inputSchema: z.object({
        filename: z.string().min(1).describe('The filename to write (e.g., "document.md", "notes.txt")'),
        content: z.string().describe('The full content to write to the file'),
      }),
      execute: async ({ filename, content }) => {
        if (!context.artifactService) {
          return { ok: false, error: 'Storage not available' };
        }
        const { key } = await context.artifactService.storeStepArtifact({
          runId: context.runId,
          stepIndex: context.stepIndex,
          filename,
          data: content,
          contentType: 'text/plain',
        });
        return { ok: true, key, bytesWritten: content.length };
      },
    }),

    listTemplates: tool({
      description: 'List available game templates for reference.',
      inputSchema: z.object({}),
      execute: async () => ({ templates: context.templates }),
    }),

    searchExistingGames: tool({
      description: 'Search existing games by title/summary keywords for inspiration.',
      inputSchema: z.object({
        query: z.string().min(1),
        limit: z.number().int().positive().max(20).default(5),
      }),
      execute: async ({ query, limit }) => {
        const normalized = query.trim().toLowerCase();
        const matches = context.existingGames
          .filter(game => {
            const haystack = `${game.title} ${game.summary ?? ''}`.toLowerCase();
            return haystack.includes(normalized);
          })
          .slice(0, limit);

        return {
          query,
          matches,
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
        questions: z.array(z.object({
          question: z.string().describe('The complete question to ask the user'),
          header: z.string().describe('Very short label for the question, max 30 characters'),
          options: z.array(z.object({
            label: z.string().describe('Display text, 1-5 words, concise'),
            description: z.string().describe('Short explanation of this choice'),
            iconKey: z.string().optional().describe('Icon lookup key for future visual options'),
          })).describe('Available choices for the user'),
          multiple: z.boolean().optional().describe('Allow selecting multiple choices (default: false)'),
        })).describe('Questions to ask the user'),
      }),
      // No execute function: this tool uses the Vercel AI SDK's human-in-the-loop pattern.
      // When generateText encounters a tool without an execute function, it returns the tool call
      // in the result, allowing the application to handle the interaction and resume later.

      // No outputSchema: incompatible with generateText HITL when no execute is present.
    }),
  };
}

export type CoreTool = ReturnType<typeof createStageTools>[keyof ReturnType<typeof createStageTools>];
