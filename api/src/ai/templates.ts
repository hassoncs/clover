import type { GameDefinition } from '../../../shared/src/types/GameDefinition';

export type GameType =
  | 'projectile'
  | 'platformer'
  | 'stacking'
  | 'vehicle'
  | 'falling_objects'
  | 'rope_physics';

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
          type: 'control',
          controlType: 'drag_to_aim',
          force: 20,
          aimLine: true,
          maxPullDistance: 3,
        },
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
          type: 'control',
          controlType: 'tap_to_shoot',
          force: 0,
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
      transform: { x: -1, y: 8, angle: 0, scaleX: 1, scaleY: 1 },
      sprite: {
        type: 'rect',
        width: 2,
        height: 16,
        color: 'transparent',
      },
      physics: {
        bodyType: 'static',
        shape: 'box',
        width: 2,
        height: 16,
        density: 1,
        friction: 0,
        restitution: 0,
        isSensor: true,
      },
      tags: ['death-zone'],
    },
    {
      id: 'death-zone-right',
      name: 'Death Zone Right',
      transform: { x: 11, y: 8, angle: 0, scaleX: 1, scaleY: 1 },
      sprite: {
        type: 'rect',
        width: 2,
        height: 16,
        color: 'transparent',
      },
      physics: {
        bodyType: 'static',
        shape: 'box',
        width: 2,
        height: 16,
        density: 1,
        friction: 0,
        restitution: 0,
        isSensor: true,
      },
      tags: ['death-zone'],
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

export const JUMPY_CAT_TEMPLATE: GameDefinition = {
  metadata: {
    id: 'template-jumpy-cat',
    title: 'Jumpy Cat',
    description: 'Jump between platforms and collect items',
    version: '1.0.0',
  },
  world: {
    gravity: { x: 0, y: 15 },
    pixelsPerMeter: 50,
    bounds: { width: 10, height: 16 },
  },
  camera: {
    type: 'follow',
    followTarget: 'player',
    zoom: 1,
    bounds: { minX: 0, maxX: 10, minY: 0, maxY: 100 },
  },
  ui: {
    showScore: true,
    showLives: true,
    scorePosition: 'top-left',
    backgroundColor: '#87CEEB',
  },
  templates: {
    player: {
      id: 'player',
      sprite: {
        type: 'rect',
        width: 0.8,
        height: 0.8,
        color: '#FF9933',
      },
      physics: {
        bodyType: 'dynamic',
        shape: 'box',
        width: 0.8,
        height: 0.8,
        density: 1.0,
        friction: 0.3,
        restitution: 0,
        fixedRotation: true,
      },
      behaviors: [
        {
          type: 'control',
          controlType: 'tap_to_jump',
          force: 12,
          cooldown: 0.1,
        },
        {
          type: 'control',
          controlType: 'tilt_to_move',
          maxSpeed: 6,
          force: 8,
        },
      ],
      tags: ['player'],
    },
    platform: {
      id: 'platform',
      sprite: {
        type: 'rect',
        width: 2,
        height: 0.4,
        color: '#228B22',
      },
      physics: {
        bodyType: 'static',
        shape: 'box',
        width: 2,
        height: 0.4,
        density: 1,
        friction: 0.8,
        restitution: 0,
      },
      tags: ['platform', 'ground'],
    },
    collectible: {
      id: 'collectible',
      sprite: {
        type: 'circle',
        radius: 0.3,
        color: '#FFD700',
      },
      physics: {
        bodyType: 'static',
        shape: 'circle',
        radius: 0.3,
        density: 1,
        friction: 0,
        restitution: 0,
        isSensor: true,
      },
      behaviors: [
        {
          type: 'rotate',
          speed: 2,
          direction: 'clockwise',
        },
        {
          type: 'score_on_collision',
          withTags: ['player'],
          points: 10,
          once: true,
          showPopup: true,
        },
        {
          type: 'destroy_on_collision',
          withTags: ['player'],
          effect: 'fade',
        },
      ],
      tags: ['collectible', 'coin'],
    },
    enemy: {
      id: 'enemy',
      sprite: {
        type: 'circle',
        radius: 0.4,
        color: '#FF0000',
      },
      physics: {
        bodyType: 'kinematic',
        shape: 'circle',
        radius: 0.4,
        density: 1,
        friction: 0,
        restitution: 0,
      },
      behaviors: [
        {
          type: 'oscillate',
          axis: 'x',
          amplitude: 1.5,
          frequency: 0.5,
        },
      ],
      tags: ['enemy'],
    },
  },
  entities: [
    {
      id: 'player',
      name: 'Player Cat',
      template: 'player',
      transform: { x: 5, y: 14, angle: 0, scaleX: 1, scaleY: 1 },
    },
    {
      id: 'ground',
      name: 'Ground',
      template: 'platform',
      transform: { x: 5, y: 15.2, angle: 0, scaleX: 5, scaleY: 1 },
    },
    {
      id: 'platform-1',
      name: 'Platform 1',
      template: 'platform',
      transform: { x: 3, y: 12, angle: 0, scaleX: 1, scaleY: 1 },
    },
    {
      id: 'platform-2',
      name: 'Platform 2',
      template: 'platform',
      transform: { x: 7, y: 10, angle: 0, scaleX: 1, scaleY: 1 },
    },
    {
      id: 'platform-3',
      name: 'Platform 3',
      template: 'platform',
      transform: { x: 4, y: 8, angle: 0, scaleX: 1, scaleY: 1 },
    },
    {
      id: 'platform-4',
      name: 'Platform 4',
      template: 'platform',
      transform: { x: 6, y: 6, angle: 0, scaleX: 1, scaleY: 1 },
    },
    {
      id: 'platform-goal',
      name: 'Goal Platform',
      template: 'platform',
      transform: { x: 5, y: 4, angle: 0, scaleX: 1.5, scaleY: 1 },
      sprite: {
        type: 'rect',
        width: 3,
        height: 0.4,
        color: '#FFD700',
      },
      tags: ['platform', 'goal'],
    },
    {
      id: 'coin-1',
      name: 'Coin 1',
      template: 'collectible',
      transform: { x: 3, y: 11, angle: 0, scaleX: 1, scaleY: 1 },
    },
    {
      id: 'coin-2',
      name: 'Coin 2',
      template: 'collectible',
      transform: { x: 7, y: 9, angle: 0, scaleX: 1, scaleY: 1 },
    },
    {
      id: 'coin-3',
      name: 'Coin 3',
      template: 'collectible',
      transform: { x: 4, y: 7, angle: 0, scaleX: 1, scaleY: 1 },
    },
    {
      id: 'enemy-1',
      name: 'Enemy 1',
      template: 'enemy',
      transform: { x: 5, y: 5.5, angle: 0, scaleX: 1, scaleY: 1 },
    },
  ],
  rules: [
    {
      id: 'player-hit-enemy',
      name: 'Player hit by enemy',
      trigger: { type: 'collision', entityATag: 'player', entityBTag: 'enemy' },
      actions: [{ type: 'game_state', state: 'lose', delay: 0.5 }],
    },
    {
      id: 'player-reached-goal',
      name: 'Player reached goal',
      trigger: { type: 'collision', entityATag: 'player', entityBTag: 'goal' },
      actions: [{ type: 'game_state', state: 'win', delay: 0.5 }],
    },
  ],
  winCondition: {
    type: 'reach_entity',
    entityId: 'platform-goal',
  },
  loseCondition: {
    type: 'entity_destroyed',
    tag: 'player',
  },
};

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
      sprite: {
        type: 'circle',
        radius: 0.3,
        color: '#F1C40F',
      },
      physics: {
        bodyType: 'static',
        shape: 'circle',
        radius: 0.3,
        density: 1,
        friction: 0,
        restitution: 0,
        isSensor: true,
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
      sprite: {
        type: 'rect',
        width: 0.5,
        height: 4,
        color: '#FFFFFF',
        strokeColor: '#000000',
        strokeWidth: 2,
      },
      physics: {
        bodyType: 'static',
        shape: 'box',
        width: 0.5,
        height: 4,
        density: 1,
        friction: 0,
        restitution: 0,
        isSensor: true,
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
      behaviors: [
        {
          type: 'control',
          controlType: 'tilt_to_move',
          force: 15,
          maxSpeed: 12,
        },
      ],
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

export const FALLING_CATCHER_TEMPLATE: GameDefinition = {
  metadata: {
    id: 'template-falling-catcher',
    title: 'Falling Catcher',
    description: 'Catch falling objects for points, avoid bad ones',
    version: '1.0.0',
  },
  world: {
    gravity: { x: 0, y: 8 },
    pixelsPerMeter: 50,
    bounds: { width: 10, height: 14 },
  },
  camera: {
    type: 'fixed',
    zoom: 1,
  },
  ui: {
    showScore: true,
    showTimer: true,
    timerCountdown: true,
    scorePosition: 'top-center',
    backgroundColor: '#2C3E50',
  },
  templates: {
    catcher: {
      id: 'catcher',
      sprite: {
        type: 'rect',
        width: 2,
        height: 0.5,
        color: '#3498DB',
      },
      physics: {
        bodyType: 'kinematic',
        shape: 'box',
        width: 2,
        height: 0.5,
        density: 1,
        friction: 0.5,
        restitution: 0.3,
      },
      behaviors: [
        {
          type: 'control',
          controlType: 'drag_to_move',
          maxSpeed: 15,
        },
      ],
      tags: ['catcher', 'player'],
    },
    good_item: {
      id: 'good_item',
      sprite: {
        type: 'circle',
        radius: 0.4,
        color: '#2ECC71',
      },
      physics: {
        bodyType: 'dynamic',
        shape: 'circle',
        radius: 0.4,
        density: 0.5,
        friction: 0.3,
        restitution: 0.5,
      },
      behaviors: [
        {
          type: 'score_on_collision',
          withTags: ['catcher'],
          points: 10,
          once: true,
          showPopup: true,
        },
        {
          type: 'destroy_on_collision',
          withTags: ['catcher', 'ground'],
          effect: 'fade',
        },
      ],
      tags: ['good', 'falling'],
    },
    bad_item: {
      id: 'bad_item',
      sprite: {
        type: 'rect',
        width: 0.6,
        height: 0.6,
        color: '#E74C3C',
      },
      physics: {
        bodyType: 'dynamic',
        shape: 'box',
        width: 0.6,
        height: 0.6,
        density: 0.5,
        friction: 0.3,
        restitution: 0.3,
      },
      behaviors: [
        {
          type: 'destroy_on_collision',
          withTags: ['ground'],
          effect: 'fade',
        },
      ],
      tags: ['bad', 'falling'],
    },
    ground: {
      id: 'ground',
      sprite: {
        type: 'rect',
        width: 12,
        height: 1,
        color: '#34495E',
      },
      physics: {
        bodyType: 'static',
        shape: 'box',
        width: 12,
        height: 1,
        density: 1,
        friction: 0.8,
        restitution: 0,
        isSensor: true,
      },
      tags: ['ground'],
    },
    spawner: {
      id: 'spawner',
      sprite: {
        type: 'rect',
        width: 10,
        height: 0.2,
        color: 'transparent',
      },
      tags: ['spawner'],
    },
  },
  entities: [
    {
      id: 'catcher',
      name: 'Catcher',
      template: 'catcher',
      transform: { x: 5, y: 12, angle: 0, scaleX: 1, scaleY: 1 },
    },
    {
      id: 'ground',
      name: 'Ground',
      template: 'ground',
      transform: { x: 5, y: 14, angle: 0, scaleX: 1, scaleY: 1 },
    },
    {
      id: 'spawner-good',
      name: 'Good Item Spawner',
      template: 'spawner',
      transform: { x: 5, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
      behaviors: [
        {
          type: 'spawn_on_event',
          event: 'timer',
          entityTemplate: 'good_item',
          spawnPosition: 'random_in_bounds',
          bounds: { minX: 1, maxX: 9, minY: 0, maxY: 0.5 },
          interval: 1.5,
          maxSpawns: 30,
        },
      ],
    },
    {
      id: 'spawner-bad',
      name: 'Bad Item Spawner',
      template: 'spawner',
      transform: { x: 5, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
      behaviors: [
        {
          type: 'spawn_on_event',
          event: 'timer',
          entityTemplate: 'bad_item',
          spawnPosition: 'random_in_bounds',
          bounds: { minX: 1, maxX: 9, minY: 0, maxY: 0.5 },
          interval: 3,
          maxSpawns: 10,
        },
      ],
    },
  ],
  rules: [
    {
      id: 'caught-bad',
      name: 'Caught bad item',
      trigger: { type: 'collision', entityATag: 'catcher', entityBTag: 'bad' },
      actions: [
        { type: 'score', operation: 'subtract', value: 20 },
        { type: 'destroy', target: { type: 'collision_entities' } },
      ],
    },
    {
      id: 'game-timer',
      name: 'Game ends after 30 seconds',
      trigger: { type: 'timer', time: 30 },
      actions: [{ type: 'game_state', state: 'win', delay: 0 }],
    },
  ],
  winCondition: {
    type: 'survive_time',
    time: 30,
  },
  loseCondition: {
    type: 'score_below',
    score: 0,
  },
};

export const GAME_TEMPLATES: Record<GameType, GameDefinition> = {
  projectile: BALL_LAUNCHER_TEMPLATE,
  stacking: STACK_ATTACK_TEMPLATE,
  platformer: JUMPY_CAT_TEMPLATE,
  vehicle: HILL_RACER_TEMPLATE,
  falling_objects: FALLING_CATCHER_TEMPLATE,
  rope_physics: BALL_LAUNCHER_TEMPLATE, // Placeholder - rope physics needs joint support
};

export function getTemplateForGameType(gameType: GameType): GameDefinition {
  return GAME_TEMPLATES[gameType] ?? BALL_LAUNCHER_TEMPLATE;
}

export function getRandomTemplate(): GameDefinition {
  const types = Object.keys(GAME_TEMPLATES) as GameType[];
  const randomType = types[Math.floor(Math.random() * types.length)];
  return GAME_TEMPLATES[randomType];
}
