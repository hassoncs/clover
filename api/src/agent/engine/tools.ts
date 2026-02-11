import { tool } from 'ai';
import type { ModelMessage } from 'ai';
import { z } from 'zod';

import type { ArtifactService } from '@/agent/artifact-service';

export interface StageExecutionContext {
  runId: string;
  stepId: string;
  stepIndex: number;
  stage: string;
  userPrompt?: string;
  gameId?: string;
  previousOutputs: Partial<Record<string, unknown>>;
  artifactService?: ArtifactService;
  conversationHistory?: ModelMessage[];
}

export function createStageTools(context: StageExecutionContext) {
  return {
    readFile: tool({
      description: 'Read a file from the workspace. Returns the current content of the file.',
      inputSchema: z.object({
        filename: z.string().min(1).describe('The filename to read (e.g., "document.md", "notes.txt")'),
      }),
      execute: async ({ filename }) => {
        if (!context.artifactService) {
          return { ok: false, error: 'Storage not available' };
        }
        if (context.gameId) {
          const result = await context.artifactService.readWorkspaceFile({
            gameId: context.gameId,
            filename,
          });
          if (!result) {
            return { ok: true, exists: false, content: null };
          }
          return { ok: true, exists: true, content: result.data };
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
        if (context.gameId) {
          const { key } = await context.artifactService.storeWorkspaceFile({
            gameId: context.gameId,
            filename,
            data: content,
            contentType: 'text/plain',
          });
          return { ok: true, key, bytesWritten: content.length };
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
