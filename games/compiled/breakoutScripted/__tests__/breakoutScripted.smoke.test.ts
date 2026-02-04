import { describe, it, expect } from 'vitest';
import game from '../game';

describe('breakoutScripted smoke test', () => {
  it('should load game definition', () => {
    expect(game).toBeDefined();
    expect(game.metadata.id).toBe('test-breakout-scripted');
  });

  it('should have required templates', () => {
    expect(game.templates).toBeDefined();
    
    const ballTemplate = game.templates?.ball;
    const paddleTemplate = game.templates?.paddle;
    
    expect(ballTemplate).toBeDefined();
    expect(paddleTemplate).toBeDefined();
    expect(ballTemplate?.tags).toContain('ball');
    expect(paddleTemplate?.tags).toContain('paddle');
  });

  it('should have script defined', () => {
    expect(game.script).toBeDefined();
    expect(typeof game.script).toBe('string');
    expect(game.script!.length).toBeGreaterThan(0);
  });
});
