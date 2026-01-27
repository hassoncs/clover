[**@slopcade/shared v1.0.0**](../README.md)

***

[@slopcade/shared](../README.md) / ConditionalBehaviorCondition

# Interface: ConditionalBehaviorCondition

Defined in: [types/behavior.ts:287](https://github.com/hassoncs/clover/blob/2f9210785e99663f02331a1f99376dd2b95d60e1/shared/src/types/behavior.ts#L287)

Condition for when a conditional behavior group should be active.
Tags-first design: hasTag is primary, expressions are escape hatch.

## Properties

### hasTag?

> `optional` **hasTag**: `string`

Defined in: [types/behavior.ts:289](https://github.com/hassoncs/clover/blob/2f9210785e99663f02331a1f99376dd2b95d60e1/shared/src/types/behavior.ts#L289)

Primary: Entity must have this tag

***

### hasAnyTag?

> `optional` **hasAnyTag**: `string`[]

Defined in: [types/behavior.ts:291](https://github.com/hassoncs/clover/blob/2f9210785e99663f02331a1f99376dd2b95d60e1/shared/src/types/behavior.ts#L291)

Entity must have ANY of these tags

***

### hasAllTags?

> `optional` **hasAllTags**: `string`[]

Defined in: [types/behavior.ts:293](https://github.com/hassoncs/clover/blob/2f9210785e99663f02331a1f99376dd2b95d60e1/shared/src/types/behavior.ts#L293)

Entity must have ALL of these tags

***

### lacksTag?

> `optional` **lacksTag**: `string`

Defined in: [types/behavior.ts:295](https://github.com/hassoncs/clover/blob/2f9210785e99663f02331a1f99376dd2b95d60e1/shared/src/types/behavior.ts#L295)

Entity must NOT have this tag

***

### expr?

> `optional` **expr**: `string`

Defined in: [types/behavior.ts:297](https://github.com/hassoncs/clover/blob/2f9210785e99663f02331a1f99376dd2b95d60e1/shared/src/types/behavior.ts#L297)

Escape hatch: Expression that evaluates to boolean (e.g., "health < 20")
