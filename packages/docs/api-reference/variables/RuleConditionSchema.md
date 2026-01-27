[**@slopcade/shared v1.0.0**](../README.md)

***

[@slopcade/shared](../README.md) / RuleConditionSchema

# Variable: RuleConditionSchema

> `const` **RuleConditionSchema**: `ZodDiscriminatedUnion`\<`"type"`, \[`ZodObject`\<\{ `type`: `ZodLiteral`\<`"score"`\>; `min`: `ZodOptional`\<`ZodNumber`\>; `max`: `ZodOptional`\<`ZodNumber`\>; \}, `"strip"`, `ZodTypeAny`, \{ `type`: `"score"`; `min?`: `number`; `max?`: `number`; \}, \{ `type`: `"score"`; `min?`: `number`; `max?`: `number`; \}\>, `ZodObject`\<\{ `type`: `ZodLiteral`\<`"time"`\>; `min`: `ZodOptional`\<`ZodNumber`\>; `max`: `ZodOptional`\<`ZodNumber`\>; \}, `"strip"`, `ZodTypeAny`, \{ `type`: `"time"`; `min?`: `number`; `max?`: `number`; \}, \{ `type`: `"time"`; `min?`: `number`; `max?`: `number`; \}\>, `ZodObject`\<\{ `type`: `ZodLiteral`\<`"entity_exists"`\>; `entityId`: `ZodOptional`\<`ZodString`\>; `entityTag`: `ZodOptional`\<`ZodString`\>; \}, `"strip"`, `ZodTypeAny`, \{ `type`: `"entity_exists"`; `entityId?`: `string`; `entityTag?`: `string`; \}, \{ `type`: `"entity_exists"`; `entityId?`: `string`; `entityTag?`: `string`; \}\>\]\>

Defined in: [types/schemas.ts:315](https://github.com/hassoncs/clover/blob/2f9210785e99663f02331a1f99376dd2b95d60e1/shared/src/types/schemas.ts#L315)
