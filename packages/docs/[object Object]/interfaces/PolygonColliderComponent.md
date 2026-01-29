[**@slopcade/shared v1.0.0**](../README.md)

***

[@slopcade/shared](../README.md) / PolygonColliderComponent

# Interface: PolygonColliderComponent

Defined in: [types/physics.ts:42](https://github.com/hassoncs/clover/blob/cee41593876c0ca0fbde75075f3d9c52884dee1e/shared/src/types/physics.ts#L42)

## Extends

- `BaseColliderComponent`

## Properties

### friction?

> `optional` **friction**: `number`

Defined in: [types/physics.ts:24](https://github.com/hassoncs/clover/blob/cee41593876c0ca0fbde75075f3d9c52884dee1e/shared/src/types/physics.ts#L24)

#### Inherited from

`BaseColliderComponent.friction`

***

### restitution?

> `optional` **restitution**: `number`

Defined in: [types/physics.ts:25](https://github.com/hassoncs/clover/blob/cee41593876c0ca0fbde75075f3d9c52884dee1e/shared/src/types/physics.ts#L25)

#### Inherited from

`BaseColliderComponent.restitution`

***

### frictionCombine?

> `optional` **frictionCombine**: [`CoefficientCombineRule`](../type-aliases/CoefficientCombineRule.md)

Defined in: [types/physics.ts:26](https://github.com/hassoncs/clover/blob/cee41593876c0ca0fbde75075f3d9c52884dee1e/shared/src/types/physics.ts#L26)

#### Inherited from

`BaseColliderComponent.frictionCombine`

***

### restitutionCombine?

> `optional` **restitutionCombine**: [`CoefficientCombineRule`](../type-aliases/CoefficientCombineRule.md)

Defined in: [types/physics.ts:27](https://github.com/hassoncs/clover/blob/cee41593876c0ca0fbde75075f3d9c52884dee1e/shared/src/types/physics.ts#L27)

#### Inherited from

`BaseColliderComponent.restitutionCombine`

***

### isSensor?

> `optional` **isSensor**: `boolean`

Defined in: [types/physics.ts:28](https://github.com/hassoncs/clover/blob/cee41593876c0ca0fbde75075f3d9c52884dee1e/shared/src/types/physics.ts#L28)

#### Inherited from

`BaseColliderComponent.isSensor`

***

### shape

> **shape**: `"polygon"`

Defined in: [types/physics.ts:43](https://github.com/hassoncs/clover/blob/cee41593876c0ca0fbde75075f3d9c52884dee1e/shared/src/types/physics.ts#L43)

#### Overrides

`BaseColliderComponent.shape`

***

### vertices

> **vertices**: [`Vec2`](Vec2.md)[]

Defined in: [types/physics.ts:44](https://github.com/hassoncs/clover/blob/cee41593876c0ca0fbde75075f3d9c52884dee1e/shared/src/types/physics.ts#L44)
