[**@slopcade/shared v1.0.0**](../README.md)

***

[@slopcade/shared](../README.md) / PresentationConfigSchema

# Variable: PresentationConfigSchema

> `const` **PresentationConfigSchema**: `ZodObject`\<\{ `aspectRatio`: `ZodOptional`\<`ZodUnion`\<\[`ZodObject`\<\{ `width`: `ZodNumber`; `height`: `ZodNumber`; \}, `"strip"`, `ZodTypeAny`, \{ `width`: `number`; `height`: `number`; \}, \{ `width`: `number`; `height`: `number`; \}\>, `ZodNumber`\]\>\>; `fit`: `ZodOptional`\<`ZodEnum`\<\[`"contain"`, `"cover"`\]\>\>; `letterboxColor`: `ZodOptional`\<`ZodString`\>; `orientation`: `ZodOptional`\<`ZodEnum`\<\[`"portrait"`, `"landscape"`, `"any"`\]\>\>; \}, `"strip"`, `ZodTypeAny`, \{ `aspectRatio?`: `number` \| \{ `width`: `number`; `height`: `number`; \}; `fit?`: `"contain"` \| `"cover"`; `letterboxColor?`: `string`; `orientation?`: `"any"` \| `"portrait"` \| `"landscape"`; \}, \{ `aspectRatio?`: `number` \| \{ `width`: `number`; `height`: `number`; \}; `fit?`: `"contain"` \| `"cover"`; `letterboxColor?`: `string`; `orientation?`: `"any"` \| `"portrait"` \| `"landscape"`; \}\>

Defined in: [types/schemas.ts:533](https://github.com/hassoncs/clover/blob/4fd406b0597c61e88b1324c5a31ce13307db5f2a/shared/src/types/schemas.ts#L533)
