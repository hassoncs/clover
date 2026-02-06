import { z } from 'zod';
import { getStageGateConfig, validateGateValues, type StageGateField, type StageGateConfig } from './stage-gates';

const GateFieldSchema = z.object({
  id: z.string(),
  label: z.string(),
  description: z.string(),
  required: z.boolean(),
});

const GatesConfigSchema = z.object({
  gates: z.array(GateFieldSchema),
});

export type GateField = z.infer<typeof GateFieldSchema>;
export type GatesConfig = z.infer<typeof GatesConfigSchema>;

export interface ValidationResult {
  valid: boolean;
  missingFields: Array<{ id: string; label: string }>;
}

let cachedConfig: GatesConfig | null = null;

export function loadGatesConfig(yamlContent: string): GatesConfig {
  if (cachedConfig) {
    return cachedConfig;
  }

  const stageConfig = getStageGateConfig('planning', yamlContent);
  const config = {
    gates: stageConfig.gates.map(g => ({
      id: g.id,
      label: g.label,
      description: g.description,
      required: g.required
    }))
  };
  
  cachedConfig = config;
  return config;
}

export function validatePlanningDoc(
  planningDocJson: string | null | undefined,
  config: GatesConfig
): ValidationResult {
  if (!planningDocJson) {
    const requiredFields = config.gates.filter((g) => g.required);
    return {
      valid: false,
      missingFields: requiredFields.map((g) => ({ id: g.id, label: g.label })),
    };
  }

  let planningDoc: Record<string, any>;
  try {
    planningDoc = JSON.parse(planningDocJson);
  } catch {
    const requiredFields = config.gates.filter((g) => g.required);
    return {
      valid: false,
      missingFields: requiredFields.map((g) => ({ id: g.id, label: g.label })),
    };
  }

  const stageConfig: StageGateConfig = {
    stage: 'planning',
    gates: config.gates.map(g => ({
      ...g,
      ai_extraction_hint: ''
    }))
  };

  return validateGateValues(planningDoc, stageConfig);
}

export function getDefaultGatesConfig(): GatesConfig {
  const defaultYaml = `stage: planning
gates:
  - id: core_game_loop
    label: Core Game Loop
    description: Describe the main gameplay loop - what does the player do repeatedly?
    required: true
    ai_extraction_hint: Look for descriptions of the main player action, game mechanics, or what happens on each turn/frame
  - id: win_lose_conditions
    label: Win/Lose Conditions
    description: Define how the player wins or loses the game
    required: true
    ai_extraction_hint: Look for win/loss conditions, scoring rules, victory requirements, or failure states
  - id: theme_style
    label: Theme & Style
    description: Describe the visual theme and art style
    required: true
    ai_extraction_hint: Look for visual descriptions, color schemes, art style preferences, or aesthetic references
  - id: game_type_category
    label: Game Type/Category
    description: What type of game is this?
    required: true
    ai_extraction_hint: Look for genre mentions, gameplay style references, or comparisons to existing games`;

  return loadGatesConfig(defaultYaml);
}

