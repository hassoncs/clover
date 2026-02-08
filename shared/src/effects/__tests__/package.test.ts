import { describe, it, expect, beforeEach } from 'vitest';
import {
  ShaderPackageManager,
  type ShaderPackage,
  type ShaderPackageVersion,
  type PackageProvenance,
  type PackageStatus,
  type SourceType,
  type LicenseType,
  type CompatibilityResult,
  type CompatibilityError,
} from '../package';
import type { PackageManifest } from '../registry';
import type { EffectGraphSpec, CompiledPlan } from '../types';

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

function makeManifest(overrides: Partial<PackageManifest> = {}): PackageManifest {
  return {
    name: 'Test Effect',
    description: 'A test shader effect',
    tags: ['test'],
    categories: ['filter'],
    scopeSupport: ['screen'],
    nodeTypes: ['filter.blur.gaussian'],
    parameterSummary: [],
    performanceTier: 'medium',
    compatibility: {},
    license: 'open',
    ...overrides,
  };
}

function makeGraphSpec(overrides: Partial<EffectGraphSpec> = {}): EffectGraphSpec {
  return {
    id: 'graph-1',
    version: '1.0.0',
    engineApiVersion: '2.0.0',
    scope: 'screen',
    nodes: [],
    connections: [],
    feedbackEdges: [],
    lifecycle: { autoStart: true, stopMode: 'clear' },
    ...overrides,
  };
}

function makeCompiledPlan(overrides: Partial<CompiledPlan> = {}): CompiledPlan {
  return {
    id: 'plan-1',
    graphId: 'graph-1',
    graphVersion: '1.0.0',
    engineApiVersion: '2.0.0',
    scope: 'screen',
    passes: [],
    resourceMap: {},
    feedbackPolicies: {},
    hash: 'abc123',
    compiledAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function makeProvenance(overrides: Partial<PackageProvenance> = {}): PackageProvenance {
  return {
    sourceType: 'user',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ShaderPackageManager', () => {
  let manager: ShaderPackageManager;

  beforeEach(() => {
    manager = new ShaderPackageManager();
  });

  describe('createDraft', () => {
    it('creates a draft package with correct status', () => {
      const pkg = manager.createDraft({
        slug: 'bloom-effect',
        manifest: makeManifest({ name: 'Bloom' }),
        engineApiVersion: '2.0.0',
        license: 'open',
      });

      expect(pkg.status).toBe('draft');
      expect(pkg.slug).toBe('bloom-effect');
      expect(pkg.engineApiVersion).toBe('2.0.0');
      expect(pkg.license).toBe('open');
      expect(pkg.manifest.name).toBe('Bloom');
      expect(pkg.id).toBeTruthy();
      expect(pkg.createdAt).toBeTruthy();
      expect(pkg.updatedAt).toBeTruthy();
    });

    it('assigns optional creatorId', () => {
      const pkg = manager.createDraft({
        slug: 'bloom-effect',
        manifest: makeManifest(),
        engineApiVersion: '2.0.0',
        creatorId: 'user-42',
        license: 'open',
      });

      expect(pkg.creatorId).toBe('user-42');
    });

    it('rejects duplicate slugs', () => {
      manager.createDraft({
        slug: 'bloom-effect',
        manifest: makeManifest(),
        engineApiVersion: '2.0.0',
        license: 'open',
      });

      expect(() =>
        manager.createDraft({
          slug: 'bloom-effect',
          manifest: makeManifest(),
          engineApiVersion: '2.0.0',
          license: 'open',
        }),
      ).toThrow(/slug.*already exists/i);
    });
  });

  describe('updateDraft', () => {
    it('updates manifest on a draft package', () => {
      const pkg = manager.createDraft({
        slug: 'bloom-effect',
        manifest: makeManifest({ name: 'Bloom v1' }),
        engineApiVersion: '2.0.0',
        license: 'open',
      });

      const updated = manager.updateDraft(pkg.id, {
        manifest: makeManifest({ name: 'Bloom v2' }),
      });

      expect(updated.manifest.name).toBe('Bloom v2');
    });

    it('updates license on a draft package', () => {
      const pkg = manager.createDraft({
        slug: 'bloom-effect',
        manifest: makeManifest(),
        engineApiVersion: '2.0.0',
        license: 'open',
      });

      const updated = manager.updateDraft(pkg.id, { license: 'proprietary' });
      expect(updated.license).toBe('proprietary');
    });

    it('fails to update a published package', () => {
      const pkg = manager.createDraft({
        slug: 'bloom-effect',
        manifest: makeManifest(),
        engineApiVersion: '2.0.0',
        license: 'open',
      });

      manager.publish(pkg.id, {
        version: '1.0.0',
        graphSpec: makeGraphSpec(),
        compiledPlan: makeCompiledPlan(),
        provenance: makeProvenance(),
      });

      expect(() =>
        manager.updateDraft(pkg.id, { license: 'custom' }),
      ).toThrow(/cannot update.*not.*draft/i);
    });

    it('fails for non-existent package', () => {
      expect(() =>
        manager.updateDraft('nope', { license: 'open' }),
      ).toThrow(/not found/i);
    });
  });

  describe('publish', () => {
    it('creates immutable version and transitions to published', () => {
      const pkg = manager.createDraft({
        slug: 'bloom-effect',
        manifest: makeManifest(),
        engineApiVersion: '2.0.0',
        license: 'open',
      });

      const version = manager.publish(pkg.id, {
        version: '1.0.0',
        graphSpec: makeGraphSpec(),
        compiledPlan: makeCompiledPlan(),
        provenance: makeProvenance(),
      });

      expect(version.version).toBe('1.0.0');
      expect(version.packageId).toBe(pkg.id);
      expect(version.publishedAt).toBeTruthy();
      expect(version.id).toBeTruthy();

      const retrieved = manager.get(pkg.id);
      expect(retrieved?.status).toBe('published');
    });

    it('rejects duplicate version strings', () => {
      const pkg = manager.createDraft({
        slug: 'bloom-effect',
        manifest: makeManifest(),
        engineApiVersion: '2.0.0',
        license: 'open',
      });

      manager.publish(pkg.id, {
        version: '1.0.0',
        graphSpec: makeGraphSpec(),
        compiledPlan: makeCompiledPlan(),
        provenance: makeProvenance(),
      });

      expect(() =>
        manager.publish(pkg.id, {
          version: '1.0.0',
          graphSpec: makeGraphSpec(),
          compiledPlan: makeCompiledPlan(),
          provenance: makeProvenance(),
        }),
      ).toThrow(/version.*1\.0\.0.*already exists/i);
    });

    it('allows publishing additional versions on a published package', () => {
      const pkg = manager.createDraft({
        slug: 'bloom-effect',
        manifest: makeManifest(),
        engineApiVersion: '2.0.0',
        license: 'open',
      });

      manager.publish(pkg.id, {
        version: '1.0.0',
        graphSpec: makeGraphSpec(),
        compiledPlan: makeCompiledPlan(),
        provenance: makeProvenance(),
      });

      const v2 = manager.publish(pkg.id, {
        version: '2.0.0',
        graphSpec: makeGraphSpec(),
        compiledPlan: makeCompiledPlan(),
        provenance: makeProvenance(),
      });

      expect(v2.version).toBe('2.0.0');
      expect(manager.listVersions(pkg.id)).toHaveLength(2);
    });

    it('rejects invalid semver version strings', () => {
      const pkg = manager.createDraft({
        slug: 'bloom-effect',
        manifest: makeManifest(),
        engineApiVersion: '2.0.0',
        license: 'open',
      });

      expect(() =>
        manager.publish(pkg.id, {
          version: 'not-semver',
          graphSpec: makeGraphSpec(),
          compiledPlan: makeCompiledPlan(),
          provenance: makeProvenance(),
        }),
      ).toThrow(/invalid semver/i);
    });

    it('rejects publishing on deprecated package', () => {
      const pkg = manager.createDraft({
        slug: 'bloom-effect',
        manifest: makeManifest(),
        engineApiVersion: '2.0.0',
        license: 'open',
      });

      manager.publish(pkg.id, {
        version: '1.0.0',
        graphSpec: makeGraphSpec(),
        compiledPlan: makeCompiledPlan(),
        provenance: makeProvenance(),
      });

      manager.deprecate(pkg.id);

      expect(() =>
        manager.publish(pkg.id, {
          version: '2.0.0',
          graphSpec: makeGraphSpec(),
          compiledPlan: makeCompiledPlan(),
          provenance: makeProvenance(),
        }),
      ).toThrow(/deprecated/i);
    });

    it('includes preview thumbnail when provided', () => {
      const pkg = manager.createDraft({
        slug: 'bloom-effect',
        manifest: makeManifest(),
        engineApiVersion: '2.0.0',
        license: 'open',
      });

      const version = manager.publish(pkg.id, {
        version: '1.0.0',
        graphSpec: makeGraphSpec(),
        compiledPlan: makeCompiledPlan(),
        provenance: makeProvenance(),
        preview: { thumbnailR2Key: 'previews/bloom-1.0.0.png' },
      });

      expect(version.preview?.thumbnailR2Key).toBe('previews/bloom-1.0.0.png');
    });
  });

  describe('deprecate', () => {
    it('transitions published package to deprecated', () => {
      const pkg = manager.createDraft({
        slug: 'bloom-effect',
        manifest: makeManifest(),
        engineApiVersion: '2.0.0',
        license: 'open',
      });

      manager.publish(pkg.id, {
        version: '1.0.0',
        graphSpec: makeGraphSpec(),
        compiledPlan: makeCompiledPlan(),
        provenance: makeProvenance(),
      });

      const deprecated = manager.deprecate(pkg.id);
      expect(deprecated.status).toBe('deprecated');
    });

    it('rejects deprecating a draft package', () => {
      const pkg = manager.createDraft({
        slug: 'bloom-effect',
        manifest: makeManifest(),
        engineApiVersion: '2.0.0',
        license: 'open',
      });

      expect(() => manager.deprecate(pkg.id)).toThrow(/cannot deprecate.*draft/i);
    });
  });

  describe('checkCompatibility', () => {
    it('returns compatible when major version matches and minor >=', () => {
      const pkg = manager.createDraft({
        slug: 'bloom-effect',
        manifest: makeManifest(),
        engineApiVersion: '2.0.0',
        license: 'open',
      });

      const version = manager.publish(pkg.id, {
        version: '1.0.0',
        graphSpec: makeGraphSpec({ engineApiVersion: '2.0.0' }),
        compiledPlan: makeCompiledPlan({ engineApiVersion: '2.0.0' }),
        provenance: makeProvenance(),
      });

      const result = manager.checkCompatibility(version, '2.1.0');
      expect(result.compatible).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('returns compatible when engine versions match exactly', () => {
      const pkg = manager.createDraft({
        slug: 'bloom-effect',
        manifest: makeManifest(),
        engineApiVersion: '2.0.0',
        license: 'open',
      });

      const version = manager.publish(pkg.id, {
        version: '1.0.0',
        graphSpec: makeGraphSpec({ engineApiVersion: '2.0.0' }),
        compiledPlan: makeCompiledPlan({ engineApiVersion: '2.0.0' }),
        provenance: makeProvenance(),
      });

      const result = manager.checkCompatibility(version, '2.0.0');
      expect(result.compatible).toBe(true);
    });

    it('returns E_ENGINE_VERSION_MISMATCH when major version differs', () => {
      const pkg = manager.createDraft({
        slug: 'bloom-effect',
        manifest: makeManifest(),
        engineApiVersion: '2.0.0',
        license: 'open',
      });

      const version = manager.publish(pkg.id, {
        version: '1.0.0',
        graphSpec: makeGraphSpec({ engineApiVersion: '2.0.0' }),
        compiledPlan: makeCompiledPlan({ engineApiVersion: '2.0.0' }),
        provenance: makeProvenance(),
      });

      const result = manager.checkCompatibility(version, '3.0.0');
      expect(result.compatible).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({ code: 'E_ENGINE_VERSION_MISMATCH' }),
      );
    });

    it('returns E_ENGINE_VERSION_MISMATCH when current minor < required minor', () => {
      const pkg = manager.createDraft({
        slug: 'bloom-effect',
        manifest: makeManifest(),
        engineApiVersion: '2.3.0',
        license: 'open',
      });

      const version = manager.publish(pkg.id, {
        version: '1.0.0',
        graphSpec: makeGraphSpec({ engineApiVersion: '2.3.0' }),
        compiledPlan: makeCompiledPlan({ engineApiVersion: '2.3.0' }),
        provenance: makeProvenance(),
      });

      const result = manager.checkCompatibility(version, '2.1.0');
      expect(result.compatible).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({ code: 'E_ENGINE_VERSION_MISMATCH' }),
      );
    });

    it('returns E_DEPRECATED_PACKAGE for deprecated packages', () => {
      const pkg = manager.createDraft({
        slug: 'bloom-effect',
        manifest: makeManifest(),
        engineApiVersion: '2.0.0',
        license: 'open',
      });

      const version = manager.publish(pkg.id, {
        version: '1.0.0',
        graphSpec: makeGraphSpec({ engineApiVersion: '2.0.0' }),
        compiledPlan: makeCompiledPlan({ engineApiVersion: '2.0.0' }),
        provenance: makeProvenance(),
      });

      manager.deprecate(pkg.id);

      const result = manager.checkCompatibility(version, '2.0.0');
      expect(result.compatible).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({ code: 'E_DEPRECATED_PACKAGE' }),
      );
    });
  });

  describe('provenance tracking', () => {
    it('records AI source type with compiledPrompt', () => {
      const pkg = manager.createDraft({
        slug: 'ai-bloom',
        manifest: makeManifest(),
        engineApiVersion: '2.0.0',
        license: 'open',
      });

      const version = manager.publish(pkg.id, {
        version: '1.0.0',
        graphSpec: makeGraphSpec(),
        compiledPlan: makeCompiledPlan(),
        provenance: makeProvenance({
          sourceType: 'ai',
          compiledPrompt: 'Create a bloom effect with warm tones',
          generationJobId: 'job-123',
        }),
      });

      expect(version.provenance.sourceType).toBe('ai');
      expect(version.provenance.compiledPrompt).toBe(
        'Create a bloom effect with warm tones',
      );
      expect(version.provenance.generationJobId).toBe('job-123');
    });
  });

  describe('system package restrictions', () => {
    it('prevents updating system packages', () => {
      const pkg = manager.createDraft({
        slug: 'system-blur',
        manifest: makeManifest(),
        engineApiVersion: '2.0.0',
        license: 'open',
        sourceType: 'system',
      });

      expect(() =>
        manager.updateDraft(pkg.id, { license: 'proprietary' }),
      ).toThrow(/system.*not editable/i);
    });
  });

  describe('get / getVersion / listVersions', () => {
    it('retrieves package by id', () => {
      const pkg = manager.createDraft({
        slug: 'bloom-effect',
        manifest: makeManifest(),
        engineApiVersion: '2.0.0',
        license: 'open',
      });

      expect(manager.get(pkg.id)).toEqual(pkg);
    });

    it('returns undefined for non-existent package', () => {
      expect(manager.get('nope')).toBeUndefined();
    });

    it('retrieves specific version', () => {
      const pkg = manager.createDraft({
        slug: 'bloom-effect',
        manifest: makeManifest(),
        engineApiVersion: '2.0.0',
        license: 'open',
      });

      manager.publish(pkg.id, {
        version: '1.0.0',
        graphSpec: makeGraphSpec(),
        compiledPlan: makeCompiledPlan(),
        provenance: makeProvenance(),
      });

      const v = manager.getVersion(pkg.id, '1.0.0');
      expect(v).toBeDefined();
      expect(v?.version).toBe('1.0.0');
    });

    it('returns undefined for non-existent version', () => {
      const pkg = manager.createDraft({
        slug: 'bloom-effect',
        manifest: makeManifest(),
        engineApiVersion: '2.0.0',
        license: 'open',
      });

      expect(manager.getVersion(pkg.id, '9.9.9')).toBeUndefined();
    });

    it('lists all versions for a package', () => {
      const pkg = manager.createDraft({
        slug: 'bloom-effect',
        manifest: makeManifest(),
        engineApiVersion: '2.0.0',
        license: 'open',
      });

      manager.publish(pkg.id, {
        version: '1.0.0',
        graphSpec: makeGraphSpec(),
        compiledPlan: makeCompiledPlan(),
        provenance: makeProvenance(),
      });

      manager.publish(pkg.id, {
        version: '1.1.0',
        graphSpec: makeGraphSpec(),
        compiledPlan: makeCompiledPlan(),
        provenance: makeProvenance(),
      });

      const versions = manager.listVersions(pkg.id);
      expect(versions).toHaveLength(2);
      expect(versions.map((v) => v.version)).toEqual(['1.0.0', '1.1.0']);
    });
  });
});
