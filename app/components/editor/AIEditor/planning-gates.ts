import { z } from 'zod';

const GateFieldSchema = z.object({
  id: z.string(),
  label: z.string(),
  description: z.string(),
  required: z.boolean(),
  ai_extraction_hint: z.string().optional(),
});

const StageGateFieldSchema = z.object({
  id: z.string(),
  label: z.string(),
  description: z.string(),
  required: z.boolean(),
  ai_extraction_hint: z.string(),
});

const StageGateConfigSchema = z.object({
  stage: z.string(),
  gates: z.array(StageGateFieldSchema),
});

const GatesConfigSchema = z.object({
  gates: z.array(GateFieldSchema),
});

export type GateField = z.infer<typeof GateFieldSchema>;
export type StageGateField = z.infer<typeof StageGateFieldSchema>;
export type StageGateConfig = z.infer<typeof StageGateConfigSchema>;
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

  const lines = yamlContent.split('\n');
  const gates: GateField[] = [];
  let currentGate: Partial<GateField> | null = null;

  for (const line of lines) {
    const trimmed = line.trim();
    
    if (trimmed.startsWith('#') || trimmed === '') {
      continue;
    }

    if (trimmed === 'gates:') {
      continue;
    }

    if (trimmed.startsWith('- id:')) {
      if (currentGate && currentGate.id) {
        gates.push(currentGate as GateField);
      }
      currentGate = { id: trimmed.substring(5).trim() };
    } else if (currentGate) {
      if (trimmed.startsWith('label:')) {
        currentGate.label = trimmed.substring(6).trim();
      } else if (trimmed.startsWith('description:')) {
        currentGate.description = trimmed.substring(12).trim();
      } else if (trimmed.startsWith('required:')) {
        currentGate.required = trimmed.substring(9).trim() === 'true';
      } else if (trimmed.startsWith('ai_extraction_hint:')) {
        currentGate.ai_extraction_hint = trimmed.substring(19).trim();
      }
    }
  }

  if (currentGate && currentGate.id) {
    gates.push(currentGate as GateField);
  }

  const config = GatesConfigSchema.parse({ gates });
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

  let planningDoc: Record<string, unknown>;
  try {
    planningDoc = JSON.parse(planningDocJson);
  } catch {
    const requiredFields = config.gates.filter((g) => g.required);
    return {
      valid: false,
      missingFields: requiredFields.map((g) => ({ id: g.id, label: g.label })),
    };
  }

  const missingFields: Array<{ id: string; label: string }> = [];

  for (const gate of config.gates) {
    if (!gate.required) {
      continue;
    }

    const value = planningDoc[gate.id];
    if (!value || (typeof value === 'string' && value.trim() === '')) {
      missingFields.push({ id: gate.id, label: gate.label });
    }
  }

  return {
    valid: missingFields.length === 0,
    missingFields,
  };
}

export function getDefaultGatesConfig(): GatesConfig {
  const defaultYaml = `gates:
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
