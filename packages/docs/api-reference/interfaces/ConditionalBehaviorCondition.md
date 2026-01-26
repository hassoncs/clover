[**@slopcade/shared v1.0.0**](../README.md)

***

[@slopcade/shared](../README.md) / ConditionalBehaviorCondition

# Interface: ConditionalBehaviorCondition

Defined in: [types/behavior.ts:277](https://github.com/hassoncs/clover/blob/4fd406b0597c61e88b1324c5a31ce13307db5f2a/shared/src/types/behavior.ts#L277)

Condition for when a conditional behavior group should be active.
Tags-first design: hasTag is primary, expressions are escape hatch.

## Properties

### hasTag?

> `optional` **hasTag**: `string`

Defined in: [types/behavior.ts:279](https://github.com/hassoncs/clover/blob/4fd406b0597c61e88b1324c5a31ce13307db5f2a/shared/src/types/behavior.ts#L279)

Primary: Entity must have this tag

***

### hasAnyTag?

> `optional` **hasAnyTag**: `string`[]

Defined in: [types/behavior.ts:281](https://github.com/hassoncs/clover/blob/4fd406b0597c61e88b1324c5a31ce13307db5f2a/shared/src/types/behavior.ts#L281)

Entity must have ANY of these tags

***

### hasAllTags?

> `optional` **hasAllTags**: `string`[]

Defined in: [types/behavior.ts:283](https://github.com/hassoncs/clover/blob/4fd406b0597c61e88b1324c5a31ce13307db5f2a/shared/src/types/behavior.ts#L283)

Entity must have ALL of these tags

***

### lacksTag?

> `optional` **lacksTag**: `string`

Defined in: [types/behavior.ts:285](https://github.com/hassoncs/clover/blob/4fd406b0597c61e88b1324c5a31ce13307db5f2a/shared/src/types/behavior.ts#L285)

Entity must NOT have this tag

***

### expr?

> `optional` **expr**: `string`

Defined in: [types/behavior.ts:287](https://github.com/hassoncs/clover/blob/4fd406b0597c61e88b1324c5a31ce13307db5f2a/shared/src/types/behavior.ts#L287)

Escape hatch: Expression that evaluates to boolean (e.g., "health < 20")
