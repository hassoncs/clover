import { z } from 'zod';

export const ExpressionValueSchema = z.object({
  expr: z.string(),
  debugName: z.string().optional(),
  cache: z.enum(['none', 'frame']).optional(),
});

export function valueSchema<T extends z.ZodTypeAny>(innerSchema: T) {
  return z.union([innerSchema, ExpressionValueSchema]);
}

export const NumberValueSchema = valueSchema(z.number());
export const PositiveNumberValueSchema = valueSchema(z.number().positive());
export const NonNegativeNumberValueSchema = valueSchema(z.number().nonnegative());

export const Vec2ValueSchema = z.union([
  z.object({ x: z.number(), y: z.number() }),
  ExpressionValueSchema,
]);

export const TuningConfigSchema = z.object({
  min: z.number(),
  max: z.number(),
  step: z.number().positive(),
});

export const VariableCategorySchema = z.enum(['physics', 'gameplay', 'visuals', 'economy', 'ai']);

export const VariableWithTuningSchema = z.object({
  value: z.union([
    z.number(),
    z.boolean(),
    z.string(),
    z.object({ x: z.number(), y: z.number() }),
    ExpressionValueSchema,
  ]),
  tuning: TuningConfigSchema.optional(),
  category: VariableCategorySchema.optional(),
  label: z.string().optional(),
  description: z.string().optional(),
  display: z.boolean().optional(),
});

export const GameVariableSchema = z.union([
  z.number(),
  z.boolean(),
  z.string(),
  z.object({ x: z.number(), y: z.number() }),
  ExpressionValueSchema,
  VariableWithTuningSchema,
]);

export const GameVariablesSchema = z.record(z.string(), GameVariableSchema);
