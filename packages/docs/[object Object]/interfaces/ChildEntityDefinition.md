[**@slopcade/shared v1.0.0**](../README.md)

***

[@slopcade/shared](../README.md) / ChildEntityDefinition

# Interface: ChildEntityDefinition

Defined in: [types/entity.ts:24](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/entity.ts#L24)

Definition for a child entity nested within a parent

## Properties

### id?

> `optional` **id**: `string`

Defined in: [types/entity.ts:26](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/entity.ts#L26)

Optional - auto-generated as {parentId}_{name} if omitted

***

### name

> **name**: `string`

Defined in: [types/entity.ts:28](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/entity.ts#L28)

Name of the child entity

***

### template

> **template**: `string`

Defined in: [types/entity.ts:30](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/entity.ts#L30)

Template to instantiate

***

### localTransform

> **localTransform**: [`TransformComponent`](TransformComponent.md)

Defined in: [types/entity.ts:32](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/entity.ts#L32)

Transform relative to parent

***

### slot?

> `optional` **slot**: `string`

Defined in: [types/entity.ts:34](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/entity.ts#L34)

Reference to parent's slot for coordinates (optional)

***

### sprite?

> `optional` **sprite**: `Partial`\<[`SpriteComponent`](../type-aliases/SpriteComponent.md)\>

Defined in: [types/entity.ts:37](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/entity.ts#L37)

Optional overrides

***

### physics?

> `optional` **physics**: `Partial`\<[`PhysicsComponent`](../type-aliases/PhysicsComponent.md)\>

Defined in: [types/entity.ts:38](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/entity.ts#L38)

***

### behaviors?

> `optional` **behaviors**: [`Behavior`](../type-aliases/Behavior.md)[]

Defined in: [types/entity.ts:39](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/entity.ts#L39)

***

### tags?

> `optional` **tags**: `string`[]

Defined in: [types/entity.ts:40](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/entity.ts#L40)

***

### visible?

> `optional` **visible**: `boolean`

Defined in: [types/entity.ts:41](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/entity.ts#L41)

***

### assetPackId?

> `optional` **assetPackId**: `string`

Defined in: [types/entity.ts:42](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/entity.ts#L42)

***

### children?

> `optional` **children**: `ChildEntityDefinition`[]

Defined in: [types/entity.ts:45](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/entity.ts#L45)

Recursive nesting
