[**@slopcade/shared v1.0.0**](../README.md)

***

[@slopcade/shared](../README.md) / AssetPackV2Schema

# Variable: AssetPackV2Schema

> `const` **AssetPackV2Schema**: `ZodObject`\<\{ `id`: `ZodString`; `gameId`: `ZodString`; `name`: `ZodString`; `description`: `ZodOptional`\<`ZodString`\>; `promptDefaults`: `ZodOptional`\<`ZodObject`\<\{ `themePrompt`: `ZodOptional`\<`ZodString`\>; `styleOverride`: `ZodOptional`\<`ZodString`\>; `modelId`: `ZodOptional`\<`ZodString`\>; `negativePrompt`: `ZodOptional`\<`ZodString`\>; `customPrompts`: `ZodOptional`\<`ZodRecord`\<`ZodString`, `ZodString`\>\>; \}, `"strip"`, `ZodTypeAny`, \{ `themePrompt?`: `string`; `styleOverride?`: `string`; `modelId?`: `string`; `negativePrompt?`: `string`; `customPrompts?`: `Record`\<`string`, `string`\>; \}, \{ `themePrompt?`: `string`; `styleOverride?`: `string`; `modelId?`: `string`; `negativePrompt?`: `string`; `customPrompts?`: `Record`\<`string`, `string`\>; \}\>\>; `createdAt`: `ZodNumber`; `deletedAt`: `ZodOptional`\<`ZodNumber`\>; \}, `"strip"`, `ZodTypeAny`, \{ `id`: `string`; `gameId`: `string`; `name`: `string`; `description?`: `string`; `promptDefaults?`: \{ `themePrompt?`: `string`; `styleOverride?`: `string`; `modelId?`: `string`; `negativePrompt?`: `string`; `customPrompts?`: `Record`\<`string`, `string`\>; \}; `createdAt`: `number`; `deletedAt?`: `number`; \}, \{ `id`: `string`; `gameId`: `string`; `name`: `string`; `description?`: `string`; `promptDefaults?`: \{ `themePrompt?`: `string`; `styleOverride?`: `string`; `modelId?`: `string`; `negativePrompt?`: `string`; `customPrompts?`: `Record`\<`string`, `string`\>; \}; `createdAt`: `number`; `deletedAt?`: `number`; \}\>

Defined in: [types/asset-system.ts:194](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/asset-system.ts#L194)
