[**@slopcade/shared v1.0.0**](../README.md)

***

[@slopcade/shared](../README.md) / EntityTemplate

# Interface: EntityTemplate

Defined in: [types/entity.ts:44](https://github.com/hassoncs/clover/blob/4fd406b0597c61e88b1324c5a31ce13307db5f2a/shared/src/types/entity.ts#L44)

## Properties

### id

> **id**: `string`

Defined in: [types/entity.ts:45](https://github.com/hassoncs/clover/blob/4fd406b0597c61e88b1324c5a31ce13307db5f2a/shared/src/types/entity.ts#L45)

***

### description?

> `optional` **description**: `string`

Defined in: [types/entity.ts:47](https://github.com/hassoncs/clover/blob/4fd406b0597c61e88b1324c5a31ce13307db5f2a/shared/src/types/entity.ts#L47)

Human-readable description for AI image generation prompts

***

### sprite?

> `optional` **sprite**: [`SpriteComponent`](../type-aliases/SpriteComponent.md)

Defined in: [types/entity.ts:48](https://github.com/hassoncs/clover/blob/4fd406b0597c61e88b1324c5a31ce13307db5f2a/shared/src/types/entity.ts#L48)

***

### physics?

> `optional` **physics**: [`PhysicsComponent`](../type-aliases/PhysicsComponent.md)

Defined in: [types/entity.ts:49](https://github.com/hassoncs/clover/blob/4fd406b0597c61e88b1324c5a31ce13307db5f2a/shared/src/types/entity.ts#L49)

***

### behaviors?

> `optional` **behaviors**: [`Behavior`](../type-aliases/Behavior.md)[]

Defined in: [types/entity.ts:50](https://github.com/hassoncs/clover/blob/4fd406b0597c61e88b1324c5a31ce13307db5f2a/shared/src/types/entity.ts#L50)

***

### conditionalBehaviors?

> `optional` **conditionalBehaviors**: [`ConditionalBehavior`](ConditionalBehavior.md)[]

Defined in: [types/entity.ts:52](https://github.com/hassoncs/clover/blob/4fd406b0597c61e88b1324c5a31ce13307db5f2a/shared/src/types/entity.ts#L52)

Tag-driven conditional behavior groups (exclusive by priority)

***

### tags?

> `optional` **tags**: `string`[]

Defined in: [types/entity.ts:53](https://github.com/hassoncs/clover/blob/4fd406b0597c61e88b1324c5a31ce13307db5f2a/shared/src/types/entity.ts#L53)

***

### layer?

> `optional` **layer**: `number`

Defined in: [types/entity.ts:54](https://github.com/hassoncs/clover/blob/4fd406b0597c61e88b1324c5a31ce13307db5f2a/shared/src/types/entity.ts#L54)

***

### slots?

> `optional` **slots**: `Record`\<`string`, [`SlotDefinition`](SlotDefinition.md)\>

Defined in: [types/entity.ts:55](https://github.com/hassoncs/clover/blob/4fd406b0597c61e88b1324c5a31ce13307db5f2a/shared/src/types/entity.ts#L55)
