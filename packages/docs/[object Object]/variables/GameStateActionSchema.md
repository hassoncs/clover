[**@slopcade/shared v1.0.0**](../README.md)

***

[@slopcade/shared](../README.md) / GameStateActionSchema

# Variable: GameStateActionSchema

> `const` **GameStateActionSchema**: `ZodObject`\<\{ `type`: `ZodLiteral`\<`"game_state"`\>; `state`: `ZodEnum`\<\[`"win"`, `"lose"`, `"pause"`, `"restart"`, `"next_level"`\]\>; `delay`: `ZodOptional`\<`ZodNumber`\>; \}, `"strip"`, `ZodTypeAny`, \{ `type`: `"game_state"`; `state`: `"win"` \| `"lose"` \| `"pause"` \| `"restart"` \| `"next_level"`; `delay?`: `number`; \}, \{ `type`: `"game_state"`; `state`: `"win"` \| `"lose"` \| `"pause"` \| `"restart"` \| `"next_level"`; `delay?`: `number`; \}\>

Defined in: [types/schemas.ts:354](https://github.com/hassoncs/clover/blob/4fd406b0597c61e88b1324c5a31ce13307db5f2a/shared/src/types/schemas.ts#L354)
