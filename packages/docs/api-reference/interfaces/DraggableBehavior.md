[**@slopcade/shared v1.0.0**](../README.md)

***

[@slopcade/shared](../README.md) / DraggableBehavior

# Interface: DraggableBehavior

Defined in: [types/behavior.ts:194](https://github.com/hassoncs/clover/blob/5a1034980770c49d5a2278254b551ba5ffaeefe1/shared/src/types/behavior.ts#L194)

## Extends

- `BaseBehavior`

## Properties

### enabled?

> `optional` **enabled**: `boolean`

Defined in: [types/behavior.ts:46](https://github.com/hassoncs/clover/blob/5a1034980770c49d5a2278254b551ba5ffaeefe1/shared/src/types/behavior.ts#L46)

#### Inherited from

`BaseBehavior.enabled`

***

### type

> **type**: `"draggable"`

Defined in: [types/behavior.ts:195](https://github.com/hassoncs/clover/blob/5a1034980770c49d5a2278254b551ba5ffaeefe1/shared/src/types/behavior.ts#L195)

#### Overrides

`BaseBehavior.type`

***

### mode?

> `optional` **mode**: [`DragMode`](../type-aliases/DragMode.md)

Defined in: [types/behavior.ts:197](https://github.com/hassoncs/clover/blob/5a1034980770c49d5a2278254b551ba5ffaeefe1/shared/src/types/behavior.ts#L197)

Drag mode: 'force' applies physics forces, 'kinematic' moves directly with cursor

***

### stiffness?

> `optional` **stiffness**: `number`

Defined in: [types/behavior.ts:199](https://github.com/hassoncs/clover/blob/5a1034980770c49d5a2278254b551ba5ffaeefe1/shared/src/types/behavior.ts#L199)

Stiffness of the drag force (higher = snappier response) - only used in 'force' mode

***

### damping?

> `optional` **damping**: `number`

Defined in: [types/behavior.ts:201](https://github.com/hassoncs/clover/blob/5a1034980770c49d5a2278254b551ba5ffaeefe1/shared/src/types/behavior.ts#L201)

Damping of the drag force (higher = less oscillation) - only used in 'force' mode

***

### requireDirectHit?

> `optional` **requireDirectHit**: `boolean`

Defined in: [types/behavior.ts:203](https://github.com/hassoncs/clover/blob/5a1034980770c49d5a2278254b551ba5ffaeefe1/shared/src/types/behavior.ts#L203)

Only allow dragging if touch starts on this entity
