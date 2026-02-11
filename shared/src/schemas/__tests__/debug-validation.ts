import { validateGameDefinition } from '../validation/gameDefinitionValidator';

const testGame = {
  metadata: { id: 'test-game', title: 'Test Game', version: '1.0.0' },
  world: { gravity: { x: 0, y: -10 }, pixelsPerMeter: 50 },
  prefabs: {
    player: {
      id: 'player',
      tags: ['player'],
      visual: { type: 'circle', radius: 0.3, color: '#ff0000' }
    }
  },
  entities: [
    {
      id: 'player1',
      name: 'Player',
      prefab: 'player',
      transform: { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 }
    }
  ],
  rules: [
    {
      id: 'tap_rule',
      name: 'Tap',
      trigger: { type: 'tap' },
      actions: [{ type: 'set_variable', name: 'score', operation: 'add', value: 1 }]
    }
  ]
};

const result = validateGameDefinition(testGame);
console.log('Valid:', result.valid);
console.log('Errors:', JSON.stringify(result.errors, null, 2));
console.log('Warnings:', JSON.stringify(result.warnings, null, 2));
