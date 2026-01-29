[**@slopcade/shared v1.0.0**](../README.md)

***

[@slopcade/shared](../README.md) / GameEntity

# Interface: GameEntity

Defined in: [types/entity.ts:40](https://github.com/hassoncs/clover/blob/cee41593876c0ca0fbde75075f3d9c52884dee1e/shared/src/types/entity.ts#L40)

## Properties

### id

> **id**: `string`

Defined in: [types/entity.ts:41](https://github.com/hassoncs/clover/blob/cee41593876c0ca0fbde75075f3d9c52884dee1e/shared/src/types/entity.ts#L41)

***

### name

> **name**: `string`

Defined in: [types/entity.ts:42](https://github.com/hassoncs/clover/blob/cee41593876c0ca0fbde75075f3d9c52884dee1e/shared/src/types/entity.ts#L42)

***

### template?

> `optional` **template**: `string`

Defined in: [types/entity.ts:43](https://github.com/hassoncs/clover/blob/cee41593876c0ca0fbde75075f3d9c52884dee1e/shared/src/types/entity.ts#L43)

***

### transform

> **transform**: [`TransformComponent`](TransformComponent.md)

Defined in: [types/entity.ts:44](https://github.com/hassoncs/clover/blob/cee41593876c0ca0fbde75075f3d9c52884dee1e/shared/src/types/entity.ts#L44)

***

### visual?

> `optional` **visual**: [`VisualComponent`](../type-aliases/VisualComponent.md)

Defined in: [types/entity.ts:45](https://github.com/hassoncs/clover/blob/cee41593876c0ca0fbde75075f3d9c52884dee1e/shared/src/types/entity.ts#L45)

***

### physics?

> `optional` **physics**: [`PhysicsComponent`](PhysicsComponent.md)

Defined in: [types/entity.ts:46](https://github.com/hassoncs/clover/blob/cee41593876c0ca0fbde75075f3d9c52884dee1e/shared/src/types/entity.ts#L46)

***

### collider?

> `optional` **collider**: [`ColliderComponent`](../type-aliases/ColliderComponent.md)

Defined in: [types/entity.ts:47](https://github.com/hassoncs/clover/blob/cee41593876c0ca0fbde75075f3d9c52884dee1e/shared/src/types/entity.ts#L47)

***

### character?

> `optional` **character**: [`CharacterComponent`](CharacterComponent.md)

Defined in: [types/entity.ts:48](https://github.com/hassoncs/clover/blob/cee41593876c0ca0fbde75075f3d9c52884dee1e/shared/src/types/entity.ts#L48)

***

### behaviors?

> `optional` **behaviors**: [`Behavior`](../type-aliases/Behavior.md)[]

Defined in: [types/entity.ts:49](https://github.com/hassoncs/clover/blob/cee41593876c0ca0fbde75075f3d9c52884dee1e/shared/src/types/entity.ts#L49)

***

### conditionalBehaviors?

> `optional` **conditionalBehaviors**: [`ConditionalBehavior`](ConditionalBehavior.md)[]

Defined in: [types/entity.ts:50](https://github.com/hassoncs/clover/blob/cee41593876c0ca0fbde75075f3d9c52884dee1e/shared/src/types/entity.ts#L50)

***

### tags?

> `optional` **tags**: `string`[]

Defined in: [types/entity.ts:51](https://github.com/hassoncs/clover/blob/cee41593876c0ca0fbde75075f3d9c52884dee1e/shared/src/types/entity.ts#L51)

***

### layer?

> `optional` **layer**: `number`

Defined in: [types/entity.ts:52](https://github.com/hassoncs/clover/blob/cee41593876c0ca0fbde75075f3d9c52884dee1e/shared/src/types/entity.ts#L52)

***

### visible?

> `optional` **visible**: `boolean`

Defined in: [types/entity.ts:53](https://github.com/hassoncs/clover/blob/cee41593876c0ca0fbde75075f3d9c52884dee1e/shared/src/types/entity.ts#L53)

***

### active?

> `optional` **active**: `boolean`

Defined in: [types/entity.ts:54](https://github.com/hassoncs/clover/blob/cee41593876c0ca0fbde75075f3d9c52884dee1e/shared/src/types/entity.ts#L54)

***

### assetPackId?

> `optional` **assetPackId**: `string`

Defined in: [types/entity.ts:55](https://github.com/hassoncs/clover/blob/cee41593876c0ca0fbde75075f3d9c52884dee1e/shared/src/types/entity.ts#L55)

***

### children?

> `optional` **children**: [`ChildEntityDefinition`](ChildEntityDefinition.md)[]

Defined in: [types/entity.ts:56](https://github.com/hassoncs/clover/blob/cee41593876c0ca0fbde75075f3d9c52884dee1e/shared/src/types/entity.ts#L56)

***

### type?

> `optional` **type**: `"body"` \| `"zone"`

Defined in: [types/entity.ts:57](https://github.com/hassoncs/clover/blob/cee41593876c0ca0fbde75075f3d9c52884dee1e/shared/src/types/entity.ts#L57)

***

### zone?

> `optional` **zone**: [`ZoneComponent`](ZoneComponent.md)

Defined in: [types/entity.ts:58](https://github.com/hassoncs/clover/blob/cee41593876c0ca0fbde75075f3d9c52884dee1e/shared/src/types/entity.ts#L58)
