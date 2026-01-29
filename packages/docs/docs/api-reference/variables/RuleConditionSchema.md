[**@slopcade/shared v1.0.0**](../README.md)

***

[@slopcade/shared](../README.md) / RuleConditionSchema

# Variable: RuleConditionSchema

> `const` **RuleConditionSchema**: `ZodDiscriminatedUnion`\<`"type"`, \[`ZodObject`\<\{ `type`: `ZodLiteral`\<`"score"`\>; `min`: `ZodOptional`\<`ZodNumber`\>; `max`: `ZodOptional`\<`ZodNumber`\>; \}, `"strip"`, `ZodTypeAny`, \{ `type`: `"score"`; `min?`: `number`; `max?`: `number`; \}, \{ `type`: `"score"`; `min?`: `number`; `max?`: `number`; \}\>, `ZodObject`\<\{ `type`: `ZodLiteral`\<`"time"`\>; `min`: `ZodOptional`\<`ZodNumber`\>; `max`: `ZodOptional`\<`ZodNumber`\>; \}, `"strip"`, `ZodTypeAny`, \{ `type`: `"time"`; `min?`: `number`; `max?`: `number`; \}, \{ `type`: `"time"`; `min?`: `number`; `max?`: `number`; \}\>, `ZodObject`\<\{ `type`: `ZodLiteral`\<`"entity_exists"`\>; `entityId`: `ZodOptional`\<`ZodString`\>; `entityTag`: `ZodOptional`\<`ZodString`\>; \}, `"strip"`, `ZodTypeAny`, \{ `type`: `"entity_exists"`; `entityId?`: `string`; `entityTag?`: `string`; \}, \{ `type`: `"entity_exists"`; `entityId?`: `string`; `entityTag?`: `string`; \}\>\]\>

Defined in: [types/schemas.ts:350](https://github.com/hassoncs/clover/blob/cee41593876c0ca0fbde75075f3d9c52884dee1e/shared/src/types/schemas.ts#L350)
