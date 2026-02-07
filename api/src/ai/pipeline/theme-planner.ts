/**
 * Theme Planner Service
 *
 * txt2txt AI service that generates a coherent ThemePlan for all game assets.
 * Takes game template context + theme/style and returns validated ThemePlan JSON.
 */

import type { EntityType } from '@/ai/pipeline/types';
import type { ThemePlan, CohesionAnchors } from '@/ai/pipeline/theme-plan';
import { parseThemePlan, validatePlanCoherence } from '@/ai/pipeline/theme-plan';

// =============================================================================
// INPUT TYPES
// =============================================================================

/**
 * Template information for theme planning.
 */
export interface TemplateInfo {
  templateId: string;
  whatDescription?: string;
  entityType: EntityType;
  physicsShape: 'box' | 'circle';
  tags: string[];
}

/**
 * Input parameters for the theme planner.
 */
export interface ThemePlannerInput {
  templates: TemplateInfo[];
  theme: string;
  style?: string;
  gameTitle?: string;
  existingAnchors?: CohesionAnchors;
  model?: string;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const DEFAULT_MODEL = 'openai/gpt-4o-mini';
const DEFAULT_MAX_TOKENS = 4000;

// =============================================================================
// SYSTEM PROMPT
// =============================================================================

function buildSystemPrompt(input: ThemePlannerInput): string {
  const templateList = input.templates
    .map((t) => {
      const desc = t.whatDescription ? ` - "${t.whatDescription}"` : '';
      return `  - ${t.templateId}: entityType=${t.entityType}, shape=${t.physicsShape}, tags=[${t.tags.join(', ')}]${desc}`;
    })
    .join('\n');

  const existingAnchorsSection = input.existingAnchors
    ? `
EXISTING COHESION ANCHORS (maintain consistency with these):
- Motif Family: ${input.existingAnchors.motifFamily}
- Color Harmony: ${input.existingAnchors.colorHarmony}
- Mood Descriptor: ${input.existingAnchors.moodDescriptor}
`
    : '';

  return `You are a game art director planning a coherent visual theme for ALL assets in a game.

THEME: ${input.theme}
${input.style ? `STYLE: ${input.style}` : ''}
${input.gameTitle ? `GAME TITLE: ${input.gameTitle}` : ''}

TEMPLATES TO DESIGN:
${templateList}
${existingAnchorsSection}
YOUR TASK:
Create a unified visual theme plan that ensures all game assets look like they belong together.
Each template needs a unique concept that fits the theme while respecting its functional role.

CRITICAL REQUIREMENTS:
1. Every templateId from the list above MUST appear in templatePlans — you MUST include ALL ${input.templates.length} templates
2. Each template MUST have a UNIQUE conceptName (no duplicates)
3. Each silhouetteColor MUST be a valid hex color (#RRGGBB format)
4. globalPalette should have 5-8 colors that work harmoniously together
5. All colors in globalPalette must be unique (no duplicates)
6. The generatedAt field must be a valid ISO 8601 datetime string

ISOLATION RULES FOR COMPONENT/PART ENTITIES:
When a game involves assembling parts onto a character (like Mr. Potato Head, dress-up games, build-a-robot, etc.):
- Each body part or accessory MUST be described as a STANDALONE, ISOLATED piece
- The prompt MUST emphasize "isolated [part] piece" or "standalone [part] on transparent background"
- NEVER describe a part in a way that could cause the AI to generate the whole character
- BAD: "A right arm for Mr. Potato Head" (AI generates the full character)
- GOOD: "An isolated plastic toy right arm piece, standalone, no body attached, transparent background"
- Set "skipSilhouette": true for irregular/organic shapes like arms, legs, ears, noses — these don't fit neatly into rectangles or circles

OUTPUT FORMAT:
You must output ONLY valid JSON matching this exact schema:

{
  "version": 1,
  "theme": "<theme description>",
  "style": "<optional style>",
  "globalPalette": ["#RRGGBB", "#RRGGBB", ...],
  "templatePlans": {
    "<templateId>": {
      "templateId": "<same as key>",
      "conceptName": "<unique human-readable concept>",
      "prompt": "<full image generation prompt>",
      "negativePrompt": "<optional: what to avoid>",
      "silhouetteColor": "#RRGGBB",
      "skipSilhouette": false,
      "rationale": "<why this concept fits>"
    }
  },
  "cohesionAnchors": {
    "motifFamily": "<shared visual motif>",
    "colorHarmony": "<color strategy>",
    "moodDescriptor": "<overall mood>"
  },
  "generatedAt": "<ISO 8601 datetime>",
  "providerModel": "<model used>"
}

Output ONLY the JSON object. No markdown, no explanation, no code fences.`;
}

// =============================================================================
// JSON EXTRACTION
// =============================================================================

function extractJson(text: string): string {
  let cleaned = text.trim();

  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.slice(7);
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.slice(3);
  }

  if (cleaned.endsWith('```')) {
    cleaned = cleaned.slice(0, -3);
  }

  return cleaned.trim();
}

// =============================================================================
// OPENROUTER API CALL
// =============================================================================

interface OpenRouterResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

async function callOpenRouter(
  systemPrompt: string,
  userPrompt: string,
  apiKey: string,
  model: string,
  temperature: number,
): Promise<string | null> {
  const response = await fetch(OPENROUTER_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: DEFAULT_MAX_TOKENS,
      temperature,
    }),
  });

  if (!response.ok) {
    console.log('[ThemePlanner] OpenRouter request failed:', response.status, response.statusText);
    return null;
  }

  const data = (await response.json()) as OpenRouterResponse;
  const content = data.choices[0]?.message?.content?.trim();

  if (!content) {
    console.log('[ThemePlanner] OpenRouter returned empty content');
    return null;
  }

  return content;
}

// =============================================================================
// MAIN FUNCTION
// =============================================================================

/**
 * Generate a coherent theme plan for all game templates.
 *
 * @param input - Template information and theme/style parameters
 * @param openrouterApiKey - OpenRouter API key
 * @returns Validated ThemePlan or null if generation fails
 */
export async function generateThemePlan(
  input: ThemePlannerInput,
  openrouterApiKey: string,
): Promise<ThemePlan | null> {
  const model = input.model ?? DEFAULT_MODEL;
  const systemPrompt = buildSystemPrompt(input);
  const expectedTemplateIds = new Set(input.templates.map(t => t.templateId));
  const userPrompt = `Generate the theme plan JSON for ALL ${input.templates.length} templates listed above. Every single templateId must appear in templatePlans.`;

  console.log('[ThemePlanner] Starting theme plan generation', {
    templateCount: input.templates.length,
    theme: input.theme,
    model,
  });

  const MAX_ATTEMPTS = 3;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const temperature = attempt === 0 ? 0.7 : 0.3;
    const attemptPrompt = attempt === 0
      ? userPrompt
      : `Generate the theme plan JSON for ALL ${input.templates.length} templates listed above.

IMPORTANT: Output ONLY valid JSON. No markdown code fences, no explanation text.
The JSON must be parseable directly.
You MUST include ALL of these templateIds: ${[...expectedTemplateIds].join(', ')}`;

    console.log(`[ThemePlanner] Attempt ${attempt + 1}/${MAX_ATTEMPTS} (temperature: ${temperature})`);

    const content = await callOpenRouter(systemPrompt, attemptPrompt, openrouterApiKey, model, temperature);

    if (!content) {
      console.log(`[ThemePlanner] Attempt ${attempt + 1} failed to get response`);
      continue;
    }

    const plan = tryParseAndValidate(content, model);

    if (!plan) {
      console.log(`[ThemePlanner] Attempt ${attempt + 1} failed validation`);
      continue;
    }

    const missingTemplates = [...expectedTemplateIds].filter(id => !plan.templatePlans[id]);
    if (missingTemplates.length > 0) {
      console.log(`[ThemePlanner] Attempt ${attempt + 1} missing ${missingTemplates.length} templates: ${missingTemplates.join(', ')}`);
      continue;
    }

    console.log(`[ThemePlanner] Successfully generated theme plan on attempt ${attempt + 1}`);
    return plan;
  }

  console.log('[ThemePlanner] Failed to generate valid theme plan after all attempts');
  return null;
}

// =============================================================================
// VALIDATION HELPER
// =============================================================================

function tryParseAndValidate(content: string, model: string): ThemePlan | null {
  try {
    const jsonStr = extractJson(content);
    const parsed = JSON.parse(jsonStr) as unknown;

    if (typeof parsed === 'object' && parsed !== null && !('providerModel' in parsed)) {
      (parsed as Record<string, unknown>).providerModel = model;
    }

    const plan = parseThemePlan(parsed);
    const coherenceResult = validatePlanCoherence(plan);

    if (!coherenceResult.valid) {
      console.log('[ThemePlanner] Coherence validation failed:', coherenceResult.errors);
      return null;
    }

    return plan;
  } catch (error) {
    if (error instanceof SyntaxError) {
      console.log('[ThemePlanner] JSON parse error:', error.message);
    } else if (error instanceof Error) {
      console.log('[ThemePlanner] Validation error:', error.message);
    }
    return null;
  }
}
