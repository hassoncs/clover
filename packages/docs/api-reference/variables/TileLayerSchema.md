[**@slopcade/shared v1.0.0**](../README.md)

***

[@slopcade/shared](../README.md) / TileLayerSchema

# Variable: TileLayerSchema

> `const` **TileLayerSchema**: `ZodObject`\<\{ `id`: `ZodString`; `name`: `ZodString`; `type`: `ZodEnum`\<\[`"background"`, `"collision"`, `"foreground"`, `"decoration"`\]\>; `visible`: `ZodBoolean`; `opacity`: `ZodNumber`; `data`: `ZodArray`\<`ZodNumber`, `"many"`\>; `parallaxFactor`: `ZodOptional`\<`ZodNumber`\>; `zIndex`: `ZodOptional`\<`ZodNumber`\>; \}, `"strip"`, `ZodTypeAny`, \{ `id`: `string`; `name`: `string`; `type`: `"collision"` \| `"background"` \| `"foreground"` \| `"decoration"`; `visible`: `boolean`; `opacity`: `number`; `data`: `number`[]; `parallaxFactor?`: `number`; `zIndex?`: `number`; \}, \{ `id`: `string`; `name`: `string`; `type`: `"collision"` \| `"background"` \| `"foreground"` \| `"decoration"`; `visible`: `boolean`; `opacity`: `number`; `data`: `number`[]; `parallaxFactor?`: `number`; `zIndex?`: `number`; \}\>

Defined in: [types/schemas.ts:661](https://github.com/hassoncs/clover/blob/5a1034980770c49d5a2278254b551ba5ffaeefe1/shared/src/types/schemas.ts#L661)
