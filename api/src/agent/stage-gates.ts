import { z } from 'zod';

export const StageGateFieldSchema = z.object({
  id: z.string(),
  label: z.string(),
  description: z.string(),
  required: z.boolean(),
  ai_extraction_hint: z.string(),
});

export const StageGateConfigSchema = z.object({
  stage: z.string(),
  gates: z.array(StageGateFieldSchema),
});

export type StageGateField = z.infer<typeof StageGateFieldSchema>;
export type StageGateConfig = z.infer<typeof StageGateConfigSchema>;

export interface ValidationResult {
  valid: boolean;
  missingFields: Array<{ id: string; label: string }>;
}

const cachedConfigs: Record<string, StageGateConfig> = {};

export function parseStageGateConfig(yamlContent: string): StageGateConfig {
  const lines = yamlContent.split('\n');
  const gates: StageGateField[] = [];
  let stage = '';
  let currentGate: Partial<StageGateField> | null = null;

  for (const line of lines) {
    const trimmed = line.trim();
    
    if (trimmed.startsWith('#') || trimmed === '') {
      continue;
    }

    if (trimmed.startsWith('stage:')) {
      stage = trimmed.substring(6).trim();
      continue;
    }

    if (trimmed === 'gates:') {
      continue;
    }

    if (trimmed.startsWith('- id:')) {
      if (currentGate && currentGate.id) {
        gates.push(currentGate as StageGateField);
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
    gates.push(currentGate as StageGateField);
  }

  return StageGateConfigSchema.parse({ stage, gates });
}

export function getStageGateConfig(stage: string, yamlContent?: string): StageGateConfig {
  if (cachedConfigs[stage]) {
    return cachedConfigs[stage];
  }

  if (!yamlContent) {
    throw new Error(`No YAML content provided for stage: ${stage} and it is not cached.`);
  }

  const config = parseStageGateConfig(yamlContent);
  cachedConfigs[stage] = config;
  return config;
}

export function validateGateValues(
  values: Record<string, string | null | undefined>,
  config: StageGateConfig
): ValidationResult {
  const missingFields: Array<{ id: string; label: string }> = [];

  for (const gate of config.gates) {
    if (!gate.required) {
      continue;
    }

    const value = values[gate.id];
    if (!value || (typeof value === 'string' && value.trim() === '')) {
      missingFields.push({ id: gate.id, label: gate.label });
    }
  }

  return {
    valid: missingFields.length === 0,
    missingFields,
  };
}
