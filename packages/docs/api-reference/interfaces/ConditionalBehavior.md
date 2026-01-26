[**@slopcade/shared v1.0.0**](../README.md)

***

[@slopcade/shared](../README.md) / ConditionalBehavior

# Interface: ConditionalBehavior

Defined in: [types/behavior.ts:308](https://github.com/hassoncs/clover/blob/4fd406b0597c61e88b1324c5a31ce13307db5f2a/shared/src/types/behavior.ts#L308)

A group of behaviors that activate based on tag conditions.
Only ONE conditional behavior group is active at a time (exclusive by priority).
Higher priority wins when multiple conditions match.

Example:
```typescript
conditionalBehaviors: [
  {
    when: { hasTag: "sys.match3:selected" },
    priority: 2,
    behaviors: [
      { type: "scale_oscillate", min: 0.97, max: 1.06, speed: 5 }
    ]
  }
]
```

## Properties

### when

> **when**: [`ConditionalBehaviorCondition`](ConditionalBehaviorCondition.md)

Defined in: [types/behavior.ts:310](https://github.com/hassoncs/clover/blob/4fd406b0597c61e88b1324c5a31ce13307db5f2a/shared/src/types/behavior.ts#L310)

Condition that must be met for this group to be active

***

### priority

> **priority**: `number`

Defined in: [types/behavior.ts:312](https://github.com/hassoncs/clover/blob/4fd406b0597c61e88b1324c5a31ce13307db5f2a/shared/src/types/behavior.ts#L312)

Priority for exclusive evaluation - higher wins (default: 0)

***

### behaviors

> **behaviors**: [`Behavior`](../type-aliases/Behavior.md)[]

Defined in: [types/behavior.ts:314](https://github.com/hassoncs/clover/blob/4fd406b0597c61e88b1324c5a31ce13307db5f2a/shared/src/types/behavior.ts#L314)

Behaviors to execute when this group is active
