[**@slopcade/shared v1.0.0**](../README.md)

***

[@slopcade/shared](../README.md) / RuleConditionSchema

# Variable: RuleConditionSchema

> `const` **RuleConditionSchema**: `ZodDiscriminatedUnion`\<`"type"`, \[`ZodObject`\<\{ `type`: `ZodLiteral`\<`"score"`\>; `min`: `ZodOptional`\<`ZodNumber`\>; `max`: `ZodOptional`\<`ZodNumber`\>; \}, `"strip"`, `ZodTypeAny`, \{ `type`: `"score"`; `min?`: `number`; `max?`: `number`; \}, \{ `type`: `"score"`; `min?`: `number`; `max?`: `number`; \}\>, `ZodObject`\<\{ `type`: `ZodLiteral`\<`"time"`\>; `min`: `ZodOptional`\<`ZodNumber`\>; `max`: `ZodOptional`\<`ZodNumber`\>; \}, `"strip"`, `ZodTypeAny`, \{ `type`: `"time"`; `min?`: `number`; `max?`: `number`; \}, \{ `type`: `"time"`; `min?`: `number`; `max?`: `number`; \}\>, `ZodObject`\<\{ `type`: `ZodLiteral`\<`"entity_exists"`\>; `entityId`: `ZodOptional`\<`ZodString`\>; `entityTag`: `ZodOptional`\<`ZodString`\>; \}, `"strip"`, `ZodTypeAny`, \{ `type`: `"entity_exists"`; `entityId?`: `string`; `entityTag?`: `string`; \}, \{ `type`: `"entity_exists"`; `entityId?`: `string`; `entityTag?`: `string`; \}\>\]\>

Defined in: [types/schemas.ts:350](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/schemas.ts#L350)
