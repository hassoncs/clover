[**@slopcade/shared v1.0.0**](../README.md)

***

[@slopcade/shared](../README.md) / EntityTemplate

# Interface: EntityTemplate

Defined in: [types/entity.ts:96](https://github.com/hassoncs/clover/blob/5a1034980770c49d5a2278254b551ba5ffaeefe1/shared/src/types/entity.ts#L96)

## Properties

### id

> **id**: `string`

Defined in: [types/entity.ts:97](https://github.com/hassoncs/clover/blob/5a1034980770c49d5a2278254b551ba5ffaeefe1/shared/src/types/entity.ts#L97)

***

### description?

> `optional` **description**: `string`

Defined in: [types/entity.ts:99](https://github.com/hassoncs/clover/blob/5a1034980770c49d5a2278254b551ba5ffaeefe1/shared/src/types/entity.ts#L99)

Human-readable description for AI image generation prompts

***

### sprite?

> `optional` **sprite**: [`SpriteComponent`](../type-aliases/SpriteComponent.md)

Defined in: [types/entity.ts:100](https://github.com/hassoncs/clover/blob/5a1034980770c49d5a2278254b551ba5ffaeefe1/shared/src/types/entity.ts#L100)

***

### physics?

> `optional` **physics**: [`PhysicsComponent`](../type-aliases/PhysicsComponent.md)

Defined in: [types/entity.ts:101](https://github.com/hassoncs/clover/blob/5a1034980770c49d5a2278254b551ba5ffaeefe1/shared/src/types/entity.ts#L101)

***

### behaviors?

> `optional` **behaviors**: [`Behavior`](../type-aliases/Behavior.md)[]

Defined in: [types/entity.ts:102](https://github.com/hassoncs/clover/blob/5a1034980770c49d5a2278254b551ba5ffaeefe1/shared/src/types/entity.ts#L102)

***

### conditionalBehaviors?

> `optional` **conditionalBehaviors**: [`ConditionalBehavior`](ConditionalBehavior.md)[]

Defined in: [types/entity.ts:104](https://github.com/hassoncs/clover/blob/5a1034980770c49d5a2278254b551ba5ffaeefe1/shared/src/types/entity.ts#L104)

Tag-driven conditional behavior groups (exclusive by priority)

***

### tags?

> `optional` **tags**: `string`[]

Defined in: [types/entity.ts:105](https://github.com/hassoncs/clover/blob/5a1034980770c49d5a2278254b551ba5ffaeefe1/shared/src/types/entity.ts#L105)

***

### layer?

> `optional` **layer**: `number`

Defined in: [types/entity.ts:106](https://github.com/hassoncs/clover/blob/5a1034980770c49d5a2278254b551ba5ffaeefe1/shared/src/types/entity.ts#L106)

***

### slots?

> `optional` **slots**: `Record`\<`string`, [`SlotDefinition`](SlotDefinition.md)\>

Defined in: [types/entity.ts:107](https://github.com/hassoncs/clover/blob/5a1034980770c49d5a2278254b551ba5ffaeefe1/shared/src/types/entity.ts#L107)

***

### children?

> `optional` **children**: [`ChildTemplateDefinition`](ChildTemplateDefinition.md)[]

Defined in: [types/entity.ts:109](https://github.com/hassoncs/clover/blob/5a1034980770c49d5a2278254b551ba5ffaeefe1/shared/src/types/entity.ts#L109)

Template-level children (part of prefab)
