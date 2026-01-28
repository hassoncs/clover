import type { GameDefinition } from '../../../../shared/src/types/GameDefinition';

export const MATCH3_TEMPLATE: GameDefinition = {
  metadata: {
    id: 'template-match3',
    title: 'Gem Match',
    description: 'Match 3 or more gems to score points',
    version: '1.0.0',
  },
  world: {
    gravity: { x: 0, y: 0 },
    pixelsPerMeter: 50,
    bounds: { width: 12, height: 14 },
  },
  camera: {
    type: 'fixed',
    zoom: 1,
  },
  ui: {
    showScore: true,
    showTimer: true,
    scorePosition: 'top-right',
    backgroundColor: '#1a1a2e',
  },
  match3: {
    gridId: 'main_grid',
    rows: 8,
    cols: 8,
    cellSize: 1.2,
    pieceTemplates: ['piece_red', 'piece_blue', 'piece_green', 'piece_yellow'],
    minMatch: 3,
    swapDuration: 0.15,
    fallDuration: 0.1,
    clearDelay: 0.1,
  },
  templates: {
    piece_red: {
      id: 'piece_red',
      type: 'zone',
      tags: ['piece', 'red'],
      sprite: {
        type: 'circle',
        radius: 0.5,
        color: '#FF4444',
      },
      zone: {
        shape: {
          type: 'circle',
          radius: 0.5,
        },
        movement: 'kinematic',
      },
      conditionalBehaviors: [
        {
          when: { hasTag: 'sys.match3:selected' },
          priority: 2,
          behaviors: [
            { type: 'scale_oscillate', min: 0.97, max: 1.06, speed: 5 },
            { type: 'sprite_effect', effect: 'glow', params: { pulse: true } },
          ],
        },
        {
          when: { hasTag: 'sys.match3:matched' },
          priority: 3,
          behaviors: [
            { type: 'sprite_effect', effect: 'flash', params: { duration: 0.4 } },
          ],
        },
      ],
    },
    piece_blue: {
      id: 'piece_blue',
      type: 'zone',
      tags: ['piece', 'blue'],
      sprite: {
        type: 'circle',
        radius: 0.5,
        color: '#4444FF',
      },
      zone: {
        shape: {
          type: 'circle',
          radius: 0.5,
        },
        movement: 'kinematic',
      },
      conditionalBehaviors: [
        {
          when: { hasTag: 'sys.match3:selected' },
          priority: 2,
          behaviors: [
            { type: 'scale_oscillate', min: 0.97, max: 1.06, speed: 5 },
            { type: 'sprite_effect', effect: 'glow', params: { pulse: true } },
          ],
        },
        {
          when: { hasTag: 'sys.match3:matched' },
          priority: 3,
          behaviors: [
            { type: 'sprite_effect', effect: 'flash', params: { duration: 0.4 } },
          ],
        },
      ],
    },
    piece_green: {
      id: 'piece_green',
      type: 'zone',
      tags: ['piece', 'green'],
      sprite: {
        type: 'circle',
        radius: 0.5,
        color: '#44FF44',
      },
      zone: {
        shape: {
          type: 'circle',
          radius: 0.5,
        },
        movement: 'kinematic',
      },
      conditionalBehaviors: [
        {
          when: { hasTag: 'sys.match3:selected' },
          priority: 2,
          behaviors: [
            { type: 'scale_oscillate', min: 0.97, max: 1.06, speed: 5 },
            { type: 'sprite_effect', effect: 'glow', params: { pulse: true } },
          ],
        },
        {
          when: { hasTag: 'sys.match3:matched' },
          priority: 3,
          behaviors: [
            { type: 'sprite_effect', effect: 'flash', params: { duration: 0.4 } },
          ],
        },
      ],
    },
    piece_yellow: {
      id: 'piece_yellow',
      type: 'zone',
      tags: ['piece', 'yellow'],
      sprite: {
        type: 'circle',
        radius: 0.5,
        color: '#FFFF44',
      },
      zone: {
        shape: {
          type: 'circle',
          radius: 0.5,
        },
        movement: 'kinematic',
      },
      conditionalBehaviors: [
        {
          when: { hasTag: 'sys.match3:selected' },
          priority: 2,
          behaviors: [
            { type: 'scale_oscillate', min: 0.97, max: 1.06, speed: 5 },
            { type: 'sprite_effect', effect: 'glow', params: { pulse: true } },
          ],
        },
        {
          when: { hasTag: 'sys.match3:matched' },
          priority: 3,
          behaviors: [
            { type: 'sprite_effect', effect: 'flash', params: { duration: 0.4 } },
          ],
        },
      ],
    },
    grid_cell: {
      id: 'grid_cell',
      type: 'zone',
      tags: ['grid'],
      sprite: {
        type: 'rect',
        width: 1.1,
        height: 1.1,
        color: '#222222',
      },
      zone: {
        shape: {
          type: 'box',
          width: 1.1,
          height: 1.1,
        },
      },
    },
  },
  entities: [],
  rules: [],
  winCondition: {
    type: 'score',
    score: 1000,
  },
  loseCondition: {
    type: 'time_up',
    time: 60,
  },
};
