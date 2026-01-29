[**@slopcade/shared v1.0.0**](../README.md)

***

[@slopcade/shared](../README.md) / AssetConfigSchema

# Variable: AssetConfigSchema

> `const` **AssetConfigSchema**: `ZodObject`\<\{ `imageUrl`: `ZodOptional`\<`ZodString`\>; `assetRef`: `ZodOptional`\<`ZodString`\>; `source`: `ZodOptional`\<`ZodEnum`\<\[`"generated"`, `"uploaded"`, `"none"`\]\>\>; `scale`: `ZodOptional`\<`ZodNumber`\>; `offsetX`: `ZodOptional`\<`ZodNumber`\>; `offsetY`: `ZodOptional`\<`ZodNumber`\>; `animations`: `ZodOptional`\<`ZodRecord`\<`ZodString`, `ZodObject`\<\{ `frames`: `ZodArray`\<`ZodString`, `"many"`\>; `fps`: `ZodNumber`; `loop`: `ZodOptional`\<`ZodBoolean`\>; \}, `"strip"`, `ZodTypeAny`, \{ `frames`: `string`[]; `fps`: `number`; `loop?`: `boolean`; \}, \{ `frames`: `string`[]; `fps`: `number`; `loop?`: `boolean`; \}\>\>\>; \}, `"strip"`, `ZodTypeAny`, \{ `imageUrl?`: `string`; `assetRef?`: `string`; `source?`: `"none"` \| `"generated"` \| `"uploaded"`; `scale?`: `number`; `offsetX?`: `number`; `offsetY?`: `number`; `animations?`: `Record`\<`string`, \{ `frames`: `string`[]; `fps`: `number`; `loop?`: `boolean`; \}\>; \}, \{ `imageUrl?`: `string`; `assetRef?`: `string`; `source?`: `"none"` \| `"generated"` \| `"uploaded"`; `scale?`: `number`; `offsetX?`: `number`; `offsetY?`: `number`; `animations?`: `Record`\<`string`, \{ `frames`: `string`[]; `fps`: `number`; `loop?`: `boolean`; \}\>; \}\>

Defined in: [types/schemas.ts:688](https://github.com/hassoncs/clover/blob/cee41593876c0ca0fbde75075f3d9c52884dee1e/shared/src/types/schemas.ts#L688)
