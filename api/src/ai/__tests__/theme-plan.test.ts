import { describe, it, expect } from 'vitest';
import { parseThemePlan, validatePlanCoherence, type ThemePlan } from '@/ai/pipeline/theme-plan';

describe('parseThemePlan', () => {
  it('should parse a valid plan successfully', () => {
    const validPlan: ThemePlan = {
      version: 1,
      theme: 'spooky Halloween',
      style: 'cartoon',
      globalPalette: ['#FF6600', '#000000', '#FFFFFF'],
      prefabPlans: {
        ball: {
          prefabId: 'ball',
          conceptName: 'jack-o-lantern',
          prompt: 'A glowing jack-o-lantern pumpkin with a carved spooky face',
          negativePrompt: 'realistic, photo',
          silhouetteColor: '#FF6600',
          rationale: 'Classic Halloween icon that fits the spooky theme',
        },
        peg: {
          prefabId: 'peg',
          conceptName: 'bubbling cauldron',
          prompt: 'A witch\'s cauldron bubbling with green potion',
          silhouetteColor: '#000000',
          rationale: 'Witch theme complements jack-o-lantern',
        },
      },
      cohesionAnchors: {
        motifFamily: 'Halloween decorations',
        colorHarmony: 'warm autumn tones with dark accents',
        moodDescriptor: 'playful spooky',
      },
      generatedAt: '2026-02-06T12:00:00Z',
      providerModel: 'openai/gpt-4o-mini',
    };

    const result = parseThemePlan(validPlan);
    expect(result).toEqual(validPlan);
  });

  it('should reject plan with invalid version', () => {
    const invalidPlan = {
      version: 2,
      theme: 'test',
      globalPalette: ['#FF0000'],
      prefabPlans: {},
      cohesionAnchors: {
        motifFamily: 'test',
        colorHarmony: 'test',
        moodDescriptor: 'test',
      },
      generatedAt: '2026-02-06T12:00:00Z',
    };

    expect(() => parseThemePlan(invalidPlan)).toThrow();
  });

  it('should reject plan with invalid hex color in silhouette', () => {
    const invalidPlan = {
      version: 1,
      theme: 'test',
      globalPalette: ['#FF0000'],
      prefabPlans: {
        ball: {
          prefabId: 'ball',
          conceptName: 'test',
          prompt: 'test prompt',
          silhouetteColor: 'red',
          rationale: 'test',
        },
      },
      cohesionAnchors: {
        motifFamily: 'test',
        colorHarmony: 'test',
        moodDescriptor: 'test',
      },
      generatedAt: '2026-02-06T12:00:00Z',
    };

    expect(() => parseThemePlan(invalidPlan)).toThrow();
  });

  it('should reject plan with invalid hex color in global palette', () => {
    const invalidPlan = {
      version: 1,
      theme: 'test',
      globalPalette: ['red', '#FF0000'],
      prefabPlans: {},
      cohesionAnchors: {
        motifFamily: 'test',
        colorHarmony: 'test',
        moodDescriptor: 'test',
      },
      generatedAt: '2026-02-06T12:00:00Z',
    };

    expect(() => parseThemePlan(invalidPlan)).toThrow();
  });

  it('should reject plan missing required theme field', () => {
    const invalidPlan = {
      version: 1,
      globalPalette: ['#FF0000'],
      prefabPlans: {},
      cohesionAnchors: {
        motifFamily: 'test',
        colorHarmony: 'test',
        moodDescriptor: 'test',
      },
      generatedAt: '2026-02-06T12:00:00Z',
    };

    expect(() => parseThemePlan(invalidPlan)).toThrow();
  });

  it('should accept plan with empty prefabPlans', () => {
    const validPlan = {
      version: 1,
      theme: 'test theme',
      globalPalette: ['#FF0000', '#00FF00'],
      prefabPlans: {},
      cohesionAnchors: {
        motifFamily: 'test family',
        colorHarmony: 'test harmony',
        moodDescriptor: 'test mood',
      },
      generatedAt: '2026-02-06T12:00:00Z',
    };

    const result = parseThemePlan(validPlan);
    expect(result.prefabPlans).toEqual({});
  });
});

describe('validatePlanCoherence', () => {
  it('should pass validation for a well-formed plan', () => {
    const validPlan: ThemePlan = {
      version: 1,
      theme: 'underwater',
      globalPalette: ['#0066CC', '#00CCFF', '#FFCC00'],
      prefabPlans: {
        ball: {
          prefabId: 'ball',
          conceptName: 'bubble',
          prompt: 'A shimmering bubble floating underwater',
          silhouetteColor: '#00CCFF',
          rationale: 'Bubbles are iconic underwater elements',
        },
        peg: {
          prefabId: 'peg',
          conceptName: 'coral',
          prompt: 'A colorful coral formation',
          silhouetteColor: '#FFCC00',
          rationale: 'Coral adds underwater scenery',
        },
      },
      cohesionAnchors: {
        motifFamily: 'underwater creatures',
        colorHarmony: 'blue and yellow complementary',
        moodDescriptor: 'serene underwater',
      },
      generatedAt: '2026-02-06T12:00:00Z',
    };

    const result = validatePlanCoherence(validPlan);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should detect duplicate concept names', () => {
    const invalidPlan: ThemePlan = {
      version: 1,
      theme: 'test',
      globalPalette: ['#FF0000'],
      prefabPlans: {
        ball: {
          prefabId: 'ball',
          conceptName: 'pumpkin',
          prompt: 'A pumpkin',
          silhouetteColor: '#FF6600',
          rationale: 'test',
        },
        peg: {
          prefabId: 'peg',
          conceptName: 'pumpkin',
          prompt: 'Another pumpkin',
          silhouetteColor: '#FF6601',
          rationale: 'test',
        },
      },
      cohesionAnchors: {
        motifFamily: 'test',
        colorHarmony: 'test',
        moodDescriptor: 'test',
      },
      generatedAt: '2026-02-06T12:00:00Z',
    };

    const result = validatePlanCoherence(invalidPlan);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors.some(e => e.includes('Duplicate concept name'))).toBe(true);
    expect(result.errors.some(e => e.includes('pumpkin'))).toBe(true);
  });

  it('should detect duplicate colors in global palette', () => {
    const invalidPlan: ThemePlan = {
      version: 1,
      theme: 'test',
      globalPalette: ['#FF0000', '#00FF00', '#ff0000'],
      prefabPlans: {
        ball: {
          prefabId: 'ball',
          conceptName: 'test',
          prompt: 'test',
          silhouetteColor: '#FF0000',
          rationale: 'test',
        },
      },
      cohesionAnchors: {
        motifFamily: 'test',
        colorHarmony: 'test',
        moodDescriptor: 'test',
      },
      generatedAt: '2026-02-06T12:00:00Z',
    };

    const result = validatePlanCoherence(invalidPlan);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors.some(e => e.includes('Duplicate color'))).toBe(true);
    expect(result.errors.some(e => e.includes('global palette'))).toBe(true);
  });

  it('should accept plan with empty prefabPlans', () => {
    const validPlan: ThemePlan = {
      version: 1,
      theme: 'test',
      globalPalette: ['#FF0000', '#00FF00'],
      prefabPlans: {},
      cohesionAnchors: {
        motifFamily: 'test',
        colorHarmony: 'test',
        moodDescriptor: 'test',
      },
      generatedAt: '2026-02-06T12:00:00Z',
    };

    const result = validatePlanCoherence(validPlan);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
});
