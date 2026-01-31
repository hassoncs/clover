import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createMockGodotBridge, getMockCallCount, isMockFunction } from './mock-godot-bridge';
import type { GodotBridge } from '../types';

describe('GodotBridge Contract Tests', () => {
  let bridge: GodotBridge;

  beforeEach(() => {
    bridge = createMockGodotBridge();
  });

  describe('Entity Lifecycle', () => {
    it('spawnEntity returns entity ID string', () => {
      const entityId = bridge.spawnEntity('box', 5, 10);
      expect(entityId).toBeTypeOf('string');
      expect(entityId.length).toBeGreaterThan(0);
    });

    it('destroyEntity calls without error', () => {
      expect(() => bridge.destroyEntity('entity-1')).not.toThrow();
    });

    it('onEntityDestroyed returns unsubscribe function', () => {
      const unsubscribe = bridge.onEntityDestroyed(() => {});
      expect(unsubscribe).toBeTypeOf('function');
    });

    it('onEntitySpawned returns unsubscribe function', () => {
      const unsubscribe = bridge.onEntitySpawned(() => {});
      expect(unsubscribe).toBeTypeOf('function');
    });

    it('spawnParticle calls without error', () => {
      expect(() => bridge.spawnParticle('explosion', 5, 10)).not.toThrow();
    });
  });

  describe('Physics - Velocity Control', () => {
    it('setLinearVelocity is a mock function', () => {
      expect(isMockFunction(bridge, 'setLinearVelocity')).toBe(true);
    });

    it('setAngularVelocity calls without error', () => {
      bridge.setAngularVelocity('entity-1', 2.5);
    });

    it('getLinearVelocity returns Vec2 promise', async () => {
      const velocity = await bridge.getLinearVelocity('entity-1');
      expect(velocity).toEqual({ x: 0, y: 0 });
    });

    it('getAngularVelocity returns number promise', async () => {
      const velocity = await bridge.getAngularVelocity('entity-1');
      expect(typeof velocity).toBe('number');
    });
  });

  describe('Physics - Force/Impulse', () => {
    it('applyImpulse calls without error', () => {
      bridge.applyImpulse('entity-1', { x: 10, y: -5 });
    });

    it('applyForce calls without error', () => {
      bridge.applyForce('entity-1', { x: 100, y: 0 });
    });

    it('applyTorque calls without error', () => {
      bridge.applyTorque('entity-1', 15);
    });
  });

  describe('Physics - Game Control', () => {
    it('pausePhysics calls without error', () => {
      bridge.pausePhysics();
    });

    it('resumePhysics calls without error', () => {
      bridge.resumePhysics();
    });

    it('setInspectMode calls without error', () => {
      bridge.setInspectMode(true);
    });

    it('stepPhysics returns step result promise', async () => {
      const result = await bridge.stepPhysics(1);
      expect(result).toHaveProperty('ok');
      expect(result).toHaveProperty('framesAdvanced');
      expect(result).toHaveProperty('endFrame');
    });
  });

  describe('Physics - Body Management', () => {
    it('createBody returns body ID number', () => {
      const bodyId = bridge.createBody({ type: 'dynamic', position: { x: 0, y: 0 } });
      expect(typeof bodyId).toBe('number');
    });

    it('addFixture returns collider ID number', () => {
      const colliderId = bridge.addFixture(1, {
        shape: { type: 'box', halfWidth: 1, halfHeight: 1 },
      });
      expect(typeof colliderId).toBe('number');
    });

    it('setSensor calls without error', () => {
      bridge.setSensor(1, true);
    });

    it('setUserData calls without error', () => {
      bridge.setUserData(1, { health: 100 });
    });

    it('getUserData returns data promise', async () => {
      const data = await bridge.getUserData(1);
      expect(data).toBeDefined();
    });

    it('getAllBodies returns number array promise', async () => {
      const bodies = await bridge.getAllBodies();
      expect(Array.isArray(bodies)).toBe(true);
    });
  });

  describe('Physics - Queries', () => {
    it('queryPoint returns body ID or null promise', async () => {
      const result = await bridge.queryPoint({ x: 5, y: 5 });
      expect(result === null || typeof result === 'number').toBe(true);
    });

    it('queryPointEntity returns entity ID or null promise', async () => {
      const result = await bridge.queryPointEntity({ x: 5, y: 5 });
      expect(result === null || typeof result === 'string').toBe(true);
    });

    it('queryAABB returns number array promise', async () => {
      const result = await bridge.queryAABB({ x: 0, y: 0 }, { x: 10, y: 10 });
      expect(Array.isArray(result)).toBe(true);
    });

    it('raycast returns RaycastHit or null promise', async () => {
      const result = await bridge.raycast({ x: 0, y: 0 }, { x: 1, y: 0 }, 100);
      expect(result === null || typeof result === 'object').toBe(true);
    });
  });

  describe('Transform - Queries', () => {
    it('getEntityTransform returns EntityTransform or null promise', async () => {
      const transform = await bridge.getEntityTransform('entity-1');
      expect(transform === null || (transform.x !== undefined && transform.y !== undefined && transform.angle !== undefined)).toBe(true);
    });

    it('getAllTransforms returns record promise', async () => {
      const transforms = await bridge.getAllTransforms();
      expect(typeof transforms).toBe('object');
    });
  });

  describe('Transform - Control', () => {
    it('setTransform calls without error', () => {
      bridge.setTransform('entity-1', 5, 10, Math.PI / 4);
    });

    it('setPosition calls without error', () => {
      bridge.setPosition('entity-1', 5, 10);
    });

    it('setRotation calls without error', () => {
      bridge.setRotation('entity-1', Math.PI / 2);
    });

    it('setScale calls without error', () => {
      bridge.setScale('entity-1', 2, 2);
    });

    it('setCameraPosition calls without error', () => {
      bridge.setCameraPosition(100, 200);
    });

    it('set3DViewportPosition calls without error', () => {
      bridge.set3DViewportPosition(50, 50);
    });

    it('onTransformSync returns unsubscribe function', () => {
      const unsubscribe = bridge.onTransformSync(() => {});
      expect(unsubscribe).toBeTypeOf('function');
    });
  });

  describe('Visual - Opacity', () => {
    it('setOpacity calls without error', () => {
      bridge.setOpacity('entity-1', 0.5);
    });
  });

  describe('Visual - Dynamic Images', () => {
    it('setEntityImage calls without error', () => {
      bridge.setEntityImage('entity-1', 'https://example.com/image.png', 100, 100);
    });

    it('setEntityAtlasRegion calls without error', () => {
      bridge.setEntityAtlasRegion('entity-1', 'https://example.com/atlas.png', 0, 0, 64, 64, 100, 100);
    });

    it('clearTextureCache calls without error', () => {
      bridge.clearTextureCache();
      bridge.clearTextureCache('https://example.com/image.png');
    });

    it('preloadTextures returns progress promise', async () => {
      const result = await bridge.preloadTextures(['https://example.com/image.png']);
      expect(result).toHaveProperty('completed');
      expect(result).toHaveProperty('failed');
    });
  });

  describe('Visual - Sprite Effects', () => {
    it('applySpriteEffect calls without error', () => {
      bridge.applySpriteEffect('entity-1', 'glow');
    });

    it('updateSpriteEffectParam calls without error', () => {
      bridge.updateSpriteEffectParam('entity-1', 'intensity', 0.8);
    });

    it('clearSpriteEffect calls without error', () => {
      bridge.clearSpriteEffect('entity-1');
    });
  });

  describe('Visual - Post-Processing', () => {
    it('setPostEffect calls without error', () => {
      bridge.setPostEffect('bloom');
    });

    it('updatePostEffectParam calls without error', () => {
      bridge.updatePostEffectParam('strength', 0.5);
    });

    it('clearPostEffect calls without error', () => {
      bridge.clearPostEffect();
      bridge.clearPostEffect('background');
    });
  });

  describe('Visual - Camera Effects', () => {
    it('screenShake calls without error', () => {
      bridge.screenShake(0.5);
      bridge.screenShake(0.5, 500);
    });

    it('zoomPunch calls without error', () => {
      bridge.zoomPunch();
      bridge.zoomPunch(0.3, 300);
    });

    it('triggerShockwave calls without error', () => {
      bridge.triggerShockwave(100, 200);
      bridge.triggerShockwave(100, 200, 1000);
    });

    it('flashScreen calls without error', () => {
      bridge.flashScreen();
      bridge.flashScreen([1, 1, 1, 1], 500);
    });
  });

  describe('Visual - Dynamic Shaders', () => {
    it('createDynamicShader returns result promise', async () => {
      const result = await bridge.createDynamicShader('my-shader', 'shader code');
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('shader_id');
    });

    it('applyDynamicShader calls without error', () => {
      bridge.applyDynamicShader('entity-1', 'my-shader');
    });

    it('applyDynamicPostShader calls without error', () => {
      bridge.applyDynamicPostShader('shader code');
    });
  });

  describe('Visual - Particles', () => {
    it('spawnParticlePreset calls without error', () => {
      bridge.spawnParticlePreset('explosion', 100, 200);
      bridge.spawnParticlePreset('explosion', 100, 200, { scale: 2 });
    });

    it('getAvailableEffects returns effects promise', async () => {
      const effects = await bridge.getAvailableEffects();
      expect(effects).toHaveProperty('sprite');
      expect(effects).toHaveProperty('post');
      expect(effects).toHaveProperty('particles');
      expect(Array.isArray(effects.sprite)).toBe(true);
      expect(Array.isArray(effects.post)).toBe(true);
      expect(Array.isArray(effects.particles)).toBe(true);
    });
  });

  describe('Events - Collision', () => {
    it('onCollision returns unsubscribe function', () => {
      const unsubscribe = bridge.onCollision(() => {});
      expect(unsubscribe).toBeTypeOf('function');
    });
  });

  describe('Events - Sensors', () => {
    it('onSensorBegin returns unsubscribe function', () => {
      const unsubscribe = bridge.onSensorBegin(() => {});
      expect(unsubscribe).toBeTypeOf('function');
    });

    it('onSensorEnd returns unsubscribe function', () => {
      const unsubscribe = bridge.onSensorEnd(() => {});
      expect(unsubscribe).toBeTypeOf('function');
    });
  });

  describe('Events - Input', () => {
    it('sendInput calls without error', () => {
      bridge.sendInput('tap', { x: 100, y: 200 });
      bridge.sendInput('drag_start', { x: 100, y: 200, entityId: 'entity-1' });
      bridge.sendInput('drag_move', { x: 150, y: 250 });
      bridge.sendInput('drag_end', { x: 200, y: 300 });
    });

    it('onInputEvent returns unsubscribe function', () => {
      const unsubscribe = bridge.onInputEvent(() => {});
      expect(unsubscribe).toBeTypeOf('function');
    });
  });

  describe('Events - Property Sync', () => {
    it('getAllProperties returns payload promise', async () => {
      const properties = await bridge.getAllProperties();
      expect(properties).toHaveProperty('entities');
      expect(properties).toHaveProperty('globals');
    });

    it('onPropertySync returns unsubscribe function', () => {
      const unsubscribe = bridge.onPropertySync(() => {});
      expect(unsubscribe).toBeTypeOf('function');
    });

    it('setWatchConfig calls without error', () => {
      bridge.setWatchConfig({ watchPath: 'health', entityId: 'entity-1' });
    });
  });

  describe('Events - Score', () => {
    it('onScore returns unsubscribe function', () => {
      const unsubscribe = bridge.onScore(() => {});
      expect(unsubscribe).toBeTypeOf('function');
    });
  });

  describe('Joints - Creation', () => {
    it('createRevoluteJoint returns joint ID', () => {
      const jointId = bridge.createRevoluteJoint({
        type: 'revolute',
        bodyA: 'entity-1',
        bodyB: 'entity-2',
        anchor: { x: 5, y: 5 },
      });
      expect(typeof jointId).toBe('number');
    });

    it('createDistanceJoint returns joint ID', () => {
      const jointId = bridge.createDistanceJoint({
        type: 'distance',
        bodyA: 'entity-1',
        bodyB: 'entity-2',
        anchorA: { x: 0, y: 0 },
        anchorB: { x: 10, y: 0 },
      });
      expect(typeof jointId).toBe('number');
    });

    it('createPrismaticJoint returns joint ID', () => {
      const jointId = bridge.createPrismaticJoint({
        type: 'prismatic',
        bodyA: 'entity-1',
        bodyB: 'entity-2',
        anchor: { x: 5, y: 5 },
        axis: { x: 1, y: 0 },
      });
      expect(typeof jointId).toBe('number');
    });

    it('createWeldJoint returns joint ID', () => {
      const jointId = bridge.createWeldJoint({
        type: 'weld',
        bodyA: 'entity-1',
        bodyB: 'entity-2',
        anchor: { x: 5, y: 5 },
      });
      expect(typeof jointId).toBe('number');
    });

    it('createMouseJoint returns joint ID', () => {
      const jointId = bridge.createMouseJoint({
        type: 'mouse',
        body: 'entity-1',
        target: { x: 100, y: 200 },
        maxForce: 1000,
      });
      expect(typeof jointId).toBe('number');
    });

    it('createMouseJointAsync returns joint ID promise', async () => {
      const jointId = await bridge.createMouseJointAsync({
        type: 'mouse',
        body: 'entity-1',
        target: { x: 100, y: 200 },
        maxForce: 1000,
      });
      expect(typeof jointId).toBe('number');
    });
  });

  describe('Joints - Control', () => {
    it('destroyJoint calls without error', () => {
      bridge.destroyJoint(1);
    });

    it('setMotorSpeed calls without error', () => {
      bridge.setMotorSpeed(1, 10);
    });

    it('setMouseTarget calls without error', () => {
      bridge.setMouseTarget(1, { x: 150, y: 250 });
    });
  });

  describe('Camera Control', () => {
    it('setCameraTarget calls without error', () => {
      bridge.setCameraTarget('entity-1');
      bridge.setCameraTarget(null);
    });

    it('setCameraZoom calls without error', () => {
      bridge.setCameraZoom(2);
    });

    it('set3DCameraDistance calls without error', () => {
      bridge.set3DCameraDistance(500);
    });
  });

  describe('Game Management', () => {
    it('initialize returns promise', async () => {
      await expect(bridge.initialize()).resolves.toBeUndefined();
    });

    it('loadGame returns promise', async () => {
      await expect(bridge.loadGame({
        metadata: { id: 'test', name: 'Test', version: '1.0' },
        world: { width: 800, height: 600, backgroundColor: '#000' },
        entities: [],
        rules: [],
        constants: {},
        templates: {},
      } as any)).resolves.toBeUndefined();
    });

    it('clearGame calls without error', () => {
      bridge.clearGame();
    });

    it('callRpc returns promise', async () => {
      const result = await bridge.callRpc('myMethod', { param: 'value' });
      expect(result).toBeDefined();
    });

    it('getAllProperties returns payload', async () => {
      const properties = await bridge.getAllProperties();
      expect(properties).toHaveProperty('entities');
      expect(properties).toHaveProperty('globals');
    });

    it('getAllBodies returns array', async () => {
      const bodies = await bridge.getAllBodies();
      expect(Array.isArray(bodies)).toBe(true);
    });
  });

  describe('Debug Mode', () => {
    it('setDebugShowShapes calls without error', () => {
      bridge.setDebugShowShapes(true);
    });

    it('setDebugSettings calls without error', () => {
      bridge.setDebugSettings({
        showInputDebug: true,
        showPhysicsShapes: true,
        showZones: false,
        showFPS: true,
      });
    });
  });

  describe('Audio', () => {
    it('playSound calls without error', () => {
      bridge.playSound('res://sounds/coin.wav');
    });
  });

  describe('UI Buttons', () => {
    it('createUIButton calls without error', () => {
      bridge.createUIButton('btn-1', 'normal.png', 'pressed.png', 100, 200, 150, 50);
    });

    it('destroyUIButton calls without error', () => {
      bridge.destroyUIButton('btn-1');
    });

    it('onUIButtonEvent returns unsubscribe function', () => {
      const unsubscribe = bridge.onUIButtonEvent(() => {});
      expect(unsubscribe).toBeTypeOf('function');
    });
  });

  describe('Themed UI Components', () => {
    it('createThemedUIComponent calls without error', () => {
      bridge.createThemedUIComponent('comp-1', 0, 'metadata.json', 100, 200, 150, 50, 'Label');
    });

    it('destroyThemedUIComponent calls without error', () => {
      bridge.destroyThemedUIComponent('comp-1');
    });
  });

  describe('3D Model Rendering', () => {
    it('show3DModel returns boolean', () => {
      const result = bridge.show3DModel('res://models/cube.gltf');
      expect(typeof result).toBe('boolean');
    });

    it('show3DModelFromUrl calls without error', () => {
      bridge.show3DModelFromUrl('https://example.com/model.gltf');
    });

    it('set3DViewportSize calls without error', () => {
      bridge.set3DViewportSize(400, 300);
    });

    it('rotate3DModel calls without error', () => {
      bridge.rotate3DModel(0, 0, 90);
    });

    it('clear3DModels calls without error', () => {
      bridge.clear3DModels();
    });
  });

  describe('Coordinate Conversion', () => {
    it('screenToWorld returns Vec2 promise', async () => {
      const worldPos = await bridge.screenToWorld(400, 300);
      expect(worldPos).toHaveProperty('x');
      expect(worldPos).toHaveProperty('y');
    });
  });

  describe('Lifecycle', () => {
    it('dispose calls without error', () => {
      expect(() => bridge.dispose()).not.toThrow();
    });
  });

  describe('Mock History Tracking', () => {
    it('tracks method call counts', () => {
      bridge.spawnEntity('box', 5, 10);
      bridge.spawnEntity('circle', 10, 20);

      expect(getMockCallCount(bridge, 'spawnEntity')).toBe(2);
    });
  });
});

describe('GodotBridge Method Coverage', () => {
  const requiredMethods = [
    'initialize', 'dispose',
    'loadGame', 'clearGame',
    'pausePhysics', 'resumePhysics', 'setInspectMode', 'stepPhysics', 'callRpc',
    'spawnEntity', 'destroyEntity',
    'getEntityTransform', 'getAllTransforms',
    'setTransform', 'setPosition', 'setRotation', 'setScale',
    'getLinearVelocity', 'setLinearVelocity', 'getAngularVelocity', 'setAngularVelocity',
    'applyImpulse', 'applyForce', 'applyTorque',
    'createRevoluteJoint', 'createDistanceJoint', 'createPrismaticJoint', 'createWeldJoint', 'createMouseJoint', 'createMouseJointAsync',
    'destroyJoint', 'setMotorSpeed', 'setMouseTarget',
    'screenToWorld',
    'queryPoint', 'queryPointEntity', 'queryAABB', 'raycast',
    'createBody', 'addFixture', 'setSensor', 'setUserData', 'getUserData', 'getAllBodies',
    'onCollision', 'onEntityDestroyed', 'onEntitySpawned', 'onSensorBegin', 'onSensorEnd', 'onTransformSync', 'onScore',
    'getAllProperties', 'onPropertySync', 'setWatchConfig',
    'sendInput', 'onInputEvent',
    'setEntityImage', 'setEntityAtlasRegion', 'clearTextureCache', 'preloadTextures',
    'setDebugShowShapes', 'setDebugSettings',
    'setCameraTarget', 'setCameraPosition', 'setCameraZoom', 'set3DCameraDistance',
    'spawnParticle',
    'playSound',
    'applySpriteEffect', 'updateSpriteEffectParam', 'clearSpriteEffect',
    'setPostEffect', 'updatePostEffectParam', 'clearPostEffect',
    'screenShake', 'zoomPunch', 'triggerShockwave', 'flashScreen',
    'createDynamicShader', 'applyDynamicShader', 'applyDynamicPostShader',
    'spawnParticlePreset', 'getAvailableEffects',
    'createUIButton', 'destroyUIButton', 'onUIButtonEvent',
    'createThemedUIComponent', 'destroyThemedUIComponent',
    'show3DModel', 'show3DModelFromUrl', 'set3DViewportPosition', 'set3DViewportSize', 'rotate3DModel', 'set3DCameraDistance', 'clear3DModels',
    'setOpacity',
  ];

  it('mock implements all required methods', () => {
    const bridge = createMockGodotBridge();
    const missingMethods: string[] = [];

    for (const method of requiredMethods) {
      if (typeof (bridge as unknown as Record<string, unknown>)[method] !== 'function') {
        missingMethods.push(method);
      }
    }

    expect(missingMethods).toHaveLength(0);
  });
});

describe('GodotBridge Extended Methods (from handler inventory)', () => {
  let bridge: GodotBridge;

  beforeEach(() => {
    bridge = createMockGodotBridge();
  });

  it('loadCustomScene is callable', () => {
    (bridge as any).loadCustomScene('test-scene');
  });

  it('getTransform is callable', async () => {
    const result = await (bridge as any).getTransform('entity-1');
    expect(result).toBeDefined();
  });

  it('getTransforms is callable', async () => {
    const result = await (bridge as any).getTransforms(['entity-1']);
    expect(result).toBeDefined();
  });

  it('setTrackedEntities is callable', () => {
    (bridge as any).setTrackedEntities(['entity-1', 'entity-2']);
  });

  it('getCameraInfo is callable', async () => {
    const result = await (bridge as any).getCameraInfo();
    expect(result).toBeDefined();
  });

  it('captureScreenshot is callable', async () => {
    await (bridge as any).captureScreenshot();
  });

  it('getWorldInfo is callable', async () => {
    const result = await (bridge as any).getWorldInfo();
    expect(result).toBeDefined();
  });

  it('getViewportInfo is callable', async () => {
    const result = await (bridge as any).getViewportInfo();
    expect(result).toBeDefined();
  });
});
