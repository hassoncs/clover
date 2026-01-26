[**@slopcade/shared v1.0.0**](../README.md)

***

[@slopcade/shared](../README.md) / GenerationJobSchema

# Variable: GenerationJobSchema

> `const` **GenerationJobSchema**: `ZodObject`\<\{ `id`: `ZodString`; `gameId`: `ZodString`; `packId`: `ZodOptional`\<`ZodString`\>; `status`: `ZodEnum`\<\[`"queued"`, `"running"`, `"succeeded"`, `"failed"`, `"canceled"`\]\>; `promptDefaults`: `ZodObject`\<\{ `themePrompt`: `ZodOptional`\<`ZodString`\>; `styleOverride`: `ZodOptional`\<`ZodString`\>; `modelId`: `ZodOptional`\<`ZodString`\>; `negativePrompt`: `ZodOptional`\<`ZodString`\>; \}, `"strip"`, `ZodTypeAny`, \{ `themePrompt?`: `string`; `styleOverride?`: `string`; `modelId?`: `string`; `negativePrompt?`: `string`; \}, \{ `themePrompt?`: `string`; `styleOverride?`: `string`; `modelId?`: `string`; `negativePrompt?`: `string`; \}\>; `createdAt`: `ZodNumber`; `startedAt`: `ZodOptional`\<`ZodNumber`\>; `finishedAt`: `ZodOptional`\<`ZodNumber`\>; \}, `"strip"`, `ZodTypeAny`, \{ `id`: `string`; `gameId`: `string`; `packId?`: `string`; `status`: `"queued"` \| `"running"` \| `"succeeded"` \| `"failed"` \| `"canceled"`; `promptDefaults`: \{ `themePrompt?`: `string`; `styleOverride?`: `string`; `modelId?`: `string`; `negativePrompt?`: `string`; \}; `createdAt`: `number`; `startedAt?`: `number`; `finishedAt?`: `number`; \}, \{ `id`: `string`; `gameId`: `string`; `packId?`: `string`; `status`: `"queued"` \| `"running"` \| `"succeeded"` \| `"failed"` \| `"canceled"`; `promptDefaults`: \{ `themePrompt?`: `string`; `styleOverride?`: `string`; `modelId?`: `string`; `negativePrompt?`: `string`; \}; `createdAt`: `number`; `startedAt?`: `number`; `finishedAt?`: `number`; \}\>

Defined in: [types/asset-system.ts:188](https://github.com/hassoncs/clover/blob/4fd406b0597c61e88b1324c5a31ce13307db5f2a/shared/src/types/asset-system.ts#L188)
