/**
 * @file AngryBurnsLevelGenerator.test.ts
 * @description Unit tests for Angry Burns level generator and validators.
 */

import {
  generateAngryBurnsLevel,
  verifyAngryBurnsDeterminism,
  type GenerateAngryBurnsLevelParams,
} from './AngryBurnsLevelGenerator';
import type { GameEntity } from '../../types/entity';
import {
  validateBounds,
  validateOverlap,
  validateSupport,
  validateRequiredEntities,
  validateAngryBurnsLevel,
} from '../../validation/angryBurnsValidators';

// Helper to create a minimal game entity for testing
function createTestEntity(overrides: Partial<GameEntity> = {}): GameEntity {
  return {
    id: 'test-entity',
    name: 'test',
    template: 'woodBlock',
    transform: { x: 10, y: 5, angle: 0, scaleX: 1, scaleY: 1 },
    collider: { shape: 'box', width: 0.8, height: 0.4, friction: 0.5, restitution: 0.1 },
    physics: { bodyType: 'dynamic', density: 1 },
    ...overrides,
  };
}

// Helper to create a valid tower level for testing
function createValidTowerLevel(): GameEntity[] {
  const entities: GameEntity[] = [];

  // Ground
  entities.push({
    id: 'ground',
    name: 'ground',
    template: 'ground',
    transform: { x: 10, y: 11, angle: 0, scaleX: 1, scaleY: 1 },
    collider: { shape: 'box', width: 20, height: 1, friction: 0.5, restitution: 0.1 },
    physics: { bodyType: 'static', density: 0 },
  });

  // Wall
  entities.push({
    id: 'wall',
    name: 'wall-right',
    template: 'wall',
    transform: { x: 19.75, y: 6, angle: 0, scaleX: 1, scaleY: 1 },
    collider: { shape: 'box', width: 0.5, height: 12, friction: 0.5, restitution: 0.1 },
    physics: { bodyType: 'static', density: 0 },
  });

  // Cannon
  entities.push({
    id: 'cannon',
    name: 'cannon',
    template: 'cannon',
    transform: { x: 3, y: 9, angle: 0, scaleX: 1, scaleY: 1 },
    collider: { shape: 'box', width: 0.6, height: 0.25, friction: 0, restitution: 0 },
    physics: { bodyType: 'kinematic', density: 0 },
  });

  // Simple 3x3 tower
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      entities.push({
        id: `block-${row}-${col}`,
        name: `block-r${row}-c${col}`,
        template: 'woodBlock',
        transform: { x: 14 + col * 0.85, y: 10.4 - row * 0.4, angle: 0, scaleX: 1, scaleY: 1 },
        collider: { shape: 'box', width: 0.8, height: 0.4, friction: 0.5, restitution: 0.1 },
        physics: { bodyType: 'dynamic', density: 1 },
      });
    }
  }

  // Target
  entities.push({
    id: 'target',
    name: 'target-0',
    template: 'target',
    transform: { x: 15, y: 9, angle: 0, scaleX: 1, scaleY: 1 },
    collider: { shape: 'circle', radius: 0.35, friction: 0.3, restitution: 0.2 },
    physics: { bodyType: 'dynamic', density: 0.5 },
  });

  return entities;
}

describe('AngryBurnsLevelGenerator', () => {
  describe('Determinism', () => {
    it('should generate identical levels with same seed and difficulty', () => {
      const params: GenerateAngryBurnsLevelParams = {
        seed: 'test-seed-123',
        packId: 'test-pack',
        levelId: '1',
        difficulty01: 0.5,
      };

      const level1 = generateAngryBurnsLevel(params);
      const level2 = generateAngryBurnsLevel(params);

      expect(JSON.stringify(level1)).toBe(JSON.stringify(level2));
    });

    it('should generate identical levels with numeric seed', () => {
      const params: GenerateAngryBurnsLevelParams = {
        seed: 42,
        packId: 'test-pack',
        levelId: '1',
        difficulty01: 0.5,
      };

      const level1 = generateAngryBurnsLevel(params);
      const level2 = generateAngryBurnsLevel(params);

      expect(JSON.stringify(level1)).toBe(JSON.stringify(level2));
    });

    it('should generate different levels with different seeds', () => {
      const params1: GenerateAngryBurnsLevelParams = {
        seed: 'seed-one',
        packId: 'test-pack',
        levelId: '1',
        difficulty01: 0.5,
      };

      const params2: GenerateAngryBurnsLevelParams = {
        seed: 'seed-two',
        packId: 'test-pack',
        levelId: '1',
        difficulty01: 0.5,
      };

      const level1 = generateAngryBurnsLevel(params1);
      const level2 = generateAngryBurnsLevel(params2);

      expect(level1.seed).not.toBe(level2.seed);
      expect(level1.generatorParams!.difficulty01).toBe(level2.generatorParams!.difficulty01);
    });

    it('should generate different levels with different difficulty', () => {
      const baseParams: GenerateAngryBurnsLevelParams = {
        seed: 'same-seed',
        packId: 'test-pack',
        levelId: '1',
        difficulty01: 0,
      };

      const easyLevel = generateAngryBurnsLevel(baseParams);
      const hardLevel = generateAngryBurnsLevel({ ...baseParams, difficulty01: 1 });

      expect(hardLevel.generatorParams!.targetCount).toBeGreaterThanOrEqual(easyLevel.generatorParams!.targetCount);
      expect(hardLevel.difficulty!.initialLives).toBeLessThanOrEqual(easyLevel.difficulty!.initialLives);
    });

    it('verifyAngryBurnsDeterminism should confirm determinism', () => {
      const params: GenerateAngryBurnsLevelParams = {
        seed: 'verify-test',
        packId: 'test-pack',
        levelId: '1',
        difficulty01: 0.7,
      };

      const result = verifyAngryBurnsDeterminism(params);

      expect(result.deterministic).toBe(true);
      expect(JSON.stringify(result.level1)).toBe(JSON.stringify(result.level2));
    });
  });

  describe('Difficulty Scaling', () => {
    it('minimum difficulty should produce smallest tower', () => {
      const level = generateAngryBurnsLevel({
        seed: 'difficulty-test',
        packId: 'test-pack',
        levelId: '1',
        difficulty01: 0,
      });

      expect(level.generatorParams!.towerRows).toBe(3);
      expect(level.generatorParams!.towerColumns).toBe(2);
      expect(level.generatorParams!.targetCount).toBe(1);
      expect(level.difficulty!.initialLives).toBe(5);
    });

    it('maximum difficulty should produce largest tower', () => {
      const level = generateAngryBurnsLevel({
        seed: 'difficulty-test',
        packId: 'test-pack',
        levelId: '1',
        difficulty01: 1,
      });

      expect(level.generatorParams!.towerRows).toBe(9);
      expect(level.generatorParams!.towerColumns).toBe(5);
      expect(level.generatorParams!.targetCount).toBe(4);
      expect(level.difficulty!.initialLives).toBe(3);
    });

    it('higher difficulty should produce more blocks than lower difficulty', () => {
      const easyLevel = generateAngryBurnsLevel({
        seed: 'block-count-test',
        packId: 'test-pack',
        levelId: '1',
        difficulty01: 0,
      });

      const hardLevel = generateAngryBurnsLevel({
        seed: 'block-count-test',
        packId: 'test-pack',
        levelId: '1',
        difficulty01: 1,
      });

      expect(hardLevel.generatorParams!.towerRows * hardLevel.generatorParams!.towerColumns)
        .toBeGreaterThanOrEqual(easyLevel.generatorParams!.towerRows * easyLevel.generatorParams!.towerColumns);
    });

    it('level index should slightly increase difficulty', () => {
      const level0 = generateAngryBurnsLevel({
        seed: 'level-index-test',
        packId: 'test-pack',
        levelId: '1',
        difficulty01: 0.5,
        levelIndex: 0,
      });

      const level10 = generateAngryBurnsLevel({
        seed: 'level-index-test',
        packId: 'test-pack',
        levelId: '1',
        difficulty01: 0.5,
        levelIndex: 10,
      });

      expect(level10.generatorParams!.towerRows).toBeGreaterThanOrEqual(level0.generatorParams!.towerRows);
    });

    it('stone ratio should increase with difficulty', () => {
      const easyLevel = generateAngryBurnsLevel({
        seed: 'material-test',
        packId: 'test-pack',
        levelId: '1',
        difficulty01: 0,
      });

      const hardLevel = generateAngryBurnsLevel({
        seed: 'material-test',
        packId: 'test-pack',
        levelId: '1',
        difficulty01: 1,
      });

      expect(hardLevel.generatorParams!.stoneRatio).toBeGreaterThan(easyLevel.generatorParams!.stoneRatio);
    });
  });

  describe('Level Structure', () => {
    it('should include required entities', () => {
      const level = generateAngryBurnsLevel({
        seed: 'structure-test',
        packId: 'test-pack',
        levelId: '1',
        difficulty01: 0.5,
      });

      const entities = level.overrides?.angryBurns?.entities ?? [];
      const templates = entities.map(e => e.template);

      expect(templates).toContain('ground');
      expect(templates).toContain('wall');
      expect(templates).toContain('cannon');
      expect(templates).toContain('target');
    });

    it('should have valid generator metadata', () => {
      const level = generateAngryBurnsLevel({
        seed: 'metadata-test',
        packId: 'my-pack',
        levelId: '5',
        difficulty01: 0.3,
        title: 'Custom Title',
        description: 'Custom Description',
      });

      expect(level.generatorId).toBe('angry-burns-generator');
      expect(level.generatorVersion).toBe('1.0.0');
      expect(level.packId).toBe('my-pack');
      expect(level.levelId).toBe('5');
      expect(level.title).toBe('Custom Title');
      expect(level.description).toBe('Custom Description');
      expect(level.seed).toBe('metadata-test');
    });

    it('should use default title and description when not provided', () => {
      const level = generateAngryBurnsLevel({
        seed: 'defaults-test',
        packId: 'test-pack',
        levelId: '3',
        difficulty01: 0.5,
      });

      expect(level.title).toBe('Level 3');
      expect(level.description).toContain('targets');
      expect(level.description).toContain('shots');
    });
  });
});
