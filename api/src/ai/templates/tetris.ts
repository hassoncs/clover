import type { GameDefinition } from '../../../../shared/src/types/GameDefinition';

export const TETRIS_TEMPLATE: GameDefinition = {
  metadata: {
    id: 'template-tetris',
    title: 'Block Puzzle',
    description: 'Clear lines by stacking falling blocks',
    version: '1.0.0',
  },
  world: {
    gravity: { x: 0, y: 0 },
    pixelsPerMeter: 50,
    bounds: { width: 12, height: 22 },
  },
  camera: {
    type: 'fixed',
    zoom: 1,
  },
  ui: {
    showScore: true,
    showTimer: true,
    scorePosition: 'top-right',
    backgroundColor: '#050505',
  },
  tetris: {
    gridId: 'main_grid',
    boardWidth: 10,
    boardHeight: 20,
    initialDropSpeed: 1,
    pieceTemplates: [
      'piece_i',
      'piece_o',
      'piece_t',
      'piece_s',
      'piece_z',
      'piece_j',
      'piece_l',
    ],
  },
  templates: {
    piece_i: {
      id: 'piece_i',
      tags: ['piece', 'cyan'],
      sprite: { type: 'rect', width: 0.8, height: 0.8, color: '#00FFFF' },
      physics: {
        bodyType: 'kinematic',
        shape: 'box',
        width: 0.8,
        height: 0.8,
        density: 0,
        friction: 0,
        restitution: 0,
        isSensor: true,
      },
      conditionalBehaviors: [
        {
          when: { hasTag: 'sys.tetris:falling' },
          priority: 1,
          behaviors: [{ type: 'sprite_effect', effect: 'glow', params: { pulse: true } }],
        },
        {
          when: { hasTag: 'sys.tetris:locked' },
          priority: 2,
          behaviors: [],
        },
        {
          when: { hasTag: 'sys.tetris:clearing' },
          priority: 3,
      behaviors: [{ type: 'sprite_effect', effect: 'flash', params: { duration: 0.3 } }],
        },
      ],
    },
    piece_o: {
      id: 'piece_o',
      tags: ['piece', 'yellow'],
      sprite: { type: 'rect', width: 0.8, height: 0.8, color: '#FFFF00' },
      physics: {
        bodyType: 'kinematic',
        shape: 'box',
        width: 0.8,
        height: 0.8,
        density: 0,
        friction: 0,
        restitution: 0,
        isSensor: true,
      },
      conditionalBehaviors: [
        {
          when: { hasTag: 'sys.tetris:falling' },
          priority: 1,
          behaviors: [{ type: 'sprite_effect', effect: 'glow', params: { pulse: true } }],
        },
        {
          when: { hasTag: 'sys.tetris:locked' },
          priority: 2,
          behaviors: [],
        },
        {
          when: { hasTag: 'sys.tetris:clearing' },
          priority: 3,
      behaviors: [{ type: 'sprite_effect', effect: 'flash', params: { duration: 0.3 } }],
        },
      ],
    },
    piece_t: {
      id: 'piece_t',
      tags: ['piece', 'purple'],
      sprite: { type: 'rect', width: 0.8, height: 0.8, color: '#AA00FF' },
      physics: {
        bodyType: 'kinematic',
        shape: 'box',
        width: 0.8,
        height: 0.8,
        density: 0,
        friction: 0,
        restitution: 0,
        isSensor: true,
      },
      conditionalBehaviors: [
        {
          when: { hasTag: 'sys.tetris:falling' },
          priority: 1,
          behaviors: [{ type: 'sprite_effect', effect: 'glow', params: { pulse: true } }],
        },
        {
          when: { hasTag: 'sys.tetris:locked' },
          priority: 2,
          behaviors: [],
        },
        {
          when: { hasTag: 'sys.tetris:clearing' },
          priority: 3,
      behaviors: [{ type: 'sprite_effect', effect: 'flash', params: { duration: 0.3 } }],
        },
      ],
    },
    piece_s: {
      id: 'piece_s',
      tags: ['piece', 'green'],
      sprite: { type: 'rect', width: 0.8, height: 0.8, color: '#00FF00' },
      physics: {
        bodyType: 'kinematic',
        shape: 'box',
        width: 0.8,
        height: 0.8,
        density: 0,
        friction: 0,
        restitution: 0,
        isSensor: true,
      },
      conditionalBehaviors: [
        {
          when: { hasTag: 'sys.tetris:falling' },
          priority: 1,
          behaviors: [{ type: 'sprite_effect', effect: 'glow', params: { pulse: true } }],
        },
        {
          when: { hasTag: 'sys.tetris:locked' },
          priority: 2,
          behaviors: [],
        },
        {
          when: { hasTag: 'sys.tetris:clearing' },
          priority: 3,
      behaviors: [{ type: 'sprite_effect', effect: 'flash', params: { duration: 0.3 } }],
        },
      ],
    },
    piece_z: {
      id: 'piece_z',
      tags: ['piece', 'red'],
      sprite: { type: 'rect', width: 0.8, height: 0.8, color: '#FF0000' },
      physics: {
        bodyType: 'kinematic',
        shape: 'box',
        width: 0.8,
        height: 0.8,
        density: 0,
        friction: 0,
        restitution: 0,
        isSensor: true,
      },
      conditionalBehaviors: [
        {
          when: { hasTag: 'sys.tetris:falling' },
          priority: 1,
          behaviors: [{ type: 'sprite_effect', effect: 'glow', params: { pulse: true } }],
        },
        {
          when: { hasTag: 'sys.tetris:locked' },
          priority: 2,
          behaviors: [],
        },
        {
          when: { hasTag: 'sys.tetris:clearing' },
          priority: 3,
      behaviors: [{ type: 'sprite_effect', effect: 'flash', params: { duration: 0.3 } }],
        },
      ],
    },
    piece_j: {
      id: 'piece_j',
      tags: ['piece', 'blue'],
      sprite: { type: 'rect', width: 0.8, height: 0.8, color: '#0000FF' },
      physics: {
        bodyType: 'kinematic',
        shape: 'box',
        width: 0.8,
        height: 0.8,
        density: 0,
        friction: 0,
        restitution: 0,
        isSensor: true,
      },
      conditionalBehaviors: [
        {
          when: { hasTag: 'sys.tetris:falling' },
          priority: 1,
          behaviors: [{ type: 'sprite_effect', effect: 'glow', params: { pulse: true } }],
        },
        {
          when: { hasTag: 'sys.tetris:locked' },
          priority: 2,
          behaviors: [],
        },
        {
          when: { hasTag: 'sys.tetris:clearing' },
          priority: 3,
      behaviors: [{ type: 'sprite_effect', effect: 'flash', params: { duration: 0.3 } }],
        },
      ],
    },
    piece_l: {
      id: 'piece_l',
      tags: ['piece', 'orange'],
      sprite: { type: 'rect', width: 0.8, height: 0.8, color: '#FF8800' },
      physics: {
        bodyType: 'kinematic',
        shape: 'box',
        width: 0.8,
        height: 0.8,
        density: 0,
        friction: 0,
        restitution: 0,
        isSensor: true,
      },
      conditionalBehaviors: [
        {
          when: { hasTag: 'sys.tetris:falling' },
          priority: 1,
          behaviors: [{ type: 'sprite_effect', effect: 'glow', params: { pulse: true } }],
        },
        {
          when: { hasTag: 'sys.tetris:locked' },
          priority: 2,
          behaviors: [],
        },
        {
          when: { hasTag: 'sys.tetris:clearing' },
          priority: 3,
      behaviors: [{ type: 'sprite_effect', effect: 'flash', params: { duration: 0.3 } }],
        },
      ],
    },
  },
  entities: [],
  rules: [],
  winCondition: {
    type: 'score',
    score: 5000,
  },
  loseCondition: {
    type: 'custom',
  },
};
