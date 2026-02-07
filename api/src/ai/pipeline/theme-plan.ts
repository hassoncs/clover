/**
 * Theme Plan Types
 *
 * Versioned schema for holistic theme planning output from txt2txt AI planner.
 * Represents a coherent themed asset design for an entire game.
 */

import { z } from 'zod';

// =============================================================================
// TEMPLATE PLAN - Per-template asset design
// =============================================================================

/**
 * Design plan for a single template within a themed asset pack.
 */
export interface TemplatePlan {
  /** Template identifier (e.g., "ball", "peg", "bucket") */
  templateId: string;
  /** Human-readable concept name (e.g., "jack-o-lantern", "bubbling cauldron") */
  conceptName: string;
  /** Full image generation prompt for this template */
  prompt: string;
  /** Optional negative prompt (what to avoid) */
  negativePrompt?: string;
  /** Hex color for the silhouette (e.g., "#FF6600") */
  silhouetteColor: string;
  /** Rationale for this concept choice (for debugging/review) */
  rationale: string;
  /** Skip silhouette-guided generation for irregular/organic shapes (use txt2img instead) */
  skipSilhouette?: boolean;
}

export const TemplatePlanSchema = z.object({
  templateId: z.string(),
  conceptName: z.string(),
  prompt: z.string(),
  negativePrompt: z.string().optional(),
  silhouetteColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Must be a valid hex color'),
  rationale: z.string(),
  skipSilhouette: z.boolean().optional(),
});

// =============================================================================
// COHESION ANCHORS - Theme coherence metadata
// =============================================================================

/**
 * Anchors that ensure visual coherence across all templates.
 */
export interface CohesionAnchors {
  /** Shared motif family (e.g., "Halloween decorations", "underwater creatures") */
  motifFamily: string;
  /** Color harmony strategy (e.g., "warm autumn tones", "complementary blue-orange") */
  colorHarmony: string;
  /** Mood descriptor (e.g., "playful spooky", "serene underwater") */
  moodDescriptor: string;
}

export const CohesionAnchorsSchema = z.object({
  motifFamily: z.string(),
  colorHarmony: z.string(),
  moodDescriptor: z.string(),
});

// =============================================================================
// THEME PLAN - Complete themed asset pack design
// =============================================================================

/**
 * Complete theme plan output from txt2txt AI planner.
 * Version 1 schema.
 */
export interface ThemePlan {
  /** Schema version for future migration */
  version: 1;
  /** Theme description (e.g., "spooky Halloween") */
  theme: string;
  /** Optional style descriptor (e.g., "cartoon") */
  style?: string;
  /** Coherent color palette for the entire pack (hex colors) */
  globalPalette: string[];
  /** Per-template design plans keyed by templateId */
  templatePlans: Record<string, TemplatePlan>;
  /** Coherence anchors for the theme */
  cohesionAnchors: CohesionAnchors;
  /** ISO timestamp of plan generation */
  generatedAt: string;
  /** Optional provider model identifier (e.g., "openai/gpt-4o-mini") */
  providerModel?: string;
}

export const ThemePlanSchema = z.object({
  version: z.literal(1),
  theme: z.string(),
  style: z.string().optional(),
  globalPalette: z.array(z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Must be a valid hex color')),
  templatePlans: z.record(z.string(), TemplatePlanSchema),
  cohesionAnchors: CohesionAnchorsSchema,
  generatedAt: z.string().datetime(),
  providerModel: z.string().optional(),
});

// =============================================================================
// VALIDATION FUNCTIONS
// =============================================================================

/**
 * Parse and validate unknown JSON as a ThemePlan.
 * @throws {z.ZodError} if validation fails
 */
export function parseThemePlan(json: unknown): ThemePlan {
  return ThemePlanSchema.parse(json) as ThemePlan;
}

/**
 * Validation result for plan coherence checks.
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validate plan coherence beyond schema validation.
 * Checks for:
 * - Unique concept names across templates
 * - Valid hex colors in silhouettes
 * - No duplicate colors in global palette
 */
export function validatePlanCoherence(plan: ThemePlan): ValidationResult {
  const errors: string[] = [];

  // Check for unique concept names
  const conceptNames = new Set<string>();
  for (const [templateId, templatePlan] of Object.entries(plan.templatePlans)) {
    if (conceptNames.has(templatePlan.conceptName)) {
      errors.push(`Duplicate concept name "${templatePlan.conceptName}" in template "${templateId}"`);
    }
    conceptNames.add(templatePlan.conceptName);

    // Validate silhouette color format (redundant with zod, but explicit)
    if (!/^#[0-9A-Fa-f]{6}$/.test(templatePlan.silhouetteColor)) {
      errors.push(`Invalid silhouette color "${templatePlan.silhouetteColor}" in template "${templateId}"`);
    }
  }

  // Check for duplicate colors in global palette
  const paletteSet = new Set<string>();
  for (const color of plan.globalPalette) {
    const normalized = color.toUpperCase();
    if (paletteSet.has(normalized)) {
      errors.push(`Duplicate color "${color}" in global palette`);
    }
    paletteSet.add(normalized);

    // Validate palette color format
    if (!/^#[0-9A-Fa-f]{6}$/.test(color)) {
      errors.push(`Invalid color "${color}" in global palette`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
