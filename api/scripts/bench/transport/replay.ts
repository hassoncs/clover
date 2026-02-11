import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import type { RecordingEvent, RunContext, Transport, TurnInput, TurnResult } from '../core/types';

interface ReplayState {
  turns: TurnResult[];
  cursor: number;
}

async function resolveEventsFile(baseDir: string): Promise<string> {
  try {
    const directFile = path.join(baseDir, 'events.jsonl');
    await readFile(directFile, 'utf8');
    return directFile;
  } catch {
    const entries = await readdir(baseDir, { withFileTypes: true });
    const runs = entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
    const latestRun = runs.length > 0 ? runs[runs.length - 1] : undefined;
    if (!latestRun) {
      throw new Error(`No recording runs found under ${baseDir}`);
    }

    return path.join(baseDir, latestRun, 'events.jsonl');
  }
}

async function loadReplayTurns(recordingsDir: string, ctx: RunContext): Promise<TurnResult[]> {
  const baseDir = path.join(recordingsDir, ctx.suite.id, ctx.case_.id, ctx.variant.id);
  const eventsFile = await resolveEventsFile(baseDir);
  const content = await readFile(eventsFile, 'utf8');
  const lines = content.split('\n').filter((line) => line.trim().length > 0);

  const events = lines.map((line) => JSON.parse(line) as RecordingEvent);
  const assistantTurns = events
    .filter((event) => event.type === 'assistant')
    .map((event) => event.payload as TurnResult);

  if (assistantTurns.length === 0) {
    throw new Error(`No assistant events found in ${eventsFile}`);
  }

  return assistantTurns;
}

export function createReplayTransport(opts: { recordingsDir: string }): Transport {
  const stateByKey = new Map<string, ReplayState>();

  return {
    async runTurn(ctx: RunContext, _turn: TurnInput): Promise<TurnResult> {
      const key = `${ctx.suite.id}::${ctx.case_.id}::${ctx.variant.id}`;
      let state = stateByKey.get(key);

      if (!state) {
        const turns = await loadReplayTurns(opts.recordingsDir, ctx);
        state = { turns, cursor: 0 };
        stateByKey.set(key, state);
      }

      if (state.cursor >= state.turns.length) {
        throw new Error(`No more recorded turns available for ${key}`);
      }

      const turn = state.turns[state.cursor];
      state.cursor += 1;
      return {
        ...turn,
        raw: turn.raw,
      };
    },
  };
}
