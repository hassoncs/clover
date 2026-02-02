## Task 2: Add setEntityTargetPosition to RuleContext - COMPLETE

Implementation exists in RulesEvaluator.ts lines 426-445:
- Calculates distance-based duration (clamped between 0.1-0.3s)
- Default easing: 'easeOutQuad'
- Sets movementTarget on entity with start position, target position, start time, duration, and easing
