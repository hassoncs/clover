[**@slopcade/shared v1.0.0**](../README.md)

***

[@slopcade/shared](../README.md) / BaseEntityTemplate

# Interface: BaseEntityTemplate

Defined in: [types/entity.ts:81](https://github.com/hassoncs/clover/blob/cee41593876c0ca0fbde75075f3d9c52884dee1e/shared/src/types/entity.ts#L81)

## Properties

### id

> **id**: `string`

Defined in: [types/entity.ts:82](https://github.com/hassoncs/clover/blob/cee41593876c0ca0fbde75075f3d9c52884dee1e/shared/src/types/entity.ts#L82)

***

### description?

> `optional` **description**: `string`

Defined in: [types/entity.ts:83](https://github.com/hassoncs/clover/blob/cee41593876c0ca0fbde75075f3d9c52884dee1e/shared/src/types/entity.ts#L83)

***

### visual?

> `optional` **visual**: [`VisualComponent`](../type-aliases/VisualComponent.md)

Defined in: [types/entity.ts:84](https://github.com/hassoncs/clover/blob/cee41593876c0ca0fbde75075f3d9c52884dee1e/shared/src/types/entity.ts#L84)

***

### physics?

> `optional` **physics**: [`PhysicsComponent`](PhysicsComponent.md)

Defined in: [types/entity.ts:85](https://github.com/hassoncs/clover/blob/cee41593876c0ca0fbde75075f3d9c52884dee1e/shared/src/types/entity.ts#L85)

***

### collider?

> `optional` **collider**: [`ColliderComponent`](../type-aliases/ColliderComponent.md)

Defined in: [types/entity.ts:86](https://github.com/hassoncs/clover/blob/cee41593876c0ca0fbde75075f3d9c52884dee1e/shared/src/types/entity.ts#L86)

***

### character?

> `optional` **character**: [`CharacterComponent`](CharacterComponent.md)

Defined in: [types/entity.ts:87](https://github.com/hassoncs/clover/blob/cee41593876c0ca0fbde75075f3d9c52884dee1e/shared/src/types/entity.ts#L87)

***

### behaviors?

> `optional` **behaviors**: [`Behavior`](../type-aliases/Behavior.md)[]

Defined in: [types/entity.ts:88](https://github.com/hassoncs/clover/blob/cee41593876c0ca0fbde75075f3d9c52884dee1e/shared/src/types/entity.ts#L88)

***

### conditionalBehaviors?

> `optional` **conditionalBehaviors**: [`ConditionalBehavior`](ConditionalBehavior.md)[]

Defined in: [types/entity.ts:89](https://github.com/hassoncs/clover/blob/cee41593876c0ca0fbde75075f3d9c52884dee1e/shared/src/types/entity.ts#L89)

***

### tags?

> `optional` **tags**: `string`[]

Defined in: [types/entity.ts:90](https://github.com/hassoncs/clover/blob/cee41593876c0ca0fbde75075f3d9c52884dee1e/shared/src/types/entity.ts#L90)

***

### layer?

> `optional` **layer**: `number`

Defined in: [types/entity.ts:91](https://github.com/hassoncs/clover/blob/cee41593876c0ca0fbde75075f3d9c52884dee1e/shared/src/types/entity.ts#L91)

***

### slots?

> `optional` **slots**: `Record`\<`string`, [`SlotDefinition`](SlotDefinition.md)\>

Defined in: [types/entity.ts:92](https://github.com/hassoncs/clover/blob/cee41593876c0ca0fbde75075f3d9c52884dee1e/shared/src/types/entity.ts#L92)

***

### children?

> `optional` **children**: [`ChildTemplateDefinition`](ChildTemplateDefinition.md)[]

Defined in: [types/entity.ts:93](https://github.com/hassoncs/clover/blob/cee41593876c0ca0fbde75075f3d9c52884dee1e/shared/src/types/entity.ts#L93)

***

### type?

> `optional` **type**: `"body"` \| `"zone"`

Defined in: [types/entity.ts:94](https://github.com/hassoncs/clover/blob/cee41593876c0ca0fbde75075f3d9c52884dee1e/shared/src/types/entity.ts#L94)

***

### zone?

> `optional` **zone**: [`ZoneComponent`](ZoneComponent.md)

Defined in: [types/entity.ts:95](https://github.com/hassoncs/clover/blob/cee41593876c0ca0fbde75075f3d9c52884dee1e/shared/src/types/entity.ts#L95)
