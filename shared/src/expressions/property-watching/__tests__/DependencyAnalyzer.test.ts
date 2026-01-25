import { describe, it, expect } from 'vitest';
import { DependencyAnalyzer } from '../DependencyAnalyzer';
import type { GameDefinition } from '../../../types/GameDefinition';

describe('DependencyAnalyzer', () => {
  describe('analyze - behaviors', () => {
    it('detects velocity dependency in maintain_speed behavior', () => {
      const game: GameDefinition = {
        metadata: { id: 'test', title: 'Test', version: '1.0.0' },
        world: { gravity: { x: 0, y: 10 }, pixelsPerMeter: 50 },
        templates: {
          ball: {
            id: 'ball',
            tags: ['ball'],
            behaviors: [
              {
                type: 'maintain_speed',
                speed: { expr: 'self.velocity.x + 5' },
              },
            ],
          },
        },
        entities: [],
      };

      const analyzer = new DependencyAnalyzer(game);
      const report = analyzer.analyze();
      const watches = analyzer.getWatchSpecs();

      expect(report.valid).toBe(true);
      expect(watches.some(w => w.property === 'velocity.x')).toBe(true);
      expect(report.stats.propertiesWatched).toContain('velocity.x');
    });

    it('detects multiple property dependencies', () => {
      const game: GameDefinition = {
        metadata: { id: 'test', title: 'Test', version: '1.0.0' },
        world: { gravity: { x: 0, y: 10 }, pixelsPerMeter: 50 },
        templates: {
          player: {
            id: 'player',
            tags: ['player'],
            behaviors: [
              {
                type: 'maintain_speed',
                speed: { expr: 'self.velocity.x + self.velocity.y' },
              },
            ],
          },
        },
        entities: [],
      };

      const analyzer = new DependencyAnalyzer(game);
      const report = analyzer.analyze();
      const watches = analyzer.getWatchSpecs();

      expect(watches.some(w => w.property === 'velocity.x')).toBe(true);
      expect(watches.some(w => w.property === 'velocity.y')).toBe(true);
      expect(report.stats.propertiesWatched).toContain('velocity.x');
      expect(report.stats.propertiesWatched).toContain('velocity.y');
    });

    it('detects property dependency in score_on_collision behavior', () => {
      const game: GameDefinition = {
        metadata: { id: 'test', title: 'Test', version: '1.0.0' },
        world: { gravity: { x: 0, y: 10 }, pixelsPerMeter: 50 },
        templates: {
          enemy: {
            id: 'enemy',
            tags: ['enemy'],
            behaviors: [
              {
                type: 'score_on_collision',
                withTags: ['player'],
                points: { expr: 'self.health * 10' },
              },
            ],
          },
        },
        entities: [],
      };

      const analyzer = new DependencyAnalyzer(game);
      const report = analyzer.analyze();
      const watches = analyzer.getWatchSpecs();

      expect(watches.some(w => w.property === 'health')).toBe(true);
      expect(report.stats.propertiesWatched).toContain('health');
    });
  });

  describe('analyze - rules', () => {
    it('detects property dependency in rule action', () => {
      const game: GameDefinition = {
        metadata: { id: 'test', title: 'Test', version: '1.0.0' },
        world: { gravity: { x: 0, y: 10 }, pixelsPerMeter: 50 },
        templates: {},
        entities: [],
        rules: [
          {
            id: 'rule-1',
            trigger: { type: 'frame' },
            actions: [
              {
                type: 'apply_impulse',
                target: { type: 'by_tag', tag: 'ball' },
                x: { expr: 'self.velocity.x * 2' },
              },
            ],
          },
        ],
      };

      const analyzer = new DependencyAnalyzer(game);
      const report = analyzer.analyze();
      const watches = analyzer.getWatchSpecs();

      expect(watches.some(w => w.property === 'velocity.x')).toBe(true);
    });

    it('detects property dependency in expression condition', () => {
      const game: GameDefinition = {
        metadata: { id: 'test', title: 'Test', version: '1.0.0' },
        world: { gravity: { x: 0, y: 10 }, pixelsPerMeter: 50 },
        templates: {},
        entities: [],
        rules: [
          {
            id: 'rule-1',
            trigger: { type: 'frame' },
            conditions: [
              {
                type: 'expression',
                expr: 'self.health > 50',
              },
            ],
            actions: [],
          },
        ],
      };

      const analyzer = new DependencyAnalyzer(game);
      const report = analyzer.analyze();
      const watches = analyzer.getWatchSpecs();

      expect(watches.some(w => w.property === 'health')).toBe(true);
    });

    it('detects dependencies in multiple rule actions', () => {
      const game: GameDefinition = {
        metadata: { id: 'test', title: 'Test', version: '1.0.0' },
        world: { gravity: { x: 0, y: 10 }, pixelsPerMeter: 50 },
        templates: {},
        entities: [],
        rules: [
          {
            id: 'rule-1',
            trigger: { type: 'frame' },
            actions: [
              {
                type: 'set_velocity',
                target: { type: 'self' },
                x: { expr: 'self.velocity.x + 1' },
                y: { expr: 'self.velocity.y - 1' },
              },
            ],
          },
        ],
      };

      const analyzer = new DependencyAnalyzer(game);
      const report = analyzer.analyze();
      const watches = analyzer.getWatchSpecs();

      expect(watches.some(w => w.property === 'velocity.x')).toBe(true);
      expect(watches.some(w => w.property === 'velocity.y')).toBe(true);
    });
  });

  describe('validation errors', () => {
    it('reports error for invalid expression syntax', () => {
      const game: GameDefinition = {
        metadata: { id: 'test', title: 'Test', version: '1.0.0' },
        world: { gravity: { x: 0, y: 10 }, pixelsPerMeter: 50 },
        templates: {
          ball: {
            id: 'ball',
            behaviors: [
              {
                type: 'maintain_speed',
                speed: { expr: 'self.velocity.x +++' },
              },
            ],
          },
        },
        entities: [],
      };

      const analyzer = new DependencyAnalyzer(game);
      const report = analyzer.analyze();

      expect(report.valid).toBe(false);
      expect(report.errors).toHaveLength(1);
      expect(report.errors[0].code).toBe('INVALID_EXPRESSION');
    });

    it('reports warning for unknown property', () => {
      const game: GameDefinition = {
        metadata: { id: 'test', title: 'Test', version: '1.0.0' },
        world: { gravity: { x: 0, y: 10 }, pixelsPerMeter: 50 },
        templates: {
          ball: {
            id: 'ball',
            behaviors: [
              {
                type: 'maintain_speed',
                speed: { expr: 'self.unknownProperty' },
              },
            ],
          },
        },
        entities: [],
      };

      const analyzer = new DependencyAnalyzer(game);
      const report = analyzer.analyze();

      expect(report.warnings).toHaveLength(1);
      expect(report.warnings[0].code).toBe('UNKNOWN_PROPERTY');
      expect(report.warnings[0].message).toContain('unknownProperty');
    });
  });

  describe('dependency graph', () => {
    it('builds dependency graph for entities', () => {
      const game: GameDefinition = {
        metadata: { id: 'test', title: 'Test', version: '1.0.0' },
        world: { gravity: { x: 0, y: 10 }, pixelsPerMeter: 50 },
        templates: {},
        entities: [
          {
            id: 'ball-1',
            name: 'Ball',
            transform: { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
            tags: ['ball'],
            behaviors: [
              {
                type: 'maintain_speed',
                speed: { expr: 'self.velocity.x' },
              },
            ],
          },
        ],
      };

      const analyzer = new DependencyAnalyzer(game);
      const report = analyzer.analyze();

      expect(report.dependencyGraph['ball-1']).toBeDefined();
      expect(report.dependencyGraph['ball-1'].needs).toContain('velocity.x');
      expect(report.dependencyGraph['ball-1'].behaviors).toContain('maintain_speed');
    });
  });

  describe('stats', () => {
    it('computes accurate statistics', () => {
      const game: GameDefinition = {
        metadata: { id: 'test', title: 'Test', version: '1.0.0' },
        world: { gravity: { x: 0, y: 10 }, pixelsPerMeter: 50 },
        templates: {
          ball: {
            id: 'ball',
            behaviors: [
              {
                type: 'maintain_speed',
                speed: { expr: 'self.velocity.x' },
              },
            ],
          },
        },
        entities: [
          {
            id: 'ball-1',
            name: 'Ball',
            transform: { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
            template: 'ball',
          },
        ],
        rules: [
          {
            id: 'rule-1',
            trigger: { type: 'frame' },
            actions: [],
          },
        ],
      };

      const analyzer = new DependencyAnalyzer(game);
      const report = analyzer.analyze();

      expect(report.stats.totalExpressions).toBe(1);
      expect(report.stats.totalBehaviors).toBe(1);
      expect(report.stats.totalRules).toBe(1);
      expect(report.stats.totalEntities).toBe(1);
      expect(report.stats.propertiesWatched.length).toBeGreaterThan(0);
    });
  });

  describe('watch scope determination', () => {
    it('creates self-scoped watches for entity behaviors', () => {
      const game: GameDefinition = {
        metadata: { id: 'test', title: 'Test', version: '1.0.0' },
        world: { gravity: { x: 0, y: 10 }, pixelsPerMeter: 50 },
        templates: {
          ball: {
            id: 'ball',
            behaviors: [
              {
                type: 'maintain_speed',
                speed: { expr: 'self.velocity.x' },
              },
            ],
          },
        },
        entities: [],
      };

      const analyzer = new DependencyAnalyzer(game);
      analyzer.analyze();
      const watches = analyzer.getWatchSpecs();

      const velocityWatch = watches.find(w => w.property === 'velocity.x');
      expect(velocityWatch).toBeDefined();
      expect(velocityWatch?.scope.type).toBe('self');
    });
  });
});
