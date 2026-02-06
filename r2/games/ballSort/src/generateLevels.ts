#!/usr/bin/env tsx
import { generatePuzzle, generateWithMinimumTubes, type PuzzleConfig, type GeneratedPuzzle } from './puzzleGenerator';

const BALLS_PER_TUBE = 4;

export function getPuzzleConfigForLevel(level: number): PuzzleConfig {
  let numColors: number;
  if (level === 1) {
    numColors = 2;
  } else if (level === 2) {
    numColors = 3;
  } else if (level <= 5) {
    numColors = 4;
  } else if (level <= 12) {
    numColors = 5;
  } else if (level <= 25) {
    numColors = 6;
  } else if (level <= 50) {
    numColors = 7;
  } else {
    numColors = 8;
  }

  let extraTubes: number;
  if (level <= 3) {
    extraTubes = 2;
  } else if (level <= 20) {
    extraTubes = 1;
  } else {
    extraTubes = 1;
  }

  const difficulty = Math.min(10, 1 + Math.floor((level - 1) / 8));

  return {
    numColors,
    ballsPerColor: BALLS_PER_TUBE,
    extraTubes,
    difficulty,
    seed: level * 1000,
  };
}

export function shouldUseMinimumTubes(level: number): boolean {
  return level <= 30;
}

export interface PreGeneratedLevel {
  tubes: number[][];
  minMoves: number;
}

export function generateAllLevels(count: number): PreGeneratedLevel[] {
  const levels: PreGeneratedLevel[] = [];
  
  for (let level = 1; level <= count; level++) {
    const config = getPuzzleConfigForLevel(level);
    
    let puzzle: GeneratedPuzzle;
    if (shouldUseMinimumTubes(level)) {
      const { extraTubes: _, ...configWithoutExtra } = config;
      puzzle = generateWithMinimumTubes(configWithoutExtra);
    } else {
      puzzle = generatePuzzle(config);
    }
    
    levels.push({
      tubes: puzzle.tubes,
      minMoves: puzzle.minMoves,
    });
    
    if (level % 25 === 0) {
      console.error(`Generated ${level}/${count} levels...`);
    }
  }
  
  return levels;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const count = parseInt(process.argv[2] || '255');
  console.error(`Generating ${count} levels...`);
  
  const startTime = Date.now();
  const levels = generateAllLevels(count);
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  
  const output = `export const LEVELS: { tubes: number[][]; minMoves: number }[] = ${JSON.stringify(levels)};
`;
  
  console.log(output);
  console.error(`Generated ${count} levels in ${elapsed}s (~${Math.round(JSON.stringify(levels).length / 1024)}KB)`);
}
