[**@slopcade/shared v1.0.0**](../README.md)

***

[@slopcade/shared](../README.md) / ChildTemplateDefinition

# Interface: ChildTemplateDefinition

Defined in: [types/entity.ts:80](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/entity.ts#L80)

Definition for a child entity within a template (prefab pattern)

## Properties

### name

> **name**: `string`

Defined in: [types/entity.ts:82](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/entity.ts#L82)

Name of the child

***

### template

> **template**: `string`

Defined in: [types/entity.ts:84](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/entity.ts#L84)

Template to instantiate

***

### localTransform

> **localTransform**: [`TransformComponent`](TransformComponent.md)

Defined in: [types/entity.ts:86](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/entity.ts#L86)

Transform relative to parent

***

### slot?

> `optional` **slot**: `string`

Defined in: [types/entity.ts:88](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/entity.ts#L88)

Reference to parent's slot for coordinates (optional)

***

### sprite?

> `optional` **sprite**: `Partial`\<[`SpriteComponent`](../type-aliases/SpriteComponent.md)\>

Defined in: [types/entity.ts:91](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/entity.ts#L91)

Optional overrides

***

### physics?

> `optional` **physics**: `Partial`\<[`PhysicsComponent`](../type-aliases/PhysicsComponent.md)\>

Defined in: [types/entity.ts:92](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/entity.ts#L92)

***

### behaviors?

> `optional` **behaviors**: [`Behavior`](../type-aliases/Behavior.md)[]

Defined in: [types/entity.ts:93](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/entity.ts#L93)

***

### tags?

> `optional` **tags**: `string`[]

Defined in: [types/entity.ts:94](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/entity.ts#L94)

***

### children?

> `optional` **children**: `ChildTemplateDefinition`[]

Defined in: [types/entity.ts:97](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/entity.ts#L97)

Recursive nesting
