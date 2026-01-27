[**@slopcade/shared v1.0.0**](../README.md)

***

[@slopcade/shared](../README.md) / SpawnPositionSchema

# Variable: SpawnPositionSchema

> `const` **SpawnPositionSchema**: `ZodDiscriminatedUnion`\<`"type"`, \[`ZodObject`\<\{ `type`: `ZodLiteral`\<`"fixed"`\>; `x`: `ZodNumber`; `y`: `ZodNumber`; \}, `"strip"`, `ZodTypeAny`, \{ `type`: `"fixed"`; `x`: `number`; `y`: `number`; \}, \{ `type`: `"fixed"`; `x`: `number`; `y`: `number`; \}\>, `ZodObject`\<\{ `type`: `ZodLiteral`\<`"random"`\>; `bounds`: `ZodObject`\<\{ `minX`: `ZodNumber`; `maxX`: `ZodNumber`; `minY`: `ZodNumber`; `maxY`: `ZodNumber`; \}, `"strip"`, `ZodTypeAny`, \{ `minX`: `number`; `maxX`: `number`; `minY`: `number`; `maxY`: `number`; \}, \{ `minX`: `number`; `maxX`: `number`; `minY`: `number`; `maxY`: `number`; \}\>; \}, `"strip"`, `ZodTypeAny`, \{ `type`: `"random"`; `bounds`: \{ `minX`: `number`; `maxX`: `number`; `minY`: `number`; `maxY`: `number`; \}; \}, \{ `type`: `"random"`; `bounds`: \{ `minX`: `number`; `maxX`: `number`; `minY`: `number`; `maxY`: `number`; \}; \}\>, `ZodObject`\<\{ `type`: `ZodLiteral`\<`"at_entity"`\>; `entityId`: `ZodString`; \}, `"strip"`, `ZodTypeAny`, \{ `type`: `"at_entity"`; `entityId`: `string`; \}, \{ `type`: `"at_entity"`; `entityId`: `string`; \}\>, `ZodObject`\<\{ `type`: `ZodLiteral`\<`"at_collision"`\>; \}, `"strip"`, `ZodTypeAny`, \{ `type`: `"at_collision"`; \}, \{ `type`: `"at_collision"`; \}\>\]\>

Defined in: [types/schemas.ts:324](https://github.com/hassoncs/clover/blob/5a1034980770c49d5a2278254b551ba5ffaeefe1/shared/src/types/schemas.ts#L324)
