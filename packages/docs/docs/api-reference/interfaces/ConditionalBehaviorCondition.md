[**@slopcade/shared v1.0.0**](../README.md)

***

[@slopcade/shared](../README.md) / ConditionalBehaviorCondition

# Interface: ConditionalBehaviorCondition

Defined in: [types/behavior.ts:288](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/behavior.ts#L288)

Condition for when a conditional behavior group should be active.
Tags-first design: hasTag is primary, expressions are escape hatch.

## Properties

### hasTag?

> `optional` **hasTag**: `string`

Defined in: [types/behavior.ts:290](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/behavior.ts#L290)

Primary: Entity must have this tag

***

### hasAnyTag?

> `optional` **hasAnyTag**: `string`[]

Defined in: [types/behavior.ts:292](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/behavior.ts#L292)

Entity must have ANY of these tags

***

### hasAllTags?

> `optional` **hasAllTags**: `string`[]

Defined in: [types/behavior.ts:294](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/behavior.ts#L294)

Entity must have ALL of these tags

***

### lacksTag?

> `optional` **lacksTag**: `string`

Defined in: [types/behavior.ts:296](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/behavior.ts#L296)

Entity must NOT have this tag

***

### expr?

> `optional` **expr**: `string`

Defined in: [types/behavior.ts:298](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/behavior.ts#L298)

Escape hatch: Expression that evaluates to boolean (e.g., "health < 20")
