[**@slopcade/shared v1.0.0**](../README.md)

***

[@slopcade/shared](../README.md) / SheetTileMetadataSchema

# Variable: SheetTileMetadataSchema

> `const` **SheetTileMetadataSchema**: `ZodObject`\<\{ `name`: `ZodOptional`\<`ZodString`\>; `tags`: `ZodOptional`\<`ZodArray`\<`ZodString`, `"many"`\>\>; `collision`: `ZodOptional`\<`ZodUnion`\<\[`ZodLiteral`\<`"none"`\>, `ZodLiteral`\<`"full"`\>, `ZodLiteral`\<`"platform"`\>, `ZodObject`\<\{ `polygon`: `ZodArray`\<`ZodObject`\<\{ `x`: `ZodNumber`; `y`: `ZodNumber`; \}, `"strip"`, `ZodTypeAny`, \{ `x`: `number`; `y`: `number`; \}, \{ `x`: `number`; `y`: `number`; \}\>, `"many"`\>; \}, `"strip"`, `ZodTypeAny`, \{ `polygon`: `object`[]; \}, \{ `polygon`: `object`[]; \}\>\]\>\>; `animation`: `ZodOptional`\<`ZodObject`\<\{ `frames`: `ZodArray`\<`ZodNumber`, `"many"`\>; `fps`: `ZodNumber`; `loop`: `ZodOptional`\<`ZodBoolean`\>; \}, `"strip"`, `ZodTypeAny`, \{ `frames`: `number`[]; `fps`: `number`; `loop?`: `boolean`; \}, \{ `frames`: `number`[]; `fps`: `number`; `loop?`: `boolean`; \}\>\>; `promptOverride`: `ZodOptional`\<`ZodString`\>; \}, `"strip"`, `ZodTypeAny`, \{ `name?`: `string`; `tags?`: `string`[]; `collision?`: `"none"` \| `"full"` \| `"platform"` \| \{ `polygon`: `object`[]; \}; `animation?`: \{ `frames`: `number`[]; `fps`: `number`; `loop?`: `boolean`; \}; `promptOverride?`: `string`; \}, \{ `name?`: `string`; `tags?`: `string`[]; `collision?`: `"none"` \| `"full"` \| `"platform"` \| \{ `polygon`: `object`[]; \}; `animation?`: \{ `frames`: `number`[]; `fps`: `number`; `loop?`: `boolean`; \}; `promptOverride?`: `string`; \}\>

Defined in: [types/schemas.ts:813](https://github.com/hassoncs/clover/blob/5a1034980770c49d5a2278254b551ba5ffaeefe1/shared/src/types/schemas.ts#L813)
