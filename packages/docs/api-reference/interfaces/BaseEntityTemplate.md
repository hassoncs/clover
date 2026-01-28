[**@slopcade/shared v1.0.0**](../README.md)

***

[@slopcade/shared](../README.md) / BaseEntityTemplate

# Interface: BaseEntityTemplate

Defined in: [types/entity.ts:100](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/entity.ts#L100)

## Properties

### id

> **id**: `string`

Defined in: [types/entity.ts:101](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/entity.ts#L101)

***

### description?

> `optional` **description**: `string`

Defined in: [types/entity.ts:103](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/entity.ts#L103)

Human-readable description for AI image generation prompts

***

### sprite?

> `optional` **sprite**: [`SpriteComponent`](../type-aliases/SpriteComponent.md)

Defined in: [types/entity.ts:104](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/entity.ts#L104)

***

### physics?

> `optional` **physics**: [`PhysicsComponent`](../type-aliases/PhysicsComponent.md)

Defined in: [types/entity.ts:105](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/entity.ts#L105)

***

### behaviors?

> `optional` **behaviors**: [`Behavior`](../type-aliases/Behavior.md)[]

Defined in: [types/entity.ts:106](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/entity.ts#L106)

***

### conditionalBehaviors?

> `optional` **conditionalBehaviors**: [`ConditionalBehavior`](ConditionalBehavior.md)[]

Defined in: [types/entity.ts:108](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/entity.ts#L108)

Tag-driven conditional behavior groups (exclusive by priority)

***

### tags?

> `optional` **tags**: `string`[]

Defined in: [types/entity.ts:109](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/entity.ts#L109)

***

### layer?

> `optional` **layer**: `number`

Defined in: [types/entity.ts:110](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/entity.ts#L110)

***

### slots?

> `optional` **slots**: `Record`\<`string`, [`SlotDefinition`](SlotDefinition.md)\>

Defined in: [types/entity.ts:111](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/entity.ts#L111)

***

### children?

> `optional` **children**: [`ChildTemplateDefinition`](ChildTemplateDefinition.md)[]

Defined in: [types/entity.ts:113](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/entity.ts#L113)

Template-level children (part of prefab)

***

### type?

> `optional` **type**: `"body"` \| `"zone"`

Defined in: [types/entity.ts:115](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/entity.ts#L115)

Explicit type annotation - inferred from presence of physics vs zone

***

### zone?

> `optional` **zone**: [`ZoneComponent`](ZoneComponent.md)

Defined in: [types/entity.ts:117](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/entity.ts#L117)

Zone configuration (only for zone type entities)
