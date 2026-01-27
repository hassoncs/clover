[**@slopcade/shared v1.0.0**](../README.md)

***

[@slopcade/shared](../README.md) / PresentationConfigSchema

# Variable: PresentationConfigSchema

> `const` **PresentationConfigSchema**: `ZodObject`\<\{ `aspectRatio`: `ZodOptional`\<`ZodUnion`\<\[`ZodObject`\<\{ `width`: `ZodNumber`; `height`: `ZodNumber`; \}, `"strip"`, `ZodTypeAny`, \{ `width`: `number`; `height`: `number`; \}, \{ `width`: `number`; `height`: `number`; \}\>, `ZodNumber`\]\>\>; `fit`: `ZodOptional`\<`ZodEnum`\<\[`"contain"`, `"cover"`\]\>\>; `letterboxColor`: `ZodOptional`\<`ZodString`\>; `orientation`: `ZodOptional`\<`ZodEnum`\<\[`"portrait"`, `"landscape"`, `"any"`\]\>\>; \}, `"strip"`, `ZodTypeAny`, \{ `aspectRatio?`: `number` \| \{ `width`: `number`; `height`: `number`; \}; `fit?`: `"contain"` \| `"cover"`; `letterboxColor?`: `string`; `orientation?`: `"any"` \| `"portrait"` \| `"landscape"`; \}, \{ `aspectRatio?`: `number` \| \{ `width`: `number`; `height`: `number`; \}; `fit?`: `"contain"` \| `"cover"`; `letterboxColor?`: `string`; `orientation?`: `"any"` \| `"portrait"` \| `"landscape"`; \}\>

Defined in: [types/schemas.ts:569](https://github.com/hassoncs/clover/blob/5a1034980770c49d5a2278254b551ba5ffaeefe1/shared/src/types/schemas.ts#L569)
