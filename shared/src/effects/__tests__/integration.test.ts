import { describe, it, expect, beforeEach } from 'vitest';
import { ManifestRegistry } from '../registry';
import { registerBuiltInSeeds } from '../seeds/index';
import { authorGraph } from '../authoring';
import { ShaderPackageManager } from '../package';

describe('Effects V2 Integration', () => {
  let registry: ManifestRegistry;
  let packageManager: ShaderPackageManager;

  beforeEach(() => {
    registry = new ManifestRegistry();
    registerBuiltInSeeds(registry);
    packageManager = new ShaderPackageManager();
  });

  it('should perform a full author -> compile -> package -> publish -> retrieve roundtrip', async () => {
    const rawGraph = {
      id: 'test-effect',
      version: '1.0.0',
      engineApiVersion: '1.0.0',
      scope: 'screen',
      nodes: [
        {
          id: 'n1',
          type: 'noise',
          params: { scale: 5.0 },
          outputTarget: { bufferId: 'buf1', format: 'rgba8', resolution: 'full' }
        },
        {
          id: 'n2',
          type: 'blur',
          params: { radius: 2.0 },
          outputTarget: { bufferId: 'buf2', format: 'rgba8', resolution: 'full' }
        },
        {
          id: 'n3',
          type: 'level',
          params: { gamma: 1.5 },
          outputTarget: { bufferId: 'buf3', format: 'rgba8', resolution: 'full' }
        }
      ],
      connections: [
        { from: { nodeId: 'n1', output: 'buf1' }, to: { nodeId: 'n2', input: 'texture' } },
        { from: { nodeId: 'n2', output: 'buf2' }, to: { nodeId: 'n3', input: 'texture' } }
      ]
    };

    const authorResult = authorGraph(rawGraph, registry);
    expect(authorResult.success).toBe(true);
    expect(authorResult.plan).toBeDefined();
    expect(authorResult.graph).toBeDefined();

    const plan = authorResult.plan!;
    const graph = authorResult.graph!;

    expect(plan.passes).toHaveLength(3);
    expect(plan.passes[0].id).toBe('n1');
    expect(plan.passes[1].id).toBe('n2');
    expect(plan.passes[2].id).toBe('n3');

    const pkg = packageManager.createDraft({
      slug: 'test-effect-slug',
      engineApiVersion: '1.0.0',
      license: 'open',
      sourceType: 'ai',
      manifest: {
        name: 'Test Effect',
        description: 'A test effect from integration test',
        tags: ['test', 'integration'],
        categories: ['utility'],
        scopeSupport: ['screen'],
        nodeTypes: ['noise', 'blur', 'level'],
        parameterSummary: [],
        performanceTier: 'medium',
        compatibility: {},
        license: 'open'
      }
    });

    expect(pkg.status).toBe('draft');

    const version = packageManager.publish(pkg.id, {
      version: '1.0.0',
      graphSpec: graph,
      compiledPlan: plan,
      provenance: {
        sourceType: 'ai',
        compiledPrompt: 'Create a noise effect with blur and levels'
      }
    });

    expect(version.version).toBe('1.0.0');
    expect(packageManager.get(pkg.id)?.status).toBe('published');

    const retrievedVersion = packageManager.getVersion(pkg.id, '1.0.0');
    expect(retrievedVersion).toBeDefined();
    expect(retrievedVersion?.graphSpec.id).toBe('test-effect');
    expect(retrievedVersion?.compiledPlan.hash).toBe(plan.hash);

    expect(retrievedVersion?.graphSpec).toEqual(graph);
    expect(retrievedVersion?.compiledPlan).toEqual(plan);
  });

  it('should validate the example graph from the playbook', () => {
    const playbookGraph = {
      "id": "underwater-v1",
      "version": "1.0.0",
      "engineApiVersion": "1.0.0",
      "scope": "screen",
      "nodes": [
        {
          "id": "bg-noise",
          "type": "noise",
          "family": "generator",
          "params": { "scale": 2.0, "octaves": 3 },
          "outputTarget": { "bufferId": "b1", "format": "rgba8", "resolution": "full" }
        },
        {
          "id": "waves",
          "type": "blur",
          "family": "filter",
          "params": { "radius": 10.0 },
          "outputTarget": { "bufferId": "b2", "format": "rgba8", "resolution": "full" }
        },
        {
          "id": "tint",
          "type": "level",
          "family": "filter",
          "params": { "outputBlack": 0.1, "gamma": 1.2 },
          "outputTarget": { "bufferId": "b3", "format": "rgba8", "resolution": "full" }
        }
      ],
      "connections": [
        { "from": { "nodeId": "bg-noise", "output": "b1" }, "to": { "nodeId": "waves", "input": "texture" } },
        { "from": { "nodeId": "waves", "output": "b2" }, "to": { "nodeId": "tint", "input": "texture" } }
      ]
    };

    const result = authorGraph(playbookGraph, registry);
    expect(result.success).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should fail if a generator has an input (validation check)', () => {
    const invalidGraph = {
      id: 'invalid-generator',
      version: '1.0.0',
      engineApiVersion: '1.0.0',
      scope: 'screen',
      nodes: [
        {
          id: 'n1',
          type: 'noise',
          outputTarget: { bufferId: 'buf1', format: 'rgba8', resolution: 'full' }
        },
        {
          id: 'n2',
          type: 'noise',
          outputTarget: { bufferId: 'buf2', format: 'rgba8', resolution: 'full' }
        }
      ],
      connections: [
        { from: { nodeId: 'n1', output: 'texture' }, to: { nodeId: 'n2', input: 'texture' } }
      ]
    };

    const result = authorGraph(invalidGraph, registry);
    expect(result.success).toBe(false);
    expect(result.errors.some(e => e.code === 'E_GENERATOR_HAS_INPUT')).toBe(true);
  });
});
