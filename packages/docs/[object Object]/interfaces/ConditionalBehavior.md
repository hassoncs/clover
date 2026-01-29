[**@slopcade/shared v1.0.0**](../README.md)

***

[@slopcade/shared](../README.md) / ConditionalBehavior

# Interface: ConditionalBehavior

Defined in: [types/behavior.ts:319](https://github.com/hassoncs/clover/blob/cee41593876c0ca0fbde75075f3d9c52884dee1e/shared/src/types/behavior.ts#L319)

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

Defined in: [types/behavior.ts:321](https://github.com/hassoncs/clover/blob/cee41593876c0ca0fbde75075f3d9c52884dee1e/shared/src/types/behavior.ts#L321)

Condition that must be met for this group to be active

***

### priority

> **priority**: `number`

Defined in: [types/behavior.ts:323](https://github.com/hassoncs/clover/blob/cee41593876c0ca0fbde75075f3d9c52884dee1e/shared/src/types/behavior.ts#L323)

Priority for exclusive evaluation - higher wins (default: 0)

***

### behaviors

> **behaviors**: [`Behavior`](../type-aliases/Behavior.md)[]

Defined in: [types/behavior.ts:325](https://github.com/hassoncs/clover/blob/cee41593876c0ca0fbde75075f3d9c52884dee1e/shared/src/types/behavior.ts#L325)

Behaviors to execute when this group is active
