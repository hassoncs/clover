import type { GameDefinition } from '../../../../shared/src/types/GameDefinition';

export const BALL_LAUNCHER_TEMPLATE: GameDefinition = {
  metadata: {
    id: 'template-ball-launcher',
    title: 'Ball Launcher',
    description: 'Launch projectiles at targets to knock them down',
    version: '1.0.0',
  },
  world: {
    gravity: { x: 0, y: 10 },
    pixelsPerMeter: 50,
    bounds: { width: 20, height: 12 },
  },
  camera: {
    type: 'fixed',
    zoom: 1,
  },
  ui: {
    showScore: true,
    showLives: true,
    scorePosition: 'top-right',
    backgroundColor: '#87CEEB',
  },
  templates: {
    projectile: {
      id: 'projectile',
      sprite: {
        type: 'circle',
        radius: 0.4,
        color: '#FF6B6B',
      },
      physics: {
        bodyType: 'dynamic',
        shape: 'circle',
        radius: 0.4,
        density: 1.5,
        friction: 0.3,
        restitution: 0.4,
        bullet: true,
      },
      tags: ['projectile'],
    },
    target: {
      id: 'target',
      sprite: {
        type: 'rect',
        width: 0.8,
        height: 0.8,
        color: '#4ECDC4',
      },
      physics: {
        bodyType: 'dynamic',
        shape: 'box',
        width: 0.8,
        height: 0.8,
        density: 0.8,
        friction: 0.5,
        restitution: 0.2,
      },
      behaviors: [
        {
          type: 'score_on_collision',
          withTags: ['projectile'],
          points: 10,
          once: true,
          showPopup: true,
        },
        {
          type: 'destroy_on_collision',
          withTags: ['ground'],
          effect: 'fade',
        },
      ],
      tags: ['target', 'destructible'],
    },
    block: {
      id: 'block',
      sprite: {
        type: 'rect',
        width: 1.0,
        height: 0.5,
        color: '#8B4513',
      },
      physics: {
        bodyType: 'dynamic',
        shape: 'box',
        width: 1.0,
        height: 0.5,
        density: 0.6,
        friction: 0.6,
        restitution: 0.1,
      },
      tags: ['block', 'destructible'],
    },
    ground: {
      id: 'ground',
      sprite: {
        type: 'rect',
        width: 20,
        height: 1,
        color: '#228B22',
      },
      physics: {
        bodyType: 'static',
        shape: 'box',
        width: 20,
        height: 1,
        density: 1,
        friction: 0.8,
        restitution: 0.1,
      },
      tags: ['ground'],
    },
  },
  entities: [
    {
      id: 'launcher',
      name: 'Launcher',
      transform: { x: 2, y: 9, angle: 0, scaleX: 1, scaleY: 1 },
      sprite: {
        type: 'circle',
        radius: 0.5,
        color: '#333333',
      },
      behaviors: [
        {
          type: 'spawn_on_event',
          event: 'tap',
          entityTemplate: 'projectile',
          spawnPosition: 'at_self',
        },
      ],
      tags: ['launcher'],
    },
    {
      id: 'ground',
      name: 'Ground',
      template: 'ground',
      transform: { x: 10, y: 11.5, angle: 0, scaleX: 1, scaleY: 1 },
    },
    {
      id: 'block-1',
      name: 'Block 1',
      template: 'block',
      transform: { x: 14, y: 10.75, angle: 0, scaleX: 1, scaleY: 1 },
    },
    {
      id: 'block-2',
      name: 'Block 2',
      template: 'block',
      transform: { x: 14, y: 10.25, angle: 0, scaleX: 1, scaleY: 1 },
    },
    {
      id: 'block-3',
      name: 'Block 3',
      template: 'block',
      transform: { x: 14, y: 9.75, angle: 0, scaleX: 1, scaleY: 1 },
    },
    {
      id: 'target-1',
      name: 'Target 1',
      template: 'target',
      transform: { x: 14, y: 9.15, angle: 0, scaleX: 1, scaleY: 1 },
    },
  ],
  rules: [
    {
      id: 'launcher-control',
      name: 'Drag to launch',
      trigger: { type: 'drag', phase: 'end', target: 'launcher' },
      actions: [
        {
          type: 'apply_impulse',
          target: { type: 'by_id', entityId: 'launcher' },
          direction: 'drag_direction',
          force: 20,
        },
      ],
    },
    {
      id: 'ammo-limit',
      name: 'Limit projectiles',
      trigger: { type: 'entity_count', tag: 'projectile', count: 3, comparison: 'gte' },
      actions: [{ type: 'game_state', state: 'lose', delay: 2 }],
      conditions: [{ type: 'entity_count', tag: 'target', min: 1 }],
    },
  ],
  winCondition: {
    type: 'destroy_all',
    tag: 'target',
  },
  loseCondition: {
    type: 'lives_zero',
  },
};
