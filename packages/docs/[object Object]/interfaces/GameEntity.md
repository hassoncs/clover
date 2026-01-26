[**@slopcade/shared v1.0.0**](../README.md)

***

[@slopcade/shared](../README.md) / GameEntity

# Interface: GameEntity

Defined in: [types/entity.ts:21](https://github.com/hassoncs/clover/blob/4fd406b0597c61e88b1324c5a31ce13307db5f2a/shared/src/types/entity.ts#L21)

## Properties

### id

> **id**: `string`

Defined in: [types/entity.ts:22](https://github.com/hassoncs/clover/blob/4fd406b0597c61e88b1324c5a31ce13307db5f2a/shared/src/types/entity.ts#L22)

***

### name

> **name**: `string`

Defined in: [types/entity.ts:23](https://github.com/hassoncs/clover/blob/4fd406b0597c61e88b1324c5a31ce13307db5f2a/shared/src/types/entity.ts#L23)

***

### template?

> `optional` **template**: `string`

Defined in: [types/entity.ts:24](https://github.com/hassoncs/clover/blob/4fd406b0597c61e88b1324c5a31ce13307db5f2a/shared/src/types/entity.ts#L24)

***

### transform

> **transform**: [`TransformComponent`](TransformComponent.md)

Defined in: [types/entity.ts:25](https://github.com/hassoncs/clover/blob/4fd406b0597c61e88b1324c5a31ce13307db5f2a/shared/src/types/entity.ts#L25)

***

### sprite?

> `optional` **sprite**: [`SpriteComponent`](../type-aliases/SpriteComponent.md)

Defined in: [types/entity.ts:26](https://github.com/hassoncs/clover/blob/4fd406b0597c61e88b1324c5a31ce13307db5f2a/shared/src/types/entity.ts#L26)

***

### physics?

> `optional` **physics**: [`PhysicsComponent`](../type-aliases/PhysicsComponent.md)

Defined in: [types/entity.ts:27](https://github.com/hassoncs/clover/blob/4fd406b0597c61e88b1324c5a31ce13307db5f2a/shared/src/types/entity.ts#L27)

***

### behaviors?

> `optional` **behaviors**: [`Behavior`](../type-aliases/Behavior.md)[]

Defined in: [types/entity.ts:28](https://github.com/hassoncs/clover/blob/4fd406b0597c61e88b1324c5a31ce13307db5f2a/shared/src/types/entity.ts#L28)

***

### conditionalBehaviors?

> `optional` **conditionalBehaviors**: [`ConditionalBehavior`](ConditionalBehavior.md)[]

Defined in: [types/entity.ts:30](https://github.com/hassoncs/clover/blob/4fd406b0597c61e88b1324c5a31ce13307db5f2a/shared/src/types/entity.ts#L30)

Tag-driven conditional behavior groups (exclusive by priority)

***

### tags?

> `optional` **tags**: `string`[]

Defined in: [types/entity.ts:31](https://github.com/hassoncs/clover/blob/4fd406b0597c61e88b1324c5a31ce13307db5f2a/shared/src/types/entity.ts#L31)

***

### layer?

> `optional` **layer**: `number`

Defined in: [types/entity.ts:32](https://github.com/hassoncs/clover/blob/4fd406b0597c61e88b1324c5a31ce13307db5f2a/shared/src/types/entity.ts#L32)

***

### visible?

> `optional` **visible**: `boolean`

Defined in: [types/entity.ts:33](https://github.com/hassoncs/clover/blob/4fd406b0597c61e88b1324c5a31ce13307db5f2a/shared/src/types/entity.ts#L33)

***

### active?

> `optional` **active**: `boolean`

Defined in: [types/entity.ts:34](https://github.com/hassoncs/clover/blob/4fd406b0597c61e88b1324c5a31ce13307db5f2a/shared/src/types/entity.ts#L34)

***

### assetPackId?

> `optional` **assetPackId**: `string`

Defined in: [types/entity.ts:35](https://github.com/hassoncs/clover/blob/4fd406b0597c61e88b1324c5a31ce13307db5f2a/shared/src/types/entity.ts#L35)
