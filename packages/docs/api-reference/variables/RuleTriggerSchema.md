[**@slopcade/shared v1.0.0**](../README.md)

***

[@slopcade/shared](../README.md) / RuleTriggerSchema

# Variable: RuleTriggerSchema

> `const` **RuleTriggerSchema**: `ZodDiscriminatedUnion`\<`"type"`, \[`ZodObject`\<\{ `type`: `ZodLiteral`\<`"collision"`\>; `entityATag`: `ZodString`; `entityBTag`: `ZodString`; \}, `"strip"`, `ZodTypeAny`, \{ `type`: `"collision"`; `entityATag`: `string`; `entityBTag`: `string`; \}, \{ `type`: `"collision"`; `entityATag`: `string`; `entityBTag`: `string`; \}\>, `ZodObject`\<\{ `type`: `ZodLiteral`\<`"timer"`\>; `time`: `ZodNumber`; `repeat`: `ZodOptional`\<`ZodBoolean`\>; \}, `"strip"`, `ZodTypeAny`, \{ `type`: `"timer"`; `time`: `number`; `repeat?`: `boolean`; \}, \{ `type`: `"timer"`; `time`: `number`; `repeat?`: `boolean`; \}\>, `ZodObject`\<\{ `type`: `ZodLiteral`\<`"score"`\>; `threshold`: `ZodNumber`; `comparison`: `ZodEnum`\<\[`"gte"`, `"lte"`, `"eq"`\]\>; \}, `"strip"`, `ZodTypeAny`, \{ `type`: `"score"`; `threshold`: `number`; `comparison`: `"gte"` \| `"lte"` \| `"eq"`; \}, \{ `type`: `"score"`; `threshold`: `number`; `comparison`: `"gte"` \| `"lte"` \| `"eq"`; \}\>\]\>

Defined in: [types/schemas.ts:266](https://github.com/hassoncs/clover/blob/4fd406b0597c61e88b1324c5a31ce13307db5f2a/shared/src/types/schemas.ts#L266)
