[**@slopcade/shared v1.0.0**](../README.md)

***

[@slopcade/shared](../README.md) / VariableDisplaySchema

# Variable: VariableDisplaySchema

> `const` **VariableDisplaySchema**: `ZodObject`\<\{ `name`: `ZodString`; `label`: `ZodString`; `color`: `ZodOptional`\<`ZodString`\>; `format`: `ZodOptional`\<`ZodString`\>; `showWhen`: `ZodOptional`\<`ZodEnum`\<\[`"always"`, `"not_default"`\]\>\>; `defaultValue`: `ZodOptional`\<`ZodUnion`\<\[`ZodNumber`, `ZodString`, `ZodBoolean`\]\>\>; \}, `"strip"`, `ZodTypeAny`, \{ `name`: `string`; `label`: `string`; `color?`: `string`; `format?`: `string`; `showWhen?`: `"always"` \| `"not_default"`; `defaultValue?`: `string` \| `number` \| `boolean`; \}, \{ `name`: `string`; `label`: `string`; `color?`: `string`; `format?`: `string`; `showWhen?`: `"always"` \| `"not_default"`; `defaultValue?`: `string` \| `number` \| `boolean`; \}\>

Defined in: [types/schemas.ts:652](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/schemas.ts#L652)
