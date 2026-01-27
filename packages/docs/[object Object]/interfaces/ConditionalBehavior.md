[**@slopcade/shared v1.0.0**](../README.md)

***

[@slopcade/shared](../README.md) / ConditionalBehavior

# Interface: ConditionalBehavior

Defined in: [types/behavior.ts:318](https://github.com/hassoncs/clover/blob/2f9210785e99663f02331a1f99376dd2b95d60e1/shared/src/types/behavior.ts#L318)

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

Defined in: [types/behavior.ts:320](https://github.com/hassoncs/clover/blob/2f9210785e99663f02331a1f99376dd2b95d60e1/shared/src/types/behavior.ts#L320)

Condition that must be met for this group to be active

***

### priority

> **priority**: `number`

Defined in: [types/behavior.ts:322](https://github.com/hassoncs/clover/blob/2f9210785e99663f02331a1f99376dd2b95d60e1/shared/src/types/behavior.ts#L322)

Priority for exclusive evaluation - higher wins (default: 0)

***

### behaviors

> **behaviors**: [`Behavior`](../type-aliases/Behavior.md)[]

Defined in: [types/behavior.ts:324](https://github.com/hassoncs/clover/blob/2f9210785e99663f02331a1f99376dd2b95d60e1/shared/src/types/behavior.ts#L324)

Behaviors to execute when this group is active
