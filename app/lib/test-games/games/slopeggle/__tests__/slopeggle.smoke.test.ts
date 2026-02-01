import { describe, it, expect } from 'vitest';
import game from '../game';

describe('slopeggle smoke test', () => {
  it('should load game definition', () => {
    expect(game).toBeDefined();
    expect(game.metadata.id).toBeDefined();
  });

  it('should have required templates', () => {
    expect(game.templates).toBeDefined();
    
    const ballTemplate = game.templates?.ball;
    const bluePegTemplate = game.templates?.bluePeg;
    const orangePegTemplate = game.templates?.orangePeg;
    
    expect(ballTemplate).toBeDefined();
    expect(bluePegTemplate).toBeDefined();
    expect(orangePegTemplate).toBeDefined();
  });

  it('should have physics world configured', () => {
    expect(game.world).toBeDefined();
    expect(game.world?.gravity).toBeDefined();
  });
});
