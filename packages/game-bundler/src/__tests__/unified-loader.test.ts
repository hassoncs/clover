import { describe, it, expect } from 'vitest';
import { detectGameFormat } from '../unified-loader';
import { VirtualFileReader } from '../FileReader';
import { compileBundle } from '../compiler';

describe('detectGameFormat', () => {
  it('returns "unknown" for non-existent paths', () => {
    expect(detectGameFormat('/nonexistent/path')).toBe('unknown');
  });
});

describe('loadGameFromPath with bundles', () => {
  it('loads a valid bundle game', () => {
    const files = new Map<string, string>([
      ['manifest.json', JSON.stringify({
        name: 'testGame',
        title: 'Test Game',
        description: 'A test game',
        version: '1.0.0',
        world: { gravity: { x: 0, y: 10 }, pixelsPerMeter: 50 },
      })],
      ['templates/player.json', JSON.stringify({
        id: 'player',
        tags: ['player'],
        physics: { bodyType: 'dynamic' },
        visual: { type: 'circle', radius: 0.5, fillColor: '#ff0000' },
      })],
      ['entities/initial.json', JSON.stringify([
        { id: 'player1', template: 'player', transform: { x: 0, y: 0 } },
      ])],
      ['rules/main.json', JSON.stringify([
        { id: 'rule1', description: 'Test rule' },
      ])],
    ]);
    
    const fileReader = new VirtualFileReader('/games/testGame', files);
    const result = compileBundle('/games/testGame', { fileReader });
    
    expect(result.success).toBe(true);
    expect(result.gameDefinition).not.toBeNull();
    expect(result.gameDefinition?.metadata.title).toBe('Test Game');
    expect(result.gameDefinition?.metadata.id).toBe('testGame');
    expect(result.gameDefinition?.templates).toHaveProperty('player');
    expect(result.gameDefinition?.entities).toHaveLength(1);
  });

  it('handles missing manifest gracefully', () => {
    const files = new Map<string, string>([
      ['templates/player.json', '{}'],
    ]);
    
    const fileReader = new VirtualFileReader('/games/badGame', files);
    const result = compileBundle('/games/badGame', { fileReader });
    
    expect(result.success).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors.some(e => e.message.includes('manifest'))).toBe(true);
  });
});

describe('bundle compilation snapshots', () => {
  it('produces consistent output for a simple game', () => {
    const files = new Map<string, string>([
      ['manifest.json', JSON.stringify({
        name: 'pong',
        title: 'Pong',
        description: 'Classic pong game',
        version: '1.0.0',
        world: {
          gravity: { x: 0, y: 0 },
          pixelsPerMeter: 50,
          bounds: { width: 12, height: 16 },
        },
        variables: { score: 0 },
      })],
      ['constants.json', JSON.stringify({
        PADDLE_WIDTH: 2,
        BALL_SPEED: 5,
      })],
      ['templates/paddle.json', JSON.stringify({
        id: 'paddle',
        tags: ['paddle'],
        physics: {
          bodyType: 'kinematic',
          shapes: [{ type: 'box', width: { const: 'PADDLE_WIDTH' }, height: 0.3 }],
        },
      })],
      ['templates/ball.json', JSON.stringify({
        id: 'ball',
        tags: ['ball'],
        physics: {
          bodyType: 'dynamic',
          shapes: [{ type: 'circle', radius: 0.2 }],
        },
      })],
      ['entities/initial.json', JSON.stringify([
        { id: 'paddle1', template: 'paddle', transform: { x: 0, y: -7 } },
        { id: 'ball1', template: 'ball', transform: { x: 0, y: 0 } },
      ])],
      ['rules/gameplay.json', JSON.stringify([
        {
          id: 'ball-paddle-collision',
          trigger: { type: 'collision', entityA: { tag: 'ball' }, entityB: { tag: 'paddle' } },
          actions: [{ type: 'addScore', amount: 1 }],
        },
      ])],
    ]);

    const fileReader = new VirtualFileReader('/games/pong', files);
    const result = compileBundle('/games/pong', { fileReader });
    
    expect(result.success).toBe(true);
    expect(result.gameDefinition).toMatchSnapshot('pong-game-definition');
  });

  it('resolves constant references correctly', () => {
    const files = new Map<string, string>([
      ['manifest.json', JSON.stringify({
        name: 'constantsTest',
        title: 'Constants Test',
        world: { gravity: { x: 0, y: { const: 'GRAVITY' } } },
      })],
      ['constants.json', JSON.stringify({
        GRAVITY: -10,
        PLAYER_SIZE: 1.5,
      })],
      ['templates/player.json', JSON.stringify({
        id: 'player',
        physics: {
          shapes: [{ type: 'circle', radius: { const: 'PLAYER_SIZE' } }],
        },
      })],
      ['entities/initial.json', JSON.stringify([])],
    ]);

    const fileReader = new VirtualFileReader('/games/constants-test', files);
    const result = compileBundle('/games/constants-test', { fileReader });
    
    expect(result.success).toBe(true);
    
    const playerTemplate = result.gameDefinition?.templates.player;
    expect(playerTemplate).toBeDefined();
    
    const physics = playerTemplate?.physics as { shapes?: Array<{ type: string; radius?: number }> } | undefined;
    expect(physics?.shapes?.[0]).toEqual({
      type: 'circle',
      radius: 1.5,
    });
  });
});
