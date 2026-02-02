## Task 5: Update BallSortActionExecutor - COMPLETE

BallSortActionExecutor already uses setEntityTargetPosition:

1. **executePickup** (lines 133-138): Animates ball to lifted position
2. **executeDrop** (lines 187-192): Animates ball to drop position  
3. **cancelPickup** (lines 321-326): Animates ball back to source tube

All use duration: 0.2s, easing: 'easeOutQuad'
