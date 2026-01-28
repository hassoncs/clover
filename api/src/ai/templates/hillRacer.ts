import type { GameDefinition } from '../../../../shared/src/types/GameDefinition';

export const HILL_RACER_TEMPLATE: GameDefinition = {
  metadata: {
    id: 'template-hill-racer',
    title: 'Hill Racer',
    description: 'Drive over hills and collect coins',
    version: '1.0.0',
  },
  world: {
    gravity: { x: 0, y: 10 },
    pixelsPerMeter: 50,
    bounds: { width: 100, height: 20 },
  },
  camera: {
    type: 'follow',
    followTarget: 'vehicle',
    zoom: 1,
    bounds: { minX: 0, maxX: 100, minY: 0, maxY: 20 },
  },
  ui: {
    showScore: true,
    showTimer: true,
    timerCountdown: false,
    scorePosition: 'top-right',
    backgroundColor: '#87CEEB',
  },
  templates: {
    vehicle_body: {
      id: 'vehicle_body',
      sprite: {
        type: 'rect',
        width: 2.4,
        height: 0.8,
        color: '#E74C3C',
      },
      physics: {
        bodyType: 'dynamic',
        shape: 'box',
        width: 2.4,
        height: 0.8,
        density: 1.0,
        friction: 0.3,
        restitution: 0.1,
      },
      tags: ['vehicle'],
    },
    wheel: {
      id: 'wheel',
      sprite: {
        type: 'circle',
        radius: 0.4,
        color: '#2C3E50',
      },
      physics: {
        bodyType: 'dynamic',
        shape: 'circle',
        radius: 0.4,
        density: 0.8,
        friction: 0.9,
        restitution: 0.1,
      },
      tags: ['wheel'],
    },
    ground_segment: {
      id: 'ground_segment',
      sprite: {
        type: 'polygon',
        vertices: [
          { x: -5, y: 0 },
          { x: 5, y: 0 },
          { x: 5, y: 2 },
          { x: -5, y: 2 },
        ],
        color: '#228B22',
      },
      physics: {
        bodyType: 'static',
        shape: 'polygon',
        vertices: [
          { x: -5, y: 0 },
          { x: 5, y: 0 },
          { x: 5, y: 2 },
          { x: -5, y: 2 },
        ],
        density: 1,
        friction: 0.8,
        restitution: 0,
      },
      tags: ['ground'],
    },
    coin: {
      id: 'coin',
      type: 'zone',
      sprite: {
        type: 'circle',
        radius: 0.3,
        color: '#F1C40F',
      },
      zone: {
        shape: {
          type: 'circle',
          radius: 0.3,
        },
      },
      behaviors: [
        {
          type: 'score_on_collision',
          withTags: ['vehicle', 'wheel'],
          points: 10,
          once: true,
          showPopup: true,
        },
        {
          type: 'destroy_on_collision',
          withTags: ['vehicle', 'wheel'],
          effect: 'fade',
        },
      ],
      tags: ['coin', 'collectible'],
    },
    finish: {
      id: 'finish',
      type: 'zone',
      sprite: {
        type: 'rect',
        width: 0.5,
        height: 4,
        color: '#FFFFFF',
        strokeColor: '#000000',
        strokeWidth: 2,
      },
      zone: {
        shape: {
          type: 'box',
          width: 0.5,
          height: 4,
        },
      },
      tags: ['finish', 'goal'],
    },
  },
  entities: [
    {
      id: 'vehicle',
      name: 'Vehicle Body',
      template: 'vehicle_body',
      transform: { x: 3, y: 8, angle: 0, scaleX: 1, scaleY: 1 },
      behaviors: [],
    },
    {
      id: 'ground-1',
      name: 'Ground 1',
      template: 'ground_segment',
      transform: { x: 5, y: 12, angle: 0, scaleX: 1, scaleY: 1 },
    },
    {
      id: 'ground-2',
      name: 'Ground 2 (hill)',
      transform: { x: 15, y: 11, angle: -0.15, scaleX: 1, scaleY: 1 },
      sprite: {
        type: 'polygon',
        vertices: [
          { x: -5, y: 0 },
          { x: 5, y: 0 },
          { x: 5, y: 2 },
          { x: -5, y: 2 },
        ],
        color: '#228B22',
      },
      physics: {
        bodyType: 'static',
        shape: 'polygon',
        vertices: [
          { x: -5, y: 0 },
          { x: 5, y: 0 },
          { x: 5, y: 2 },
          { x: -5, y: 2 },
        ],
        density: 1,
        friction: 0.8,
        restitution: 0,
      },
      tags: ['ground'],
    },
    {
      id: 'ground-3',
      name: 'Ground 3',
      transform: { x: 25, y: 10, angle: 0, scaleX: 1, scaleY: 1 },
      sprite: {
        type: 'polygon',
        vertices: [
          { x: -5, y: 0 },
          { x: 5, y: 0 },
          { x: 5, y: 2 },
          { x: -5, y: 2 },
        ],
        color: '#228B22',
      },
      physics: {
        bodyType: 'static',
        shape: 'polygon',
        vertices: [
          { x: -5, y: 0 },
          { x: 5, y: 0 },
          { x: 5, y: 2 },
          { x: -5, y: 2 },
        ],
        density: 1,
        friction: 0.8,
        restitution: 0,
      },
      tags: ['ground'],
    },
    {
      id: 'coin-1',
      name: 'Coin 1',
      template: 'coin',
      transform: { x: 10, y: 8, angle: 0, scaleX: 1, scaleY: 1 },
    },
    {
      id: 'coin-2',
      name: 'Coin 2',
      template: 'coin',
      transform: { x: 18, y: 7, angle: 0, scaleX: 1, scaleY: 1 },
    },
    {
      id: 'coin-3',
      name: 'Coin 3',
      template: 'coin',
      transform: { x: 22, y: 6, angle: 0, scaleX: 1, scaleY: 1 },
    },
    {
      id: 'finish-line',
      name: 'Finish Line',
      template: 'finish',
      transform: { x: 28, y: 8, angle: 0, scaleX: 1, scaleY: 1 },
    },
  ],
  rules: [
    {
      id: 'vehicle-drive',
      name: 'Tilt to drive',
      trigger: { type: 'tilt', threshold: 0.1 },
      actions: [
        {
          type: 'move',
          target: { type: 'by_id', entityId: 'vehicle' },
          direction: 'tilt_direction',
          speed: 12,
        },
      ],
    },
    {
      id: 'reach-finish',
      name: 'Reached finish line',
      trigger: { type: 'collision', entityATag: 'vehicle', entityBTag: 'finish' },
      actions: [{ type: 'game_state', state: 'win', delay: 0.5 }],
    },
    {
      id: 'vehicle-flipped',
      name: 'Vehicle flipped over',
      trigger: { type: 'timer', time: 1, repeat: true },
      conditions: [{ type: 'entity_exists', entityId: 'vehicle' }],
      actions: [],
    },
  ],
  winCondition: {
    type: 'reach_entity',
    entityId: 'finish-line',
  },
  loseCondition: {
    type: 'entity_destroyed',
    tag: 'vehicle',
  },
};
