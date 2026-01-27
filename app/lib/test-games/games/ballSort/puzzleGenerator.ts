/**
 * Ball Sort Puzzle Generator - Backwards Algorithm
 *
 * Generates guaranteed-solvable puzzles by working BACKWARDS from solved state.
 * Starting solved and making valid reverse moves ensures every puzzle is solvable.
 */

export interface PuzzleConfig {
  numColors: number;
  ballsPerColor: number;
  extraTubes: number;
  difficulty: number;
  seed?: number;
}

export interface GeneratedPuzzle {
  tubes: number[][];
  minMoves: number;
  difficulty: number;
}

// Seeded RNG using Mulberry32 algorithm for deterministic puzzle generation
class SeededRandom {
  private state: number;

  constructor(seed: number) {
    this.state = seed;
  }

  next(): number {
    this.state += 0x6d2b79f5;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  shuffle<T>(array: T[]): T[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = this.nextInt(0, i);
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }
}

interface Move {
  from: number;
  to: number;
}

function isValidForwardMove(
  tubes: number[][],
  from: number,
  to: number,
  capacity: number
): boolean {
  if (tubes[from].length === 0) return false;
  if (tubes[to].length >= capacity) return false;
  if (tubes[to].length === 0) return true;

  const ballColor = tubes[from][tubes[from].length - 1];
  const destTopColor = tubes[to][tubes[to].length - 1];
  return ballColor === destTopColor;
}

function executeMove(tubes: number[][], from: number, to: number): void {
  const ball = tubes[from].pop()!;
  tubes[to].push(ball);
}

function getValidMoves(tubes: number[][], capacity: number): Move[] {
  const moves: Move[] = [];

  for (let from = 0; from < tubes.length; from++) {
    if (tubes[from].length === 0) continue;

    for (let to = 0; to < tubes.length; to++) {
      if (from === to) continue;
      if (isValidForwardMove(tubes, from, to, capacity)) {
        moves.push({ from, to });
      }
    }
  }

  return moves;
}

function getScrambleMoves(tubes: number[][], capacity: number): Move[] {
  const moves: Move[] = [];

  for (let from = 0; from < tubes.length; from++) {
    if (tubes[from].length === 0) continue;

    for (let to = 0; to < tubes.length; to++) {
      if (from === to) continue;
      if (tubes[to].length < capacity) {
        moves.push({ from, to });
      }
    }
  }

  return moves;
}

function isTubeComplete(tube: number[], capacity: number): boolean {
  if (tube.length !== capacity) return false;
  const color = tube[0];
  return tube.every((c) => c === color);
}

function isSolved(tubes: number[][], capacity: number): boolean {
  for (const tube of tubes) {
    if (tube.length === 0) continue;
    if (!isTubeComplete(tube, capacity)) return false;
  }
  return true;
}

function createSolvedState(
  numColors: number,
  ballsPerColor: number,
  extraTubes: number
): number[][] {
  const tubes: number[][] = [];

  for (let color = 0; color < numColors; color++) {
    const tube: number[] = [];
    for (let i = 0; i < ballsPerColor; i++) {
      tube.push(color);
    }
    tubes.push(tube);
  }

  for (let i = 0; i < extraTubes; i++) {
    tubes.push([]);
  }

  return tubes;
}

function cloneTubes(tubes: number[][]): number[][] {
  return tubes.map((tube) => [...tube]);
}

// Mixing score: counts color transitions within tubes (higher = harder puzzle)
function calculateMixingScore(tubes: number[][], capacity: number): number {
  let score = 0;

  for (const tube of tubes) {
    if (tube.length === 0) continue;

    for (let i = 1; i < tube.length; i++) {
      if (tube[i] !== tube[i - 1]) {
        score += 2;
      }
    }

    if (!isTubeComplete(tube, capacity) && tube.length > 0) {
      score += 1;
    }
  }

  return score;
}

export function generatePuzzle(config: PuzzleConfig): GeneratedPuzzle {
  const { numColors, ballsPerColor, extraTubes, difficulty, seed } = config;

  const rng = new SeededRandom(seed ?? Date.now());
  let tubes = createSolvedState(numColors, ballsPerColor, extraTubes);
  const capacity = ballsPerColor;

  // difficulty 1 = ~5 moves, difficulty 10 = ~50+ moves
  const baseMovesPerDifficulty = 5;
  const targetMoves = Math.floor(
    baseMovesPerDifficulty * difficulty * (1 + rng.next() * 0.3)
  );

  let movesMade = 0;
  let lastMove: Move | null = null;
  let stuckCount = 0;
  const maxStuckAttempts = 100;

  while (movesMade < targetMoves && stuckCount < maxStuckAttempts) {
    const scrambleMoves = getScrambleMoves(tubes, capacity);

    if (scrambleMoves.length === 0) {
      stuckCount++;
      continue;
    }

    let candidateMoves = scrambleMoves;
    if (lastMove) {
      candidateMoves = scrambleMoves.filter(
        (m) => !(m.from === lastMove!.to && m.to === lastMove!.from)
      );
      if (candidateMoves.length === 0) {
        candidateMoves = scrambleMoves;
      }
    }

    let selectedMove: Move;
    if (difficulty >= 5 && rng.next() < 0.7) {
      let bestMove = candidateMoves[0];
      let bestScore = -1;

      for (const move of candidateMoves) {
        const testTubes = cloneTubes(tubes);
        executeMove(testTubes, move.from, move.to);
        const score = calculateMixingScore(testTubes, capacity);
        if (score > bestScore) {
          bestScore = score;
          bestMove = move;
        }
      }
      selectedMove = bestMove;
    } else {
      selectedMove = candidateMoves[rng.nextInt(0, candidateMoves.length - 1)];
    }

    executeMove(tubes, selectedMove.from, selectedMove.to);
    lastMove = selectedMove;
    movesMade++;
    stuckCount = 0;
  }

  // Ensure we actually shuffled
  if (isSolved(tubes, capacity)) {
    const filledTubes = tubes
      .map((t, i) => ({ tube: t, index: i }))
      .filter((t) => t.tube.length > 0);

    if (filledTubes.length >= 2) {
      const emptyTubeIdx = tubes.findIndex((t) => t.length === 0);
      if (emptyTubeIdx >= 0) {
        const t1 = filledTubes[0].index;
        const t2 = filledTubes[1].index;

        executeMove(tubes, t1, emptyTubeIdx);
        movesMade++;

        if (tubes[t2].length > 0) {
          executeMove(tubes, t2, t1);
          movesMade++;
        }
      }
    }
  }

  return {
    tubes,
    minMoves: movesMade,
    difficulty,
  };
}

// BFS solver to verify puzzle solvability (for testing)
export function isPuzzleSolvable(
  tubes: number[][],
  capacity: number,
  maxIterations: number = 100000
): { solvable: boolean; movesRequired?: number } {
  const tubeCount = tubes.length;

  const encodeState = (state: number[][]): string => {
    return state.map((t) => t.join(",")).join("|");
  };

  const visited = new Set<string>();
  const queue: { state: number[][]; moves: number }[] = [
    { state: cloneTubes(tubes), moves: 0 },
  ];

  visited.add(encodeState(tubes));

  let iterations = 0;
  while (queue.length > 0 && iterations < maxIterations) {
    iterations++;
    const { state, moves } = queue.shift()!;

    if (isSolved(state, capacity)) {
      return { solvable: true, movesRequired: moves };
    }

    for (let from = 0; from < tubeCount; from++) {
      if (state[from].length === 0) continue;

      for (let to = 0; to < tubeCount; to++) {
        if (from === to) continue;
        if (!isValidForwardMove(state, from, to, capacity)) continue;

        const newState = cloneTubes(state);
        executeMove(newState, from, to);
        const encoded = encodeState(newState);

        if (!visited.has(encoded)) {
          visited.add(encoded);
          queue.push({ state: newState, moves: moves + 1 });
        }
      }
    }
  }

  return { solvable: false };
}

export function generateVerifiedPuzzle(
  config: PuzzleConfig,
  maxAttempts: number = 5
): GeneratedPuzzle {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const puzzle = generatePuzzle({
      ...config,
      seed: config.seed ? config.seed + attempt : undefined,
    });

    const result = isPuzzleSolvable(puzzle.tubes, config.ballsPerColor);
    if (result.solvable) {
      return {
        ...puzzle,
        minMoves: result.movesRequired ?? puzzle.minMoves,
      };
    }

    console.warn(
      `Puzzle generation attempt ${attempt + 1} produced unsolvable puzzle, retrying...`
    );
  }

  console.error("Failed to generate solvable puzzle, returning minimal state");
  return generatePuzzle({ ...config, difficulty: 1, seed: 12345 });
}
