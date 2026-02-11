import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

const GAMES_DIR = path.resolve(__dirname, '../../../../r2/games');

function getGameDirs(): string[] {
  return fs
    .readdirSync(GAMES_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .filter((d) => fs.existsSync(path.join(GAMES_DIR, d.name, 'definition.json')))
    .map((d) => d.name)
    .sort();
}

const gameDirs = getGameDirs();

describe('Sectioned Bridge Regression - All Games', () => {
  it('discovers at least 10 games', () => {
    expect(gameDirs.length).toBeGreaterThanOrEqual(10);
  });

  describe.each(gameDirs)('%s', (gameName) => {
    const defPath = path.join(GAMES_DIR, gameName, 'definition.json');

    function loadDefinition(): Record<string, unknown> {
      const raw = fs.readFileSync(defPath, 'utf-8');
      return JSON.parse(raw) as Record<string, unknown>;
    }

    it('parses as valid JSON', () => {
      expect(() => loadDefinition()).not.toThrow();
    });

    it('has valid world section with gravity and pixelsPerMeter', () => {
      const def = loadDefinition();
      const world = def.world as Record<string, unknown>;
      expect(world).toBeDefined();

      const gravity = world.gravity as Record<string, unknown>;
      expect(gravity).toBeDefined();
      expect(typeof gravity.x).toBe('number');
      expect(typeof gravity.y).toBe('number');

      expect(typeof world.pixelsPerMeter).toBe('number');
    });

    it('has world bounds', () => {
      const def = loadDefinition();
      const world = def.world as Record<string, unknown>;
      const bounds = world.bounds as Record<string, unknown>;
      expect(bounds).toBeDefined();
      expect(typeof bounds.width).toBe('number');
      expect(typeof bounds.height).toBe('number');
    });

    it('has templates object with at least 1 template', () => {
      const def = loadDefinition();
      const templates = def.templates as Record<string, unknown>;
      expect(templates).toBeDefined();
      expect(typeof templates).toBe('object');
      expect(Object.keys(templates).length).toBeGreaterThanOrEqual(1);
    });

    it('has entities array', () => {
      const def = loadDefinition();
      expect(Array.isArray(def.entities)).toBe(true);
    });

    it('has rules array or undefined', () => {
      const def = loadDefinition();
      if (def.rules !== undefined) {
        expect(Array.isArray(def.rules)).toBe(true);
      }
    });

    it('world section can be extracted for bridge setupWorld', () => {
      const def = loadDefinition();
      const world = def.world as Record<string, unknown>;

      const worldSection = {
        gravity: world.gravity,
        pixelsPerMeter: world.pixelsPerMeter,
        bounds: world.bounds,
      };

      expect(worldSection.gravity).toBeDefined();
      expect(worldSection.gravity).not.toBeNull();
      expect(worldSection.pixelsPerMeter).toBeDefined();
      expect(worldSection.pixelsPerMeter).not.toBeNull();
      expect(worldSection.bounds).toBeDefined();
      expect(worldSection.bounds).not.toBeNull();
    });

    it('templates section can be extracted for bridge registerTemplates', () => {
      const def = loadDefinition();
      const templatesSection = def.templates as Record<string, unknown>;

      expect(templatesSection).toBeDefined();
      expect(templatesSection).not.toBeNull();
      expect(typeof templatesSection).toBe('object');

      for (const [key, template] of Object.entries(templatesSection)) {
        expect(typeof key).toBe('string');
        expect(template).toBeDefined();
        expect(template).not.toBeNull();
      }
    });

    it('entities section can be extracted for bridge loadEntities', () => {
      const def = loadDefinition();
      const entitiesSection = def.entities as unknown[];

      expect(entitiesSection).toBeDefined();
      expect(entitiesSection).not.toBeNull();
      expect(Array.isArray(entitiesSection)).toBe(true);
    });
  });
});
