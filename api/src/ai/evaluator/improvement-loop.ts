import type { GameDefinition } from '../../../../shared/src/types/GameDefinition';
import type { AIConfig } from '../generator';
import { generateGame, refineGame } from '../generator';
import { evaluateGame, evaluateGameStructure } from './index';
import type { EvaluationConfig, GameEvaluation } from './types';

export interface ImprovementLoopConfig {
  generationConfig: AIConfig;
  evaluationConfig: EvaluationConfig;
  maxIterations?: number;
  targetScore?: number;
  minScoreToIterate?: number;
}

export interface IterationRecord {
  iteration: number;
  game: GameDefinition;
  evaluation: GameEvaluation;
  action: 'initial' | 'refined' | 'regenerated';
  durationMs: number;
}

export interface ImprovementLoopResult {
  success: boolean;
  finalGame?: GameDefinition;
  finalEvaluation?: GameEvaluation;
  iterations: IterationRecord[];
  totalDurationMs: number;
  stoppedReason: 'target_reached' | 'max_iterations' | 'score_too_low' | 'generation_failed' | 'evaluation_failed';
}

export async function runImprovementLoop(
  prompt: string,
  config: ImprovementLoopConfig,
  onIteration?: (record: IterationRecord) => void
): Promise<ImprovementLoopResult> {
  const {
    generationConfig,
    evaluationConfig,
    maxIterations = 3,
    targetScore = 80,
    minScoreToIterate = 40,
  } = config;

  const startTime = Date.now();
  const iterations: IterationRecord[] = [];

  const genResult = await generateGame(prompt, generationConfig);

  if (!genResult.success || !genResult.game) {
    return {
      success: false,
      iterations: [],
      totalDurationMs: Date.now() - startTime,
      stoppedReason: 'generation_failed',
    };
  }

  let currentGame = genResult.game;
  let currentEvaluation: GameEvaluation | undefined;

  for (let i = 0; i < maxIterations; i++) {
    const iterStart = Date.now();

    const evalResult = await evaluateGame(
      {
        gameDefinition: currentGame,
        originalPrompt: prompt,
      },
      evaluationConfig
    );

    if (!evalResult.success || !evalResult.evaluation) {
      return {
        success: false,
        finalGame: currentGame,
        iterations,
        totalDurationMs: Date.now() - startTime,
        stoppedReason: 'evaluation_failed',
      };
    }

    currentEvaluation = evalResult.evaluation;

    const record: IterationRecord = {
      iteration: i,
      game: currentGame,
      evaluation: currentEvaluation,
      action: i === 0 ? 'initial' : 'refined',
      durationMs: Date.now() - iterStart,
    };

    iterations.push(record);
    onIteration?.(record);

    if (currentEvaluation.overall >= targetScore) {
      return {
        success: true,
        finalGame: currentGame,
        finalEvaluation: currentEvaluation,
        iterations,
        totalDurationMs: Date.now() - startTime,
        stoppedReason: 'target_reached',
      };
    }

    if (currentEvaluation.overall < minScoreToIterate) {
      return {
        success: false,
        finalGame: currentGame,
        finalEvaluation: currentEvaluation,
        iterations,
        totalDurationMs: Date.now() - startTime,
        stoppedReason: 'score_too_low',
      };
    }

    if (i < maxIterations - 1) {
      const refinementPrompt = buildRefinementPrompt(currentEvaluation);
      const refineResult = await refineGame(currentGame, refinementPrompt, generationConfig);

      if (refineResult.success && refineResult.game) {
        currentGame = refineResult.game;
      } else {
        const regenResult = await generateGame(prompt, generationConfig);
        if (regenResult.success && regenResult.game) {
          currentGame = regenResult.game;
          iterations[iterations.length - 1].action = 'regenerated';
        }
      }
    }
  }

  return {
    success: currentEvaluation ? currentEvaluation.overall >= targetScore : false,
    finalGame: currentGame,
    finalEvaluation: currentEvaluation,
    iterations,
    totalDurationMs: Date.now() - startTime,
    stoppedReason: 'max_iterations',
  };
}

function buildRefinementPrompt(evaluation: GameEvaluation): string {
  const parts: string[] = [];

  if (evaluation.issues.length > 0) {
    parts.push(`Fix these issues:\n${evaluation.issues.map(i => `- ${i}`).join('\n')}`);
  }

  if (!evaluation.structural.hasWinCondition) {
    parts.push('Add a clear win condition');
  }

  if (!evaluation.structural.hasLoseCondition) {
    parts.push('Add a clear lose condition');
  }

  if (!evaluation.structural.hasPlayerControl) {
    parts.push('Add player controls (tap, drag, or keyboard input rules)');
  }

  if (evaluation.dimensions.visualAppeal < 60) {
    parts.push('Improve visual clarity and use more distinct colors');
  }

  if (evaluation.dimensions.layoutBalance < 60) {
    parts.push('Improve entity positioning and screen layout');
  }

  if (evaluation.suggestions.length > 0 && parts.length < 3) {
    parts.push(`Consider: ${evaluation.suggestions[0]}`);
  }

  return parts.join('\n\n');
}

export async function quickEvaluate(
  gameDefinition: GameDefinition
): Promise<{ score: number; issues: string[] }> {
  const structural = evaluateGameStructure(gameDefinition);
  const issues: string[] = [];
  let score = 50;

  if (!structural.structural.hasWinCondition) {
    issues.push('Missing win condition');
    score -= 15;
  }

  if (!structural.structural.hasLoseCondition) {
    issues.push('Missing lose condition');
    score -= 10;
  }

  if (!structural.structural.hasPlayerControl) {
    issues.push('No player controls detected');
    score -= 20;
  }

  if (!structural.structural.entityCountReasonable) {
    const count = gameDefinition.entities?.length ?? 0;
    if (count < 3) {
      issues.push(`Too few entities (${count})`);
      score -= 15;
    } else if (count > 50) {
      issues.push(`Too many entities (${count})`);
      score -= 10;
    }
  }

  if (!structural.structural.physicsConfigured) {
    issues.push('Physics values may be unreasonable');
    score -= 5;
  }

  if (gameDefinition.templates) {
    score += Math.min(20, Object.keys(gameDefinition.templates).length * 3);
  }

  if (gameDefinition.rules && gameDefinition.rules.length > 0) {
    score += Math.min(15, gameDefinition.rules.length * 2);
  }

  return {
    score: Math.max(0, Math.min(100, score)),
    issues,
  };
}
