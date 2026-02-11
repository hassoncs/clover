import { describe, it, expect } from 'vitest';
import * as path from 'node:path';
import { compileBundle, compileSectioned } from '../compiler';
import { NodeFileReader } from '../FileReader';

const BUNDLE_PATH = path.resolve(__dirname, '../../../../r2/games/ballSort/bundle');

describe('Ball Sort Migration', () => {
  const fileReader = new NodeFileReader();

  it('compileBundle succeeds with no errors', () => {
    const result = compileBundle(BUNDLE_PATH, { fileReader });

    expect(result.errors).toEqual([]);
    expect(result.success).toBe(true);
    expect(result.gameDefinition).not.toBeNull();
  });

  it('produces correct metadata from manifest', () => {
    const result = compileBundle(BUNDLE_PATH, { fileReader });
    const def = result.gameDefinition!;

    expect(def.metadata.id).toBe('ballSort');
    expect(def.metadata.title).toBe('Ball Sort');
    expect(def.metadata.description).toBe(
      'Sort colored balls into tubes - each tube should contain only one color'
    );
    expect(def.metadata.version).toBe('2.0.0');
  });

  it('produces correct world config', () => {
    const result = compileBundle(BUNDLE_PATH, { fileReader });
    const def = result.gameDefinition!;

    expect(def.world.gravity).toEqual({ x: 0, y: 0 });
    expect(def.world.pixelsPerMeter).toBe(50);
    expect(def.world.bounds).toEqual({ width: 14.4, height: 25.6 });
  });

  it('has all 12 templates', () => {
    const result = compileBundle(BUNDLE_PATH, { fileReader });
    const def = result.gameDefinition!;

    const templateKeys = Object.keys(def.templates);
    expect(templateKeys).toHaveLength(12);

    expect(def.templates).toHaveProperty('background');
    expect(def.templates).toHaveProperty('tube');
    expect(def.templates).toHaveProperty('tubeHoverHighlight');
    expect(def.templates).toHaveProperty('heldBallIndicator');

    for (let i = 0; i <= 7; i++) {
      expect(def.templates).toHaveProperty(`ball${i}`);
    }
  });

  it('has all 2 entities', () => {
    const result = compileBundle(BUNDLE_PATH, { fileReader });
    const def = result.gameDefinition!;

    expect(def.entities).toHaveLength(2);
    expect(def.entities[0].id).toBe('background');
    expect(def.entities[1].id).toBe('tube-hover-highlight');
  });

  it('has all 8 rules', () => {
    const result = compileBundle(BUNDLE_PATH, { fileReader });
    const def = result.gameDefinition!;

    expect(def.rules).toHaveLength(8);

    const ruleIds = def.rules!.map(r => r.id);
    expect(ruleIds).toContain('generate_level');
    expect(ruleIds).toContain('tap_tube_idle');
    expect(ruleIds).toContain('tap_tube_holding');
    expect(ruleIds).toContain('cancel_pickup_same_tube');
    expect(ruleIds).toContain('check_win');
    expect(ruleIds).toContain('handle_delayed_win');
    expect(ruleIds).toContain('dialog_next_level');
    expect(ruleIds).toContain('dialog_replay_level');
  });

  it('has script content with expected exports', () => {
    const result = compileBundle(BUNDLE_PATH, { fileReader });
    const def = result.gameDefinition!;

    expect(def.script).toBeDefined();
    expect(def.script).toContain('exports.generateLevel');
    expect(def.script).toContain('exports.nextLevel');
    expect(def.script).toContain('exports.replayLevel');
    expect(def.script).toContain('exports.onStart');
  });

  it('has stateMachines from manifest systems', () => {
    const result = compileBundle(BUNDLE_PATH, { fileReader });
    const def = result.gameDefinition!;

    expect(def.stateMachines).toBeUndefined();

    const rawSystems = (result.rawData.manifest as Record<string, unknown>)?.systems as
      | Record<string, unknown>
      | undefined;
    expect(rawSystems?.stateMachines).toBeDefined();
  });

  it('compileSectioned succeeds', () => {
    const result = compileSectioned(BUNDLE_PATH, fileReader);

    expect(result.errors).toEqual([]);
    expect(result.success).toBe(true);
    expect(result.bundle).not.toBeNull();
  });

  it('compileSectioned produces valid sections', () => {
    const result = compileSectioned(BUNDLE_PATH, fileReader);
    const sections = result.bundle!.sections;

    expect(sections.world).toBeDefined();
    expect(sections.world.gravity).toEqual({ x: 0, y: 0 });

    expect(Object.keys(sections.templates)).toHaveLength(12);
    expect(sections.entities).toHaveLength(2);
    expect(sections.rules).toHaveLength(8);
    expect(sections.script).toBeDefined();
  });

  it('compileSectioned produces a content hash', () => {
    const result = compileSectioned(BUNDLE_PATH, fileReader);

    expect(result.bundle!.contentHash).toBeDefined();
    expect(result.bundle!.contentHash).toMatch(/^[a-f0-9]{64}$/);
    expect(result.bundle!.version).toBe('1.0');
  });

  it('processes all expected files', () => {
    const result = compileBundle(BUNDLE_PATH, { fileReader });

    expect(result.processedFiles).toContain('manifest.json');
    expect(result.processedFiles.some(f => f.startsWith('templates/'))).toBe(true);
    expect(result.processedFiles.some(f => f.startsWith('entities/'))).toBe(true);
    expect(result.processedFiles.some(f => f.startsWith('rules/'))).toBe(true);
    expect(result.processedFiles.some(f => f.startsWith('scripts/'))).toBe(true);
  });
});
