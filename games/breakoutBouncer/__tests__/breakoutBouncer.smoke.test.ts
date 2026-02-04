import { describe, it, expect } from 'vitest';
import game from '../game';

describe('breakoutBouncer smoke test', () => {
  it('should load game definition', () => {
    expect(game).toBeDefined();
    expect(game.metadata.id).toBeDefined();
  });

  it('should have required templates', () => {
    expect(game.templates).toBeDefined();
    
    const ballTemplate = game.templates?.ball;
    const paddleTemplate = game.templates?.paddle;
    const brickRedTemplate = game.templates?.brickRed;
    
    expect(ballTemplate).toBeDefined();
    expect(paddleTemplate).toBeDefined();
    expect(brickRedTemplate).toBeDefined();
  });

  it('should have physics world configured', () => {
    expect(game.world).toBeDefined();
    expect(game.world?.gravity).toBeDefined();
  });
});
