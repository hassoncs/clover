import type { PhysicsGalleryItem, ParamDefinition } from '../types';
import { registerGalleryItem } from '../registry';

interface PhysicsDefinition {
  id: string;
  title: string;
  description: string;
  physicsCategory: PhysicsGalleryItem['physicsCategory'];
  params: ParamDefinition[];
  defaultParams: Record<string, unknown>;
}

const PHYSICS_DEFINITIONS: PhysicsDefinition[] = [
  {
    id: 'body-static',
    title: 'Static Body',
    description: 'Immovable body that other objects can collide with',
    physicsCategory: 'bodies',
    params: [
      { key: 'friction', type: 'number', displayName: 'Friction', min: 0, max: 1, step: 0.1, defaultValue: 0.3 },
      { key: 'restitution', type: 'number', displayName: 'Bounciness', min: 0, max: 1, step: 0.1, defaultValue: 0 },
      { key: 'isSensor', type: 'boolean', displayName: 'Is Sensor', defaultValue: false },
    ],
    defaultParams: { bodyType: 'static', friction: 0.3, restitution: 0, isSensor: false },
  },
  {
    id: 'body-dynamic',
    title: 'Dynamic Body',
    description: 'Fully simulated body affected by gravity and forces',
    physicsCategory: 'bodies',
    params: [
      { key: 'density', type: 'number', displayName: 'Density', min: 0.1, max: 10, step: 0.1, defaultValue: 1 },
      { key: 'friction', type: 'number', displayName: 'Friction', min: 0, max: 1, step: 0.1, defaultValue: 0.3 },
      { key: 'restitution', type: 'number', displayName: 'Bounciness', min: 0, max: 1, step: 0.1, defaultValue: 0.5 },
      { key: 'linearDamping', type: 'number', displayName: 'Linear Damping', min: 0, max: 5, step: 0.1, defaultValue: 0 },
      { key: 'angularDamping', type: 'number', displayName: 'Angular Damping', min: 0, max: 5, step: 0.1, defaultValue: 0 },
      { key: 'fixedRotation', type: 'boolean', displayName: 'Fixed Rotation', defaultValue: false },
      { key: 'bullet', type: 'boolean', displayName: 'Bullet (CCD)', defaultValue: false },
    ],
    defaultParams: { bodyType: 'dynamic', density: 1, friction: 0.3, restitution: 0.5, linearDamping: 0, angularDamping: 0, fixedRotation: false, bullet: false },
  },
  {
    id: 'body-kinematic',
    title: 'Kinematic Body',
    description: 'Scripted movement body, not affected by forces',
    physicsCategory: 'bodies',
    params: [
      { key: 'friction', type: 'number', displayName: 'Friction', min: 0, max: 1, step: 0.1, defaultValue: 0.3 },
      { key: 'restitution', type: 'number', displayName: 'Bounciness', min: 0, max: 1, step: 0.1, defaultValue: 0 },
    ],
    defaultParams: { bodyType: 'kinematic', friction: 0.3, restitution: 0 },
  },
  {
    id: 'shape-box',
    title: 'Box Shape',
    description: 'Rectangular collision shape',
    physicsCategory: 'shapes',
    params: [
      { key: 'width', type: 'number', displayName: 'Width', min: 1, max: 500, step: 5, defaultValue: 100 },
      { key: 'height', type: 'number', displayName: 'Height', min: 1, max: 500, step: 5, defaultValue: 100 },
    ],
    defaultParams: { shape: 'box', width: 100, height: 100 },
  },
  {
    id: 'shape-circle',
    title: 'Circle Shape',
    description: 'Circular collision shape',
    physicsCategory: 'shapes',
    params: [
      { key: 'radius', type: 'number', displayName: 'Radius', min: 1, max: 250, step: 5, defaultValue: 50 },
    ],
    defaultParams: { shape: 'circle', radius: 50 },
  },
  {
    id: 'shape-polygon',
    title: 'Polygon Shape',
    description: 'Custom convex polygon collision shape',
    physicsCategory: 'shapes',
    params: [
      { key: 'sides', type: 'number', displayName: 'Sides', min: 3, max: 8, step: 1, defaultValue: 5 },
      { key: 'size', type: 'number', displayName: 'Size', min: 10, max: 200, step: 5, defaultValue: 50 },
    ],
    defaultParams: { shape: 'polygon', sides: 5, size: 50 },
  },
  {
    id: 'joint-revolute',
    title: 'Revolute Joint',
    description: 'Hinge joint allowing rotation around a point',
    physicsCategory: 'joints',
    params: [
      { key: 'enableLimit', type: 'boolean', displayName: 'Enable Limit', defaultValue: false },
      { key: 'lowerAngle', type: 'number', displayName: 'Lower Angle', min: -180, max: 0, step: 15, defaultValue: -45 },
      { key: 'upperAngle', type: 'number', displayName: 'Upper Angle', min: 0, max: 180, step: 15, defaultValue: 45 },
      { key: 'enableMotor', type: 'boolean', displayName: 'Enable Motor', defaultValue: false },
      { key: 'motorSpeed', type: 'number', displayName: 'Motor Speed', min: -360, max: 360, step: 30, defaultValue: 90 },
      { key: 'maxMotorTorque', type: 'number', displayName: 'Max Torque', min: 0, max: 1000, step: 50, defaultValue: 100 },
    ],
    defaultParams: { jointType: 'revolute', enableLimit: false, lowerAngle: -45, upperAngle: 45, enableMotor: false, motorSpeed: 90, maxMotorTorque: 100 },
  },
  {
    id: 'joint-distance',
    title: 'Distance Joint',
    description: 'Spring-like joint maintaining distance between bodies',
    physicsCategory: 'joints',
    params: [
      { key: 'length', type: 'number', displayName: 'Length', min: 10, max: 500, step: 10, defaultValue: 100 },
      { key: 'stiffness', type: 'number', displayName: 'Stiffness', min: 0, max: 100, step: 5, defaultValue: 50 },
      { key: 'damping', type: 'number', displayName: 'Damping', min: 0, max: 1, step: 0.1, defaultValue: 0.5 },
    ],
    defaultParams: { jointType: 'distance', length: 100, stiffness: 50, damping: 0.5 },
  },
  {
    id: 'joint-prismatic',
    title: 'Prismatic Joint',
    description: 'Slider joint allowing movement along an axis',
    physicsCategory: 'joints',
    params: [
      { key: 'axisAngle', type: 'number', displayName: 'Axis Angle', min: 0, max: 360, step: 15, defaultValue: 0 },
      { key: 'enableLimit', type: 'boolean', displayName: 'Enable Limit', defaultValue: true },
      { key: 'lowerTranslation', type: 'number', displayName: 'Lower Limit', min: -200, max: 0, step: 10, defaultValue: -50 },
      { key: 'upperTranslation', type: 'number', displayName: 'Upper Limit', min: 0, max: 200, step: 10, defaultValue: 50 },
      { key: 'enableMotor', type: 'boolean', displayName: 'Enable Motor', defaultValue: false },
      { key: 'motorSpeed', type: 'number', displayName: 'Motor Speed', min: -100, max: 100, step: 10, defaultValue: 20 },
    ],
    defaultParams: { jointType: 'prismatic', axisAngle: 0, enableLimit: true, lowerTranslation: -50, upperTranslation: 50, enableMotor: false, motorSpeed: 20 },
  },
  {
    id: 'joint-weld',
    title: 'Weld Joint',
    description: 'Rigidly connects two bodies together',
    physicsCategory: 'joints',
    params: [
      { key: 'stiffness', type: 'number', displayName: 'Stiffness', min: 0, max: 100, step: 5, defaultValue: 100 },
      { key: 'damping', type: 'number', displayName: 'Damping', min: 0, max: 1, step: 0.1, defaultValue: 0.5 },
    ],
    defaultParams: { jointType: 'weld', stiffness: 100, damping: 0.5 },
  },
  {
    id: 'force-impulse',
    title: 'Apply Impulse',
    description: 'Instantaneous force applied to a body',
    physicsCategory: 'forces',
    params: [
      { key: 'forceX', type: 'number', displayName: 'Force X', min: -1000, max: 1000, step: 50, defaultValue: 0 },
      { key: 'forceY', type: 'number', displayName: 'Force Y', min: -1000, max: 1000, step: 50, defaultValue: -500 },
      { key: 'atCenter', type: 'boolean', displayName: 'At Center', defaultValue: true },
    ],
    defaultParams: { forceX: 0, forceY: -500, atCenter: true },
  },
  {
    id: 'force-continuous',
    title: 'Apply Force',
    description: 'Continuous force applied each physics step',
    physicsCategory: 'forces',
    params: [
      { key: 'forceX', type: 'number', displayName: 'Force X', min: -500, max: 500, step: 25, defaultValue: 0 },
      { key: 'forceY', type: 'number', displayName: 'Force Y', min: -500, max: 500, step: 25, defaultValue: 0 },
    ],
    defaultParams: { forceX: 0, forceY: 0 },
  },
  {
    id: 'force-torque',
    title: 'Apply Torque',
    description: 'Rotational force applied to a body',
    physicsCategory: 'forces',
    params: [
      { key: 'torque', type: 'number', displayName: 'Torque', min: -500, max: 500, step: 25, defaultValue: 100 },
    ],
    defaultParams: { torque: 100 },
  },
];

function createPhysicsGalleryItem(def: PhysicsDefinition): PhysicsGalleryItem {
  return {
    id: `physics-${def.id}`,
    section: 'physics',
    title: def.title,
    description: def.description,
    physicsCategory: def.physicsCategory,
    tags: [def.physicsCategory, 'box2d', 'simulation'],
    params: def.params,
    defaultParams: def.defaultParams,
    getExportJSON: (currentParams) => ({
      ...currentParams,
    }),
    getUsageExample: (currentParams) => {
      if (def.physicsCategory === 'bodies') {
        return `
// Physics body configuration
{
  physics: {
    bodyType: '${currentParams.bodyType}',
    shape: 'box',
    width: 100,
    height: 100,
    ${Object.entries(currentParams)
      .filter(([key]) => key !== 'bodyType')
      .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
      .join(',\n    ')}
  }
}`;
      }
      
      if (def.physicsCategory === 'shapes') {
        return `
// Physics shape configuration
{
  physics: {
    bodyType: 'dynamic',
    shape: '${currentParams.shape}',
    ${Object.entries(currentParams)
      .filter(([key]) => key !== 'shape')
      .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
      .join(',\n    ')}
  }
}`;
      }
      
      if (def.physicsCategory === 'joints') {
        return `
// Joint configuration
{
  type: '${currentParams.jointType}',
  bodyA: 'entity-a',
  bodyB: 'entity-b',
  anchor: { x: 0, y: 0 },
  ${Object.entries(currentParams)
    .filter(([key]) => key !== 'jointType')
    .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
    .join(',\n  ')}
}`;
      }
      
      return `
// Force/impulse application
physics.applyImpulse(bodyId, { x: ${currentParams.forceX ?? 0}, y: ${currentParams.forceY ?? 0} });`;
    },
  };
}

export function registerPhysicsItems(): void {
  PHYSICS_DEFINITIONS.forEach(def => {
    registerGalleryItem(createPhysicsGalleryItem(def));
  });
}

export const PHYSICS_GALLERY_ITEMS = PHYSICS_DEFINITIONS.map(createPhysicsGalleryItem);
