#!/usr/bin/env tsx
import { generatePuzzle, type PuzzleConfig } from './puzzleGenerator';

const BALLS_PER_TUBE = 4;
const EXTRA_TUBES = 2;

export function getPuzzleConfigForLevel(level: number): PuzzleConfig {
  let numColors: number;
  if (level === 1) {
    numColors = 2;
  } else if (level <= 3) {
    numColors = 3;
  } else if (level <= 10) {
    numColors = 4;
  } else if (level <= 30) {
    numColors = 5;
  } else if (level <= 60) {
    numColors = 6;
  } else if (level <= 120) {
    numColors = 7;
  } else {
    numColors = 8;
  }

  const difficulty = Math.min(10, 1 + Math.floor((level - 1) / 25));

  return {
    numColors,
    ballsPerColor: BALLS_PER_TUBE,
    extraTubes: EXTRA_TUBES,
    difficulty,
    seed: level * 1000,
  };
}

export interface PreGeneratedLevel {
  tubes: number[][];
  minMoves: number;
}

export function generateAllLevels(count: number): PreGeneratedLevel[] {
  const levels: PreGeneratedLevel[] = [];
  
  for (let level = 1; level <= count; level++) {
    const config = getPuzzleConfigForLevel(level);
    const puzzle = generatePuzzle(config);
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
