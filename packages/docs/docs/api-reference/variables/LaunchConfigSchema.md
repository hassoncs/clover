[**@slopcade/shared v1.0.0**](../README.md)

***

[@slopcade/shared](../README.md) / LaunchConfigSchema

# Variable: LaunchConfigSchema

> `const` **LaunchConfigSchema**: `ZodObject`\<\{ `direction`: `ZodUnion`\<\[`ZodLiteral`\<`"up"`\>, `ZodLiteral`\<`"down"`\>, `ZodLiteral`\<`"left"`\>, `ZodLiteral`\<`"right"`\>, `ZodLiteral`\<`"toward_touch"`\>, `ZodObject`\<\{ `x`: `ZodNumber`; `y`: `ZodNumber`; \}, `"strip"`, `ZodTypeAny`, \{ `x`: `number`; `y`: `number`; \}, \{ `x`: `number`; `y`: `number`; \}\>\]\>; `force`: `ZodNumber`; `sourceEntityId`: `ZodOptional`\<`ZodString`\>; \}, `"strip"`, `ZodTypeAny`, \{ `direction`: `"left"` \| `"right"` \| `"up"` \| `"down"` \| `"toward_touch"` \| \{ `x`: `number`; `y`: `number`; \}; `force`: `number`; `sourceEntityId?`: `string`; \}, \{ `direction`: `"left"` \| `"right"` \| `"up"` \| `"down"` \| `"toward_touch"` \| \{ `x`: `number`; `y`: `number`; \}; `force`: `number`; `sourceEntityId?`: `string`; \}\>

Defined in: [types/schemas.ts:375](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/schemas.ts#L375)
