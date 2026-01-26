[**@slopcade/shared v1.0.0**](../README.md)

***

[@slopcade/shared](../README.md) / SheetLayoutSchema

# Variable: SheetLayoutSchema

> `const` **SheetLayoutSchema**: `ZodDiscriminatedUnion`\<`"type"`, \[`ZodObject`\<\{ `type`: `ZodLiteral`\<`"grid"`\>; `columns`: `ZodNumber`; `rows`: `ZodNumber`; `cellWidth`: `ZodNumber`; `cellHeight`: `ZodNumber`; `spacing`: `ZodOptional`\<`ZodNumber`\>; `margin`: `ZodOptional`\<`ZodNumber`\>; `origin`: `ZodOptional`\<`ZodLiteral`\<`"top-left"`\>\>; \}, `"strip"`, `ZodTypeAny`, \{ `type`: `"grid"`; `columns`: `number`; `rows`: `number`; `cellWidth`: `number`; `cellHeight`: `number`; `spacing?`: `number`; `margin?`: `number`; `origin?`: `"top-left"`; \}, \{ `type`: `"grid"`; `columns`: `number`; `rows`: `number`; `cellWidth`: `number`; `cellHeight`: `number`; `spacing?`: `number`; `margin?`: `number`; `origin?`: `"top-left"`; \}\>, `ZodObject`\<\{ `type`: `ZodLiteral`\<`"strip"`\>; `direction`: `ZodEnum`\<\[`"horizontal"`, `"vertical"`\]\>; `frameCount`: `ZodNumber`; `cellWidth`: `ZodNumber`; `cellHeight`: `ZodNumber`; `spacing`: `ZodOptional`\<`ZodNumber`\>; `margin`: `ZodOptional`\<`ZodNumber`\>; \}, `"strip"`, `ZodTypeAny`, \{ `type`: `"strip"`; `direction`: `"horizontal"` \| `"vertical"`; `frameCount`: `number`; `cellWidth`: `number`; `cellHeight`: `number`; `spacing?`: `number`; `margin?`: `number`; \}, \{ `type`: `"strip"`; `direction`: `"horizontal"` \| `"vertical"`; `frameCount`: `number`; `cellWidth`: `number`; `cellHeight`: `number`; `spacing?`: `number`; `margin?`: `number`; \}\>, `ZodObject`\<\{ `type`: `ZodLiteral`\<`"manual"`\>; \}, `"strip"`, `ZodTypeAny`, \{ `type`: `"manual"`; \}, \{ `type`: `"manual"`; \}\>\]\>

Defined in: [types/schemas.ts:698](https://github.com/hassoncs/clover/blob/4fd406b0597c61e88b1324c5a31ce13307db5f2a/shared/src/types/schemas.ts#L698)
