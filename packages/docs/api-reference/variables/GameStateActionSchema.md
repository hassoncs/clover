[**@slopcade/shared v1.0.0**](../README.md)

***

[@slopcade/shared](../README.md) / GameStateActionSchema

# Variable: GameStateActionSchema

> `const` **GameStateActionSchema**: `ZodObject`\<\{ `type`: `ZodLiteral`\<`"game_state"`\>; `state`: `ZodEnum`\<\[`"win"`, `"lose"`, `"pause"`, `"restart"`, `"next_level"`\]\>; `delay`: `ZodOptional`\<`ZodNumber`\>; \}, `"strip"`, `ZodTypeAny`, \{ `type`: `"game_state"`; `state`: `"win"` \| `"lose"` \| `"pause"` \| `"restart"` \| `"next_level"`; `delay?`: `number`; \}, \{ `type`: `"game_state"`; `state`: `"win"` \| `"lose"` \| `"pause"` \| `"restart"` \| `"next_level"`; `delay?`: `number`; \}\>

Defined in: [types/schemas.ts:408](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/schemas.ts#L408)
