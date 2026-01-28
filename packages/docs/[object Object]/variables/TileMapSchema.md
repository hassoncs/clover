[**@slopcade/shared v1.0.0**](../README.md)

***

[@slopcade/shared](../README.md) / TileMapSchema

# Variable: TileMapSchema

> `const` **TileMapSchema**: `ZodObject`\<\{ `id`: `ZodString`; `name`: `ZodString`; `tileSheetId`: `ZodString`; `width`: `ZodNumber`; `height`: `ZodNumber`; `layers`: `ZodArray`\<`ZodObject`\<\{ `id`: `ZodString`; `name`: `ZodString`; `type`: `ZodEnum`\<\[`"background"`, `"collision"`, `"foreground"`, `"decoration"`\]\>; `visible`: `ZodBoolean`; `opacity`: `ZodNumber`; `data`: `ZodArray`\<`ZodNumber`, `"many"`\>; `parallaxFactor`: `ZodOptional`\<`ZodNumber`\>; `zIndex`: `ZodOptional`\<`ZodNumber`\>; \}, `"strip"`, `ZodTypeAny`, \{ `id`: `string`; `name`: `string`; `type`: `"collision"` \| `"background"` \| `"foreground"` \| `"decoration"`; `visible`: `boolean`; `opacity`: `number`; `data`: `number`[]; `parallaxFactor?`: `number`; `zIndex?`: `number`; \}, \{ `id`: `string`; `name`: `string`; `type`: `"collision"` \| `"background"` \| `"foreground"` \| `"decoration"`; `visible`: `boolean`; `opacity`: `number`; `data`: `number`[]; `parallaxFactor?`: `number`; `zIndex?`: `number`; \}\>, `"many"`\>; \}, `"strip"`, `ZodTypeAny`, \{ `id`: `string`; `name`: `string`; `tileSheetId`: `string`; `width`: `number`; `height`: `number`; `layers`: `object`[]; \}, \{ `id`: `string`; `name`: `string`; `tileSheetId`: `string`; `width`: `number`; `height`: `number`; `layers`: `object`[]; \}\>

Defined in: [types/schemas.ts:745](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/schemas.ts#L745)
