[**@slopcade/shared v1.0.0**](../README.md)

***

[@slopcade/shared](../README.md) / GameEntity

# Interface: GameEntity

Defined in: [types/entity.ts:48](https://github.com/hassoncs/clover/blob/2f9210785e99663f02331a1f99376dd2b95d60e1/shared/src/types/entity.ts#L48)

## Properties

### id

> **id**: `string`

Defined in: [types/entity.ts:49](https://github.com/hassoncs/clover/blob/2f9210785e99663f02331a1f99376dd2b95d60e1/shared/src/types/entity.ts#L49)

***

### name

> **name**: `string`

Defined in: [types/entity.ts:50](https://github.com/hassoncs/clover/blob/2f9210785e99663f02331a1f99376dd2b95d60e1/shared/src/types/entity.ts#L50)

***

### template?

> `optional` **template**: `string`

Defined in: [types/entity.ts:51](https://github.com/hassoncs/clover/blob/2f9210785e99663f02331a1f99376dd2b95d60e1/shared/src/types/entity.ts#L51)

***

### transform

> **transform**: [`TransformComponent`](TransformComponent.md)

Defined in: [types/entity.ts:52](https://github.com/hassoncs/clover/blob/2f9210785e99663f02331a1f99376dd2b95d60e1/shared/src/types/entity.ts#L52)

***

### sprite?

> `optional` **sprite**: [`SpriteComponent`](../type-aliases/SpriteComponent.md)

Defined in: [types/entity.ts:53](https://github.com/hassoncs/clover/blob/2f9210785e99663f02331a1f99376dd2b95d60e1/shared/src/types/entity.ts#L53)

***

### physics?

> `optional` **physics**: [`PhysicsComponent`](../type-aliases/PhysicsComponent.md)

Defined in: [types/entity.ts:54](https://github.com/hassoncs/clover/blob/2f9210785e99663f02331a1f99376dd2b95d60e1/shared/src/types/entity.ts#L54)

***

### behaviors?

> `optional` **behaviors**: [`Behavior`](../type-aliases/Behavior.md)[]

Defined in: [types/entity.ts:55](https://github.com/hassoncs/clover/blob/2f9210785e99663f02331a1f99376dd2b95d60e1/shared/src/types/entity.ts#L55)

***

### conditionalBehaviors?

> `optional` **conditionalBehaviors**: [`ConditionalBehavior`](ConditionalBehavior.md)[]

Defined in: [types/entity.ts:57](https://github.com/hassoncs/clover/blob/2f9210785e99663f02331a1f99376dd2b95d60e1/shared/src/types/entity.ts#L57)

Tag-driven conditional behavior groups (exclusive by priority)

***

### tags?

> `optional` **tags**: `string`[]

Defined in: [types/entity.ts:58](https://github.com/hassoncs/clover/blob/2f9210785e99663f02331a1f99376dd2b95d60e1/shared/src/types/entity.ts#L58)

***

### layer?

> `optional` **layer**: `number`

Defined in: [types/entity.ts:59](https://github.com/hassoncs/clover/blob/2f9210785e99663f02331a1f99376dd2b95d60e1/shared/src/types/entity.ts#L59)

***

### visible?

> `optional` **visible**: `boolean`

Defined in: [types/entity.ts:60](https://github.com/hassoncs/clover/blob/2f9210785e99663f02331a1f99376dd2b95d60e1/shared/src/types/entity.ts#L60)

***

### active?

> `optional` **active**: `boolean`

Defined in: [types/entity.ts:61](https://github.com/hassoncs/clover/blob/2f9210785e99663f02331a1f99376dd2b95d60e1/shared/src/types/entity.ts#L61)

***

### assetPackId?

> `optional` **assetPackId**: `string`

Defined in: [types/entity.ts:62](https://github.com/hassoncs/clover/blob/2f9210785e99663f02331a1f99376dd2b95d60e1/shared/src/types/entity.ts#L62)

***

### children?

> `optional` **children**: [`ChildEntityDefinition`](ChildEntityDefinition.md)[]

Defined in: [types/entity.ts:64](https://github.com/hassoncs/clover/blob/2f9210785e99663f02331a1f99376dd2b95d60e1/shared/src/types/entity.ts#L64)

Nested child entities
