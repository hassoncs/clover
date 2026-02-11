import { describe, it, expect } from 'vitest';
import { GameDefinitionSchema } from '../gameDefinition';
import flappyBirdGame from '../../../../r2/games/flappyBird/src/game';
import ballSortGame from '../../../../r2/games/ballSort/src/game';

describe('GameDefinitionSchema', () => {
  it('validates flappy bird definition', () => {
    const result = GameDefinitionSchema.safeParse(flappyBirdGame);

    expect(result.success).toBe(true);
  });

  it('validates ball sort definition', () => {
    const result = GameDefinitionSchema.safeParse(ballSortGame);

    expect(result.success).toBe(true);
  });
});
