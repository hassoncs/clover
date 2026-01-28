[**@slopcade/shared v1.0.0**](../README.md)

***

[@slopcade/shared](../README.md) / GenerationJobSchema

# Variable: GenerationJobSchema

> `const` **GenerationJobSchema**: `ZodObject`\<\{ `id`: `ZodString`; `gameId`: `ZodString`; `packId`: `ZodOptional`\<`ZodString`\>; `status`: `ZodEnum`\<\[`"queued"`, `"running"`, `"succeeded"`, `"failed"`, `"canceled"`\]\>; `promptDefaults`: `ZodObject`\<\{ `themePrompt`: `ZodOptional`\<`ZodString`\>; `styleOverride`: `ZodOptional`\<`ZodString`\>; `modelId`: `ZodOptional`\<`ZodString`\>; `negativePrompt`: `ZodOptional`\<`ZodString`\>; `customPrompts`: `ZodOptional`\<`ZodRecord`\<`ZodString`, `ZodString`\>\>; \}, `"strip"`, `ZodTypeAny`, \{ `themePrompt?`: `string`; `styleOverride?`: `string`; `modelId?`: `string`; `negativePrompt?`: `string`; `customPrompts?`: `Record`\<`string`, `string`\>; \}, \{ `themePrompt?`: `string`; `styleOverride?`: `string`; `modelId?`: `string`; `negativePrompt?`: `string`; `customPrompts?`: `Record`\<`string`, `string`\>; \}\>; `createdAt`: `ZodNumber`; `startedAt`: `ZodOptional`\<`ZodNumber`\>; `finishedAt`: `ZodOptional`\<`ZodNumber`\>; \}, `"strip"`, `ZodTypeAny`, \{ `id`: `string`; `gameId`: `string`; `packId?`: `string`; `status`: `"queued"` \| `"running"` \| `"succeeded"` \| `"failed"` \| `"canceled"`; `promptDefaults`: \{ `themePrompt?`: `string`; `styleOverride?`: `string`; `modelId?`: `string`; `negativePrompt?`: `string`; `customPrompts?`: `Record`\<`string`, `string`\>; \}; `createdAt`: `number`; `startedAt?`: `number`; `finishedAt?`: `number`; \}, \{ `id`: `string`; `gameId`: `string`; `packId?`: `string`; `status`: `"queued"` \| `"running"` \| `"succeeded"` \| `"failed"` \| `"canceled"`; `promptDefaults`: \{ `themePrompt?`: `string`; `styleOverride?`: `string`; `modelId?`: `string`; `negativePrompt?`: `string`; `customPrompts?`: `Record`\<`string`, `string`\>; \}; `createdAt`: `number`; `startedAt?`: `number`; `finishedAt?`: `number`; \}\>

Defined in: [types/asset-system.ts:204](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/asset-system.ts#L204)
