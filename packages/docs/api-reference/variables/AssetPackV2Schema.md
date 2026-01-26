[**@slopcade/shared v1.0.0**](../README.md)

***

[@slopcade/shared](../README.md) / AssetPackV2Schema

# Variable: AssetPackV2Schema

> `const` **AssetPackV2Schema**: `ZodObject`\<\{ `id`: `ZodString`; `gameId`: `ZodString`; `name`: `ZodString`; `description`: `ZodOptional`\<`ZodString`\>; `promptDefaults`: `ZodOptional`\<`ZodObject`\<\{ `themePrompt`: `ZodOptional`\<`ZodString`\>; `styleOverride`: `ZodOptional`\<`ZodString`\>; `modelId`: `ZodOptional`\<`ZodString`\>; `negativePrompt`: `ZodOptional`\<`ZodString`\>; \}, `"strip"`, `ZodTypeAny`, \{ `themePrompt?`: `string`; `styleOverride?`: `string`; `modelId?`: `string`; `negativePrompt?`: `string`; \}, \{ `themePrompt?`: `string`; `styleOverride?`: `string`; `modelId?`: `string`; `negativePrompt?`: `string`; \}\>\>; `createdAt`: `ZodNumber`; `deletedAt`: `ZodOptional`\<`ZodNumber`\>; \}, `"strip"`, `ZodTypeAny`, \{ `id`: `string`; `gameId`: `string`; `name`: `string`; `description?`: `string`; `promptDefaults?`: \{ `themePrompt?`: `string`; `styleOverride?`: `string`; `modelId?`: `string`; `negativePrompt?`: `string`; \}; `createdAt`: `number`; `deletedAt?`: `number`; \}, \{ `id`: `string`; `gameId`: `string`; `name`: `string`; `description?`: `string`; `promptDefaults?`: \{ `themePrompt?`: `string`; `styleOverride?`: `string`; `modelId?`: `string`; `negativePrompt?`: `string`; \}; `createdAt`: `number`; `deletedAt?`: `number`; \}\>

Defined in: [types/asset-system.ts:178](https://github.com/hassoncs/clover/blob/4fd406b0597c61e88b1324c5a31ce13307db5f2a/shared/src/types/asset-system.ts#L178)
