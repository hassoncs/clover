[**@slopcade/shared v1.0.0**](../README.md)

***

[@slopcade/shared](../README.md) / BodyEntityDefinition

# Interface: BodyEntityDefinition

Defined in: [types/entity.ts:121](https://github.com/hassoncs/clover/blob/cee41593876c0ca0fbde75075f3d9c52884dee1e/shared/src/types/entity.ts#L121)

## Extends

- [`BaseEntityDefinition`](BaseEntityDefinition.md)

## Properties

### id

> **id**: `string`

Defined in: [types/entity.ts:103](https://github.com/hassoncs/clover/blob/cee41593876c0ca0fbde75075f3d9c52884dee1e/shared/src/types/entity.ts#L103)

#### Inherited from

[`BaseEntityDefinition`](BaseEntityDefinition.md).[`id`](BaseEntityDefinition.md#id)

***

### name

> **name**: `string`

Defined in: [types/entity.ts:104](https://github.com/hassoncs/clover/blob/cee41593876c0ca0fbde75075f3d9c52884dee1e/shared/src/types/entity.ts#L104)

#### Inherited from

[`BaseEntityDefinition`](BaseEntityDefinition.md).[`name`](BaseEntityDefinition.md#name)

***

### template?

> `optional` **template**: `string`

Defined in: [types/entity.ts:105](https://github.com/hassoncs/clover/blob/cee41593876c0ca0fbde75075f3d9c52884dee1e/shared/src/types/entity.ts#L105)

#### Inherited from

[`BaseEntityDefinition`](BaseEntityDefinition.md).[`template`](BaseEntityDefinition.md#template)

***

### transform

> **transform**: [`TransformComponent`](TransformComponent.md)

Defined in: [types/entity.ts:106](https://github.com/hassoncs/clover/blob/cee41593876c0ca0fbde75075f3d9c52884dee1e/shared/src/types/entity.ts#L106)

#### Inherited from

[`BaseEntityDefinition`](BaseEntityDefinition.md).[`transform`](BaseEntityDefinition.md#transform)

***

### visual?

> `optional` **visual**: [`VisualComponent`](../type-aliases/VisualComponent.md)

Defined in: [types/entity.ts:107](https://github.com/hassoncs/clover/blob/cee41593876c0ca0fbde75075f3d9c52884dee1e/shared/src/types/entity.ts#L107)

#### Inherited from

[`BaseEntityDefinition`](BaseEntityDefinition.md).[`visual`](BaseEntityDefinition.md#visual)

***

### collider?

> `optional` **collider**: [`ColliderComponent`](../type-aliases/ColliderComponent.md)

Defined in: [types/entity.ts:109](https://github.com/hassoncs/clover/blob/cee41593876c0ca0fbde75075f3d9c52884dee1e/shared/src/types/entity.ts#L109)

#### Inherited from

[`BaseEntityDefinition`](BaseEntityDefinition.md).[`collider`](BaseEntityDefinition.md#collider)

***

### character?

> `optional` **character**: [`CharacterComponent`](CharacterComponent.md)

Defined in: [types/entity.ts:110](https://github.com/hassoncs/clover/blob/cee41593876c0ca0fbde75075f3d9c52884dee1e/shared/src/types/entity.ts#L110)

#### Inherited from

[`BaseEntityDefinition`](BaseEntityDefinition.md).[`character`](BaseEntityDefinition.md#character)

***

### behaviors?

> `optional` **behaviors**: [`Behavior`](../type-aliases/Behavior.md)[]

Defined in: [types/entity.ts:111](https://github.com/hassoncs/clover/blob/cee41593876c0ca0fbde75075f3d9c52884dee1e/shared/src/types/entity.ts#L111)

#### Inherited from

[`BaseEntityDefinition`](BaseEntityDefinition.md).[`behaviors`](BaseEntityDefinition.md#behaviors)

***

### conditionalBehaviors?

> `optional` **conditionalBehaviors**: [`ConditionalBehavior`](ConditionalBehavior.md)[]

Defined in: [types/entity.ts:112](https://github.com/hassoncs/clover/blob/cee41593876c0ca0fbde75075f3d9c52884dee1e/shared/src/types/entity.ts#L112)

#### Inherited from

[`BaseEntityDefinition`](BaseEntityDefinition.md).[`conditionalBehaviors`](BaseEntityDefinition.md#conditionalbehaviors)

***

### tags?

> `optional` **tags**: `string`[]

Defined in: [types/entity.ts:113](https://github.com/hassoncs/clover/blob/cee41593876c0ca0fbde75075f3d9c52884dee1e/shared/src/types/entity.ts#L113)

#### Inherited from

[`BaseEntityDefinition`](BaseEntityDefinition.md).[`tags`](BaseEntityDefinition.md#tags)

***

### layer?

> `optional` **layer**: `number`

Defined in: [types/entity.ts:114](https://github.com/hassoncs/clover/blob/cee41593876c0ca0fbde75075f3d9c52884dee1e/shared/src/types/entity.ts#L114)

#### Inherited from

[`BaseEntityDefinition`](BaseEntityDefinition.md).[`layer`](BaseEntityDefinition.md#layer)

***

### visible?

> `optional` **visible**: `boolean`

Defined in: [types/entity.ts:115](https://github.com/hassoncs/clover/blob/cee41593876c0ca0fbde75075f3d9c52884dee1e/shared/src/types/entity.ts#L115)

#### Inherited from

[`BaseEntityDefinition`](BaseEntityDefinition.md).[`visible`](BaseEntityDefinition.md#visible)

***

### active?

> `optional` **active**: `boolean`

Defined in: [types/entity.ts:116](https://github.com/hassoncs/clover/blob/cee41593876c0ca0fbde75075f3d9c52884dee1e/shared/src/types/entity.ts#L116)

#### Inherited from

[`BaseEntityDefinition`](BaseEntityDefinition.md).[`active`](BaseEntityDefinition.md#active)

***

### assetPackId?

> `optional` **assetPackId**: `string`

Defined in: [types/entity.ts:117](https://github.com/hassoncs/clover/blob/cee41593876c0ca0fbde75075f3d9c52884dee1e/shared/src/types/entity.ts#L117)

#### Inherited from

[`BaseEntityDefinition`](BaseEntityDefinition.md).[`assetPackId`](BaseEntityDefinition.md#assetpackid)

***

### children?

> `optional` **children**: [`ChildEntityDefinition`](ChildEntityDefinition.md)[]

Defined in: [types/entity.ts:118](https://github.com/hassoncs/clover/blob/cee41593876c0ca0fbde75075f3d9c52884dee1e/shared/src/types/entity.ts#L118)

#### Inherited from

[`BaseEntityDefinition`](BaseEntityDefinition.md).[`children`](BaseEntityDefinition.md#children)

***

### type

> **type**: `"body"`

Defined in: [types/entity.ts:122](https://github.com/hassoncs/clover/blob/cee41593876c0ca0fbde75075f3d9c52884dee1e/shared/src/types/entity.ts#L122)

***

### physics

> **physics**: [`PhysicsComponent`](PhysicsComponent.md)

Defined in: [types/entity.ts:123](https://github.com/hassoncs/clover/blob/cee41593876c0ca0fbde75075f3d9c52884dee1e/shared/src/types/entity.ts#L123)

#### Overrides

[`BaseEntityDefinition`](BaseEntityDefinition.md).[`physics`](BaseEntityDefinition.md#physics)
