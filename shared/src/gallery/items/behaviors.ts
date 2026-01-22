import type { BehaviorType } from '../../types/behavior';
import type { BehaviorGalleryItem, ParamDefinition } from '../types';
import { registerGalleryItem } from '../registry';

interface BehaviorDefinition {
  type: BehaviorType;
  title: string;
  description: string;
  category: BehaviorGalleryItem['category'];
  params: ParamDefinition[];
  defaultParams: Record<string, unknown>;
}

const BEHAVIOR_DEFINITIONS: BehaviorDefinition[] = [
  {
    type: 'move',
    title: 'Move',
    description: 'Moves entity in a direction at constant speed',
    category: 'movement',
    params: [
      { key: 'direction', type: 'select', displayName: 'Direction', options: ['left', 'right', 'up', 'down', 'toward_target', 'away_from_target'], defaultValue: 'right' },
      { key: 'speed', type: 'number', displayName: 'Speed', min: 0, max: 500, step: 10, defaultValue: 100 },
      { key: 'movementType', type: 'select', displayName: 'Movement Type', options: ['velocity', 'force'], defaultValue: 'velocity' },
    ],
    defaultParams: { direction: 'right', speed: 100, movementType: 'velocity' },
  },
  {
    type: 'rotate',
    title: 'Rotate',
    description: 'Continuously rotates entity',
    category: 'movement',
    params: [
      { key: 'speed', type: 'number', displayName: 'Speed (deg/s)', min: -360, max: 360, step: 15, defaultValue: 90 },
      { key: 'direction', type: 'select', displayName: 'Direction', options: ['clockwise', 'counterclockwise'], defaultValue: 'clockwise' },
      { key: 'affectsPhysics', type: 'boolean', displayName: 'Affects Physics', defaultValue: false },
    ],
    defaultParams: { speed: 90, direction: 'clockwise', affectsPhysics: false },
  },
  {
    type: 'rotate_toward',
    title: 'Rotate Toward',
    description: 'Rotates to face a target entity',
    category: 'movement',
    params: [
      { key: 'target', type: 'select', displayName: 'Target', options: ['player', 'touch'], defaultValue: 'player' },
      { key: 'speed', type: 'number', displayName: 'Speed', min: 0, max: 360, step: 15, defaultValue: 180 },
      { key: 'offset', type: 'number', displayName: 'Angle Offset', min: -180, max: 180, step: 15, defaultValue: 0 },
    ],
    defaultParams: { target: 'player', speed: 180, offset: 0 },
  },
  {
    type: 'follow',
    title: 'Follow',
    description: 'Follows a target entity',
    category: 'movement',
    params: [
      { key: 'target', type: 'select', displayName: 'Target', options: ['player', 'touch'], defaultValue: 'player' },
      { key: 'speed', type: 'number', displayName: 'Speed', min: 0, max: 500, step: 10, defaultValue: 100 },
      { key: 'minDistance', type: 'number', displayName: 'Min Distance', min: 0, max: 200, step: 10, defaultValue: 0 },
      { key: 'maxDistance', type: 'number', displayName: 'Max Distance', min: 0, max: 1000, step: 50, defaultValue: 500 },
    ],
    defaultParams: { target: 'player', speed: 100, minDistance: 0, maxDistance: 500 },
  },
  {
    type: 'bounce',
    title: 'Bounce',
    description: 'Bounces within defined bounds',
    category: 'movement',
    params: [
      { key: 'minX', type: 'number', displayName: 'Min X', min: 0, max: 1000, step: 10, defaultValue: 0 },
      { key: 'maxX', type: 'number', displayName: 'Max X', min: 0, max: 1000, step: 10, defaultValue: 400 },
      { key: 'minY', type: 'number', displayName: 'Min Y', min: 0, max: 1000, step: 10, defaultValue: 0 },
      { key: 'maxY', type: 'number', displayName: 'Max Y', min: 0, max: 1000, step: 10, defaultValue: 600 },
    ],
    defaultParams: { minX: 0, maxX: 400, minY: 0, maxY: 600 },
  },
  {
    type: 'oscillate',
    title: 'Oscillate',
    description: 'Moves back and forth in a sine wave pattern',
    category: 'movement',
    params: [
      { key: 'axis', type: 'select', displayName: 'Axis', options: ['x', 'y', 'both'], defaultValue: 'x' },
      { key: 'amplitude', type: 'number', displayName: 'Amplitude', min: 1, max: 200, step: 5, defaultValue: 50 },
      { key: 'frequency', type: 'number', displayName: 'Frequency', min: 0.1, max: 5, step: 0.1, defaultValue: 1 },
      { key: 'phase', type: 'number', displayName: 'Phase', min: 0, max: 360, step: 15, defaultValue: 0 },
    ],
    defaultParams: { axis: 'x', amplitude: 50, frequency: 1, phase: 0 },
  },
  {
    type: 'control',
    title: 'Control',
    description: 'Player input controls for the entity',
    category: 'control',
    params: [
      { key: 'controlType', type: 'select', displayName: 'Control Type', options: ['tap_to_jump', 'tap_to_shoot', 'tap_to_flip', 'drag_to_aim', 'drag_to_move', 'tilt_to_move', 'tilt_gravity', 'buttons'], defaultValue: 'tap_to_jump' },
      { key: 'force', type: 'number', displayName: 'Force', min: 0, max: 1000, step: 50, defaultValue: 300 },
      { key: 'cooldown', type: 'number', displayName: 'Cooldown (s)', min: 0, max: 5, step: 0.1, defaultValue: 0 },
      { key: 'maxSpeed', type: 'number', displayName: 'Max Speed', min: 0, max: 500, step: 10, defaultValue: 200 },
    ],
    defaultParams: { controlType: 'tap_to_jump', force: 300, cooldown: 0, maxSpeed: 200 },
  },
  {
    type: 'destroy_on_collision',
    title: 'Destroy on Collision',
    description: 'Destroys entity when colliding with tagged entities',
    category: 'interaction',
    params: [
      { key: 'withTags', type: 'select', displayName: 'Collide With', options: ['enemy', 'player', 'obstacle', 'projectile', 'collectible'], defaultValue: 'enemy' },
      { key: 'effect', type: 'select', displayName: 'Effect', options: ['none', 'fade', 'explode', 'shrink'], defaultValue: 'fade' },
      { key: 'destroyOther', type: 'boolean', displayName: 'Destroy Other', defaultValue: false },
      { key: 'minImpactVelocity', type: 'number', displayName: 'Min Impact Velocity', min: 0, max: 500, step: 10, defaultValue: 0 },
    ],
    defaultParams: { withTags: 'enemy', effect: 'fade', destroyOther: false, minImpactVelocity: 0 },
  },
  {
    type: 'score_on_collision',
    title: 'Score on Collision',
    description: 'Awards points when colliding with tagged entities',
    category: 'interaction',
    params: [
      { key: 'withTags', type: 'select', displayName: 'Collide With', options: ['enemy', 'collectible', 'goal'], defaultValue: 'collectible' },
      { key: 'points', type: 'number', displayName: 'Points', min: -1000, max: 1000, step: 10, defaultValue: 100 },
      { key: 'once', type: 'boolean', displayName: 'Only Once', defaultValue: true },
      { key: 'showPopup', type: 'boolean', displayName: 'Show Popup', defaultValue: true },
    ],
    defaultParams: { withTags: 'collectible', points: 100, once: true, showPopup: true },
  },
  {
    type: 'score_on_destroy',
    title: 'Score on Destroy',
    description: 'Awards points when this entity is destroyed',
    category: 'interaction',
    params: [
      { key: 'points', type: 'number', displayName: 'Points', min: -1000, max: 1000, step: 10, defaultValue: 50 },
    ],
    defaultParams: { points: 50 },
  },
  {
    type: 'health',
    title: 'Health',
    description: 'Gives entity health that decreases on damage',
    category: 'interaction',
    params: [
      { key: 'maxHealth', type: 'number', displayName: 'Max Health', min: 1, max: 1000, step: 1, defaultValue: 100 },
      { key: 'damagePerHit', type: 'number', displayName: 'Damage Per Hit', min: 1, max: 100, step: 1, defaultValue: 10 },
      { key: 'destroyOnDeath', type: 'boolean', displayName: 'Destroy on Death', defaultValue: true },
      { key: 'invulnerabilityTime', type: 'number', displayName: 'Invulnerability (s)', min: 0, max: 5, step: 0.1, defaultValue: 0.5 },
    ],
    defaultParams: { maxHealth: 100, damagePerHit: 10, destroyOnDeath: true, invulnerabilityTime: 0.5 },
  },
  {
    type: 'spawn_on_event',
    title: 'Spawn on Event',
    description: 'Spawns new entities when triggered',
    category: 'spawning',
    params: [
      { key: 'event', type: 'select', displayName: 'Trigger Event', options: ['tap', 'timer', 'collision', 'destroy', 'start'], defaultValue: 'tap' },
      { key: 'entityTemplate', type: 'select', displayName: 'Template', options: ['projectile', 'particle', 'enemy', 'collectible'], defaultValue: 'projectile' },
      { key: 'spawnPosition', type: 'select', displayName: 'Spawn Position', options: ['at_self', 'at_touch', 'random_in_bounds', 'offset'], defaultValue: 'at_self' },
      { key: 'interval', type: 'number', displayName: 'Interval (s)', min: 0.1, max: 10, step: 0.1, defaultValue: 1 },
      { key: 'maxSpawns', type: 'number', displayName: 'Max Spawns', min: 1, max: 100, step: 1, defaultValue: 10 },
    ],
    defaultParams: { event: 'tap', entityTemplate: 'projectile', spawnPosition: 'at_self', interval: 1, maxSpawns: 10 },
  },
  {
    type: 'timer',
    title: 'Timer',
    description: 'Triggers an action after a delay',
    category: 'spawning',
    params: [
      { key: 'duration', type: 'number', displayName: 'Duration (s)', min: 0.1, max: 60, step: 0.5, defaultValue: 5 },
      { key: 'action', type: 'select', displayName: 'Action', options: ['destroy', 'spawn', 'enable_behavior', 'disable_behavior', 'trigger_event'], defaultValue: 'destroy' },
      { key: 'repeat', type: 'boolean', displayName: 'Repeat', defaultValue: false },
    ],
    defaultParams: { duration: 5, action: 'destroy', repeat: false },
  },
  {
    type: 'gravity_zone',
    title: 'Gravity Zone',
    description: 'Creates a local gravity field around this entity',
    category: 'physics',
    params: [
      { key: 'gravityX', type: 'number', displayName: 'Gravity X', min: -500, max: 500, step: 10, defaultValue: 0 },
      { key: 'gravityY', type: 'number', displayName: 'Gravity Y', min: -500, max: 500, step: 10, defaultValue: -100 },
      { key: 'radius', type: 'number', displayName: 'Radius', min: 10, max: 500, step: 10, defaultValue: 100 },
      { key: 'falloff', type: 'select', displayName: 'Falloff', options: ['none', 'linear', 'quadratic'], defaultValue: 'linear' },
    ],
    defaultParams: { gravityX: 0, gravityY: -100, radius: 100, falloff: 'linear' },
  },
  {
    type: 'magnetic',
    title: 'Magnetic',
    description: 'Attracts or repels nearby entities',
    category: 'physics',
    params: [
      { key: 'strength', type: 'number', displayName: 'Strength', min: 0, max: 1000, step: 50, defaultValue: 200 },
      { key: 'radius', type: 'number', displayName: 'Radius', min: 10, max: 500, step: 10, defaultValue: 150 },
      { key: 'repels', type: 'boolean', displayName: 'Repel Instead', defaultValue: false },
    ],
    defaultParams: { strength: 200, radius: 150, repels: false },
  },
  {
    type: 'draggable',
    title: 'Draggable',
    description: 'Allows entity to be dragged by touch/mouse',
    category: 'control',
    params: [
      { key: 'stiffness', type: 'number', displayName: 'Stiffness', min: 0.1, max: 1, step: 0.1, defaultValue: 0.5 },
      { key: 'damping', type: 'number', displayName: 'Damping', min: 0, max: 1, step: 0.1, defaultValue: 0.5 },
      { key: 'requireDirectHit', type: 'boolean', displayName: 'Require Direct Hit', defaultValue: true },
    ],
    defaultParams: { stiffness: 0.5, damping: 0.5, requireDirectHit: true },
  },
  {
    type: 'animate',
    title: 'Animate',
    description: 'Plays sprite animation frames',
    category: 'animation',
    params: [
      { key: 'fps', type: 'number', displayName: 'FPS', min: 1, max: 60, step: 1, defaultValue: 12 },
      { key: 'loop', type: 'boolean', displayName: 'Loop', defaultValue: true },
      { key: 'playOn', type: 'select', displayName: 'Play On', options: ['always', 'moving', 'collision', 'destroy'], defaultValue: 'always' },
    ],
    defaultParams: { fps: 12, loop: true, playOn: 'always' },
  },
];

function createBehaviorGalleryItem(def: BehaviorDefinition): BehaviorGalleryItem {
  return {
    id: `behavior-${def.type}`,
    section: 'behaviors',
    title: def.title,
    description: def.description,
    category: def.category,
    behaviorType: def.type,
    tags: [def.category, 'logic', 'entity'],
    params: def.params,
    defaultParams: def.defaultParams,
    getExportJSON: (currentParams) => ({
      type: def.type,
      ...currentParams,
    }),
    getUsageExample: (currentParams) => `
// Add to entity.behaviors array
{
  type: '${def.type}',
  ${Object.entries(currentParams)
    .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
    .join(',\n  ')}
}`,
  };
}

export function registerBehaviorItems(): void {
  BEHAVIOR_DEFINITIONS.forEach(def => {
    registerGalleryItem(createBehaviorGalleryItem(def));
  });
}

export const BEHAVIOR_GALLERY_ITEMS = BEHAVIOR_DEFINITIONS.map(createBehaviorGalleryItem);
