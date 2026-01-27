[**@slopcade/shared v1.0.0**](../README.md)

***

[@slopcade/shared](../README.md) / ChildTemplateDefinition

# Interface: ChildTemplateDefinition

Defined in: [types/entity.ts:76](https://github.com/hassoncs/clover/blob/5a1034980770c49d5a2278254b551ba5ffaeefe1/shared/src/types/entity.ts#L76)

Definition for a child entity within a template (prefab pattern)

## Properties

### name

> **name**: `string`

Defined in: [types/entity.ts:78](https://github.com/hassoncs/clover/blob/5a1034980770c49d5a2278254b551ba5ffaeefe1/shared/src/types/entity.ts#L78)

Name of the child

***

### template

> **template**: `string`

Defined in: [types/entity.ts:80](https://github.com/hassoncs/clover/blob/5a1034980770c49d5a2278254b551ba5ffaeefe1/shared/src/types/entity.ts#L80)

Template to instantiate

***

### localTransform

> **localTransform**: [`TransformComponent`](TransformComponent.md)

Defined in: [types/entity.ts:82](https://github.com/hassoncs/clover/blob/5a1034980770c49d5a2278254b551ba5ffaeefe1/shared/src/types/entity.ts#L82)

Transform relative to parent

***

### slot?

> `optional` **slot**: `string`

Defined in: [types/entity.ts:84](https://github.com/hassoncs/clover/blob/5a1034980770c49d5a2278254b551ba5ffaeefe1/shared/src/types/entity.ts#L84)

Reference to parent's slot for coordinates (optional)

***

### sprite?

> `optional` **sprite**: `Partial`\<[`SpriteComponent`](../type-aliases/SpriteComponent.md)\>

Defined in: [types/entity.ts:87](https://github.com/hassoncs/clover/blob/5a1034980770c49d5a2278254b551ba5ffaeefe1/shared/src/types/entity.ts#L87)

Optional overrides

***

### physics?

> `optional` **physics**: `Partial`\<[`PhysicsComponent`](../type-aliases/PhysicsComponent.md)\>

Defined in: [types/entity.ts:88](https://github.com/hassoncs/clover/blob/5a1034980770c49d5a2278254b551ba5ffaeefe1/shared/src/types/entity.ts#L88)

***

### behaviors?

> `optional` **behaviors**: [`Behavior`](../type-aliases/Behavior.md)[]

Defined in: [types/entity.ts:89](https://github.com/hassoncs/clover/blob/5a1034980770c49d5a2278254b551ba5ffaeefe1/shared/src/types/entity.ts#L89)

***

### tags?

> `optional` **tags**: `string`[]

Defined in: [types/entity.ts:90](https://github.com/hassoncs/clover/blob/5a1034980770c49d5a2278254b551ba5ffaeefe1/shared/src/types/entity.ts#L90)

***

### children?

> `optional` **children**: `ChildTemplateDefinition`[]

Defined in: [types/entity.ts:93](https://github.com/hassoncs/clover/blob/5a1034980770c49d5a2278254b551ba5ffaeefe1/shared/src/types/entity.ts#L93)

Recursive nesting
