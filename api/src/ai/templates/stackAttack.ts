import type { GameDefinition } from '../../../../shared/src/types/GameDefinition';

export const STACK_ATTACK_TEMPLATE: GameDefinition = {
  metadata: {
    id: 'template-stack-attack',
    title: 'Stack Attack',
    description: 'Stack blocks as high as possible without toppling',
    version: '1.0.0',
  },
  world: {
    gravity: { x: 0, y: 10 },
    pixelsPerMeter: 50,
    bounds: { width: 10, height: 16 },
  },
  camera: {
    type: 'fixed',
    zoom: 1,
  },
  ui: {
    showScore: true,
    showTimer: false,
    scorePosition: 'top-center',
    backgroundColor: '#1a1a2e',
  },
  templates: {
    block: {
      id: 'block',
      sprite: {
        type: 'rect',
        width: 2,
        height: 0.6,
        color: '#e94560',
      },
      physics: {
        bodyType: 'dynamic',
        shape: 'box',
        width: 2,
        height: 0.6,
        density: 1.0,
        friction: 0.7,
        restitution: 0.05,
      },
      behaviors: [
        {
          type: 'score_on_collision',
          withTags: ['stack', 'ground'],
          points: 10,
          once: true,
        },
        {
          type: 'destroy_on_collision',
          withTags: ['death-zone'],
          effect: 'fade',
        },
      ],
      tags: ['block', 'stack'],
    },
    moving_block: {
      id: 'moving_block',
      sprite: {
        type: 'rect',
        width: 2,
        height: 0.6,
        color: '#16213e',
        strokeColor: '#e94560',
        strokeWidth: 3,
      },
      physics: {
        bodyType: 'kinematic',
        shape: 'box',
        width: 2,
        height: 0.6,
        density: 0,
        friction: 0,
        restitution: 0,
      },
      behaviors: [
        {
          type: 'oscillate',
          axis: 'x',
          amplitude: 3,
          frequency: 0.8,
        },
      ],
      tags: ['mover'],
    },
    ground: {
      id: 'ground',
      sprite: {
        type: 'rect',
        width: 10,
        height: 1,
        color: '#0f3460',
      },
      physics: {
        bodyType: 'static',
        shape: 'box',
        width: 10,
        height: 1,
        density: 1,
        friction: 0.9,
        restitution: 0,
      },
      tags: ['ground'],
    },
    death_zone: {
      id: 'death_zone',
      type: 'zone',
      sprite: {
        type: 'rect',
        width: 2,
        height: 16,
        color: 'transparent',
      },
      zone: {
        shape: {
          type: 'box',
          width: 2,
          height: 16,
        },
      },
      tags: ['death-zone'],
    },
  },
  entities: [
    {
      id: 'ground',
      name: 'Ground',
      template: 'ground',
      transform: { x: 5, y: 15, angle: 0, scaleX: 1, scaleY: 1 },
    },
    {
      id: 'spawner',
      name: 'Block Spawner',
      template: 'moving_block',
      transform: { x: 5, y: 2, angle: 0, scaleX: 1, scaleY: 1 },
      behaviors: [
        {
          type: 'oscillate',
          axis: 'x',
          amplitude: 3,
          frequency: 0.8,
        },
        {
          type: 'spawn_on_event',
          event: 'tap',
          entityTemplate: 'block',
          spawnPosition: 'at_self',
        },
      ],
    },
    {
      id: 'death-zone-left',
      name: 'Death Zone Left',
      template: 'death_zone',
      transform: { x: -1, y: 8, angle: 0, scaleX: 1, scaleY: 1 },
    },
    {
      id: 'death-zone-right',
      name: 'Death Zone Right',
      template: 'death_zone',
      transform: { x: 11, y: 8, angle: 0, scaleX: 1, scaleY: 1 },
    },
  ],
  rules: [
    {
      id: 'block-fell',
      name: 'Block fell off',
      trigger: { type: 'collision', entityATag: 'block', entityBTag: 'death-zone' },
      actions: [{ type: 'game_state', state: 'lose', delay: 1 }],
    },
  ],
  winCondition: {
    type: 'score',
    score: 100,
  },
  loseCondition: {
    type: 'entity_destroyed',
    tag: 'block',
  },
};
