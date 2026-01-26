# Implementation Spec: Variable Tuning System

**Spec ID**: IMP-002  
**Created**: 2026-01-26  
**Status**: Ready for Implementation  
**Priority**: 🟡 High  
**Effort**: 5 days  
**Breaking Changes**: None (backward compatible)

---

## Goal

Enable live parameter tuning for AI-generated games by adding metadata to variables that powers a developer-facing slider UI.

---

## Design Decision: Inline Metadata (Hybrid Approach)

### Option Chosen: **Hybrid Union Type**

**Rationale**:
- ✅ Backward compatible (primitives still work)
- ✅ Single location per variable (no duplication)
- ✅ Progressive complexity (add metadata only when needed)
- ✅ Clear which variables are tunable (has `tuning` field)
- ✅ AI-friendly (can generate simple or rich)
- ✅ Human-readable (obvious structure)

---

## Type Specifications

### Core Types

```typescript
/**
 * Simple variable value types
 */
export type VariableValue = 
  | number 
  | boolean 
  | string 
  | Vec2 
  | { expr: string };  // Expression reference

/**
 * Variable with tuning metadata for live editing
 */
export interface VariableWithTuning {
  /** Current/default value */
  value: VariableValue;
  
  /** Tuning configuration for dev UI (optional) */
  tuning?: {
    min: number;
    max: number;
    step: number;
  };
  
  /** Category for grouping in UI (optional) */
  category?: 'physics' | 'gameplay' | 'visuals' | 'economy' | 'ai';
  
  /** Human-readable label (optional) */
  label?: string;
  
  /** Tooltip description (optional) */
  description?: string;
  
  /** Show to player in HUD (optional) */
  display?: boolean;
}

/**
 * Union type: either simple value or rich object with metadata
 */
export type GameVariable = VariableValue | VariableWithTuning;

/**
 * Game variables collection
 */
export interface GameDefinition {
  // ... existing fields ...
  
  variables?: Record<string, GameVariable>;
}
```

### Type Guards

```typescript
export function isVariableWithTuning(v: GameVariable): v is VariableWithTuning {
  return typeof v === 'object' && v !== null && 'value' in v;
}

export function isTunable(v: GameVariable): boolean {
  return isVariableWithTuning(v) && v.tuning !== undefined;
}

export function getValue(v: GameVariable): VariableValue {
  return isVariableWithTuning(v) ? v.value : v;
}

export function getLabel(key: string, v: GameVariable): string {
  if (isVariableWithTuning(v) && v.label) {
    return v.label;
  }
  // Auto-generate label from key: "jumpForce" → "Jump Force"
  return key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()).trim();
}
```

---

## Example Usage

### Simple Game (Minimal Variables)

```typescript
{
  variables: {
    // Simple runtime state (no metadata)
    combo: 0,
    facing: 1,
    matchesFound: 0,
  }
}
```

**Resolution**: All three are just values. No tuning UI shown.

### AI-Generated Game (With Tuning)

```typescript
{
  variables: {
    // Simple state
    combo: 0,
    highScore: 0,
    
    // Tunable parameters
    jumpForce: {
      value: 15,
      tuning: { min: 5, max: 25, step: 0.5 },
      category: 'gameplay',
      label: 'Jump Height',
      description: 'How high the player jumps when tapping',
    },
    enemySpeed: {
      value: 10,
      tuning: { min: 3, max: 20, step: 1 },
      category: 'gameplay',
      label: 'Enemy Speed',
    },
    gravity: {
      value: 15,
      tuning: { min: 5, max: 30, step: 1 },
      category: 'physics',
      label: 'Gravity',
    },
    
    // Computed variable (expression + tuning)
    scoreMultiplier: {
      value: { expr: "1 + floor(score / 100) * 0.1" },
      category: 'gameplay',
      label: 'Score Multiplier',
      display: true,  // Show to player
    },
  }
}
```

**Resolution**: Tuning UI shows sliders for `jumpForce`, `enemySpeed`, `gravity` (all have `tuning` field).

---

## Tuning UI Component

### Visual Design

```
┌─────────────────────────────────────┐
│       GAME VIEWPORT                 │
│                                     │
│               🎛️ [Tune]            │  ← Floating button (top-right)
│                                     │
└─────────────────────────────────────┘

When clicked:
┌─────────────────────────────────────┐
│       GAME VIEWPORT                 │
│  ┌────────────────────────────┐    │
│  │ 🎛️ LIVE TUNING           │    │  ← Slide from right
│  │ ─────────────────────────  │    │
│  │ [GAMEPLAY]                 │    │
│  │  Jump Height               │    │
│  │  ●──────────── 15.0        │    │
│  │  Enemy Speed               │    │
│  │  ───●──────── 10           │    │
│  │                            │    │
│  │ [PHYSICS]                  │    │
│  │  Gravity                   │    │
│  │  ────●──────── 15          │    │
│  │                            │    │
│  │ [Reset] [Export]           │    │
│  └────────────────────────────┘    │
└─────────────────────────────────────┘
```

### Component Implementation

```typescript
interface TuningPanelProps {
  gameState: GameState;
  definition: GameDefinition;
  onVariableChange: (key: string, value: VariableValue) => void;
  onReset: () => void;
  onExport: () => void;
}

export function TuningPanel({ gameState, definition, ...callbacks }: TuningPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  // Filter tunable variables
  const tunableVars = useMemo(() => {
    const vars = definition.variables || {};
    return Object.entries(vars)
      .filter(([_, v]) => isTunable(v))
      .map(([key, v]) => ({
        key,
        variable: v as VariableWithTuning,
        currentValue: getValue(gameState.variables[key] || v),
      }));
  }, [definition.variables, gameState.variables]);
  
  // Group by category
  const grouped = useMemo(() => {
    const groups: Record<string, typeof tunableVars> = {};
    for (const item of tunableVars) {
      const cat = item.variable.category || 'other';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(item);
    }
    return groups;
  }, [tunableVars]);
  
  return (
    <>
      <Pressable 
        className="absolute top-16 right-4 bg-purple-600 rounded-full p-3 shadow-lg z-50"
        onPress={() => setIsOpen(!isOpen)}
      >
        <Text className="text-2xl">🎛️</Text>
      </Pressable>
      
      <Animated.View 
        className="absolute right-0 top-0 bottom-0 w-80 bg-gray-900/95 shadow-2xl z-40"
        style={{ transform: [{ translateX: isOpen ? 0 : 320 }] }}
      >
        <ScrollView className="p-4 pt-20">
          <Text className="text-white text-xl font-bold mb-4">🎛️ Live Tuning</Text>
          
          {Object.entries(grouped).map(([category, vars]) => (
            <View key={category} className="mb-6">
              <Text className="text-gray-400 uppercase text-xs mb-3 font-bold">
                {category}
              </Text>
              {vars.map(({ key, variable, currentValue }) => (
                <TunableSlider
                  key={key}
                  varKey={key}
                  variable={variable}
                  currentValue={currentValue as number}
                  onChange={value => callbacks.onVariableChange(key, value)}
                />
              ))}
            </View>
          ))}
          
          <View className="flex-row gap-2 mt-4">
            <Pressable 
              className="flex-1 py-3 bg-gray-700 rounded-lg"
              onPress={callbacks.onReset}
            >
              <Text className="text-white text-center font-semibold">Reset All</Text>
            </Pressable>
            <Pressable 
              className="flex-1 py-3 bg-purple-600 rounded-lg"
              onPress={callbacks.onExport}
            >
              <Text className="text-white text-center font-semibold">Export JSON</Text>
            </Pressable>
          </View>
        </ScrollView>
      </Animated.View>
    </>
  );
}

interface TunableSliderProps {
  varKey: string;
  variable: VariableWithTuning;
  currentValue: number;
  onChange: (value: number) => void;
}

function TunableSlider({ varKey, variable, currentValue, onChange }: TunableSliderProps) {
  const label = getLabel(varKey, variable);
  const { min, max, step } = variable.tuning!;
  
  return (
    <View className="mb-4">
      <View className="flex-row justify-between mb-1">
        <Text className="text-white font-medium">{label}</Text>
        <Text className="text-purple-400 font-mono">{currentValue.toFixed(2)}</Text>
      </View>
      {variable.description && (
        <Text className="text-gray-500 text-xs mb-2">{variable.description}</Text>
      )}
      <Slider
        value={currentValue}
        minimumValue={min}
        maximumValue={max}
        step={step}
        onValueChange={onChange}
        minimumTrackTintColor="#a855f7"
        maximumTrackTintColor="#374151"
      />
    </View>
  );
}
```

---

## GameRuntime Integration

```typescript
export function GameRuntimeGodot({ definition, ...props }: GameRuntimeProps) {
  const [gameDefinition, setGameDefinition] = useState(definition);
  const [showTuning, setShowTuning] = useState(__DEV__);  // Only in dev mode
  
  const handleVariableChange = useCallback((key: string, value: VariableValue) => {
    setGameState(prev => ({
      ...prev,
      variables: {
        ...prev.variables,
        [key]: value,
      },
    }));
  }, []);
  
  const handleReset = useCallback(() => {
    // Reset to default values from definition
    const defaults: Record<string, VariableValue> = {};
    for (const [key, variable] of Object.entries(definition.variables || {})) {
      defaults[key] = getValue(variable);
    }
    setGameState(prev => ({ ...prev, variables: defaults }));
  }, [definition]);
  
  const handleExport = useCallback(() => {
    // Export current variable values as JSON
    const tuned = { ...definition };
    tuned.variables = { ...gameState.variables };
    console.log(JSON.stringify(tuned, null, 2));
    // Could also copy to clipboard or save to file
  }, [definition, gameState]);
  
  return (
    <View style={{ flex: 1 }}>
      <GodotView definition={gameDefinition} gameState={gameState} />
      
      {showTuning && hasTunables(gameDefinition) && (
        <TuningPanel
          gameState={gameState}
          definition={gameDefinition}
          onVariableChange={handleVariableChange}
          onReset={handleReset}
          onExport={handleExport}
        />
      )}
    </View>
  );
}

function hasTunables(definition: GameDefinition): boolean {
  return Object.values(definition.variables || {}).some(isTunable);
}
```

---

## AI Prompt Engineering

### System Prompt Addition

```markdown
## Variables with Tuning Metadata

All numeric gameplay parameters should be defined as variables. For parameters that affect game balance, add tuning metadata:

**Simple variables** (runtime state, not tunable):
```json
{
  "variables": {
    "combo": 0,
    "matchesFound": 0
  }
}
```

**Tunable variables** (design-time parameters):
```json
{
  "variables": {
    "jumpForce": {
      "value": 15,
      "tuning": { "min": 5, "max": 25, "step": 0.5 },
      "category": "gameplay",
      "label": "Jump Height",
      "description": "How high the player jumps"
    },
    "enemySpeed": {
      "value": 10,
      "tuning": { "min": 3, "max": 20, "step": 1 },
      "category": "gameplay",
      "label": "Enemy Speed"
    }
  }
}
```

**When to add tuning metadata:**
- Speeds (movement, projectiles, scrolling)
- Forces (jump, push, gravity)
- Sizes (player, enemies, obstacles)
- Gaps (platforms, pipes, openings)
- Timers (spawn intervals, durations)
- Multipliers (score, damage, difficulty)

**Tuning range guidelines:**
- min: typically 0.25x to 0.5x of default value
- max: typically 2x to 4x of default value
- step: 0.1 for decimals, 1 for integers, 0.01 for small decimals

**Categories:**
- `physics`: gravity, friction, restitution, damping
- `gameplay`: speeds, forces, jumps, gaps, timers
- `visuals`: animation speeds, effect intensities, scales
- `economy`: costs, rewards, drop rates
- `ai`: enemy behavior, difficulty scaling

**Then reference variables in templates/rules:**
```json
{
  "behaviors": [
    { "type": "move", "speed": { "expr": "enemySpeed" } }
  ],
  "rules": [{
    "trigger": { "type": "tap" },
    "actions": [
      { "type": "apply_impulse", "y": { "expr": "jumpForce" } }
    ]
  }]
}
```
```

---

## Examples

### Flappy Bird with Tuning

```typescript
{
  variables: {
    // Runtime state
    highScore: 0,
    
    // Tunable parameters
    birdRadius: {
      value: 0.3,
      tuning: { min: 0.15, max: 0.6, step: 0.05 },
      category: 'gameplay',
      label: 'Bird Size',
    },
    pipeSpeed: {
      value: 15,
      tuning: { min: 5, max: 30, step: 1 },
      category: 'gameplay',
      label: 'Pipe Speed',
    },
    pipeGap: {
      value: 3.0,
      tuning: { min: 1.5, max: 5.0, step: 0.1 },
      category: 'gameplay',
      label: 'Gap Size',
    },
    flapForce: {
      value: 7,
      tuning: { min: 3, max: 15, step: 0.5 },
      category: 'gameplay',
      label: 'Flap Strength',
    },
    gravity: {
      value: 15,
      tuning: { min: 5, max: 30, step: 1 },
      category: 'physics',
      label: 'Gravity',
    },
  },
  
  templates: {
    bird: {
      sprite: { type: 'circle', radius: { expr: "birdRadius" } },
      physics: { 
        shape: 'circle',
        radius: { expr: "birdRadius" },
        // ...
      },
    },
    pipeTop: {
      behaviors: [
        { type: 'move', direction: 'left', speed: { expr: "pipeSpeed" } },
      ],
    },
  },
  
  rules: [
    {
      trigger: { type: 'tap' },
      actions: [
        { type: 'set_velocity', target: { type: 'by_tag', tag: 'bird' }, y: { expr: "flapForce" } },
      ],
    },
  ],
}
```

**Tuning UI shows 5 sliders** (jumpForce, pipeSpeed, pipeGap, flapForce, gravity).  
**highScore and combo are hidden** (no tuning metadata).

---

## Implementation Checklist

### Phase 1: Type System (Day 1)

- [ ] Add `VariableWithTuning` interface
- [ ] Update `GameVariable` type to union
- [ ] Add type guards (`isVariableWithTuning`, `isTunable`, `getValue`)
- [ ] Update Zod schema for variables
- [ ] Update expression evaluator to handle new format

**Files**:
- `shared/src/types/GameDefinition.ts`
- `shared/src/types/schemas.ts`
- `shared/src/expressions/EvalContextBuilder.ts`

### Phase 2: Tuning UI (Day 2-3)

- [ ] Create `TuningPanel.tsx` component
- [ ] Create `TunableSlider.tsx` component
- [ ] Add floating button with 🎛️ icon
- [ ] Add slide-in animation (react-native-reanimated)
- [ ] Group sliders by category
- [ ] Add reset functionality
- [ ] Add export to JSON (copy to clipboard)

**Files**:
- `app/components/game/TuningPanel.tsx` (new)
- `app/components/game/TunableSlider.tsx` (new)

### Phase 3: GameRuntime Integration (Day 4)

- [ ] Add `showTuning` state (__DEV__ only)
- [ ] Add `hasTunables()` check
- [ ] Wire up `onVariableChange` callback
- [ ] Wire up reset callback
- [ ] Wire up export callback
- [ ] Test hot updates (variable changes apply immediately)

**Files**:
- `app/lib/game-engine/GameRuntime.godot.tsx`

### Phase 4: AI Integration (Day 5)

- [ ] Update AI system prompt with tuning guidelines
- [ ] Update generator to detect tunable parameters
- [ ] Add automatic range generation (0.5x-2x default)
- [ ] Test with various game types

**Files**:
- `api/src/ai/prompts/game-generation.ts`
- `api/src/ai/generator.ts`

---

## Zod Schema

```typescript
const VariableValueSchema = z.union([
  z.number(),
  z.boolean(),
  z.string(),
  Vec2Schema,
  z.object({ expr: z.string() }),
]);

const TuningConfigSchema = z.object({
  min: z.number(),
  max: z.number(),
  step: z.number(),
});

const VariableWithTuningSchema = z.object({
  value: VariableValueSchema,
  tuning: TuningConfigSchema.optional(),
  category: z.enum(['physics', 'gameplay', 'visuals', 'economy', 'ai']).optional(),
  label: z.string().optional(),
  description: z.string().optional(),
  display: z.boolean().optional(),
});

const GameVariableSchema = z.union([
  VariableValueSchema,
  VariableWithTuningSchema,
]);

export const GameVariablesSchema = z.record(z.string(), GameVariableSchema);
```

---

## Backward Compatibility

### Existing Games Work Unchanged

```typescript
// Old format (still valid)
{
  variables: {
    multiplier: 1,
    facing: 1,
  }
}

// New format (opt-in)
{
  variables: {
    multiplier: { value: 1, tuning: { min: 0.5, max: 3, step: 0.1 } },
    facing: 1,  // Can mix formats!
  }
}
```

**Resolution**: Type guard checks format at runtime. Primitive values work as-is.

---

## Performance Considerations

### Resolution Cost

```typescript
// Worst case: 100 variables, 50 are objects with metadata
// Resolution per variable: ~2 type checks
// Total: ~200 checks per frame
// Cost: <0.01ms ✅ Negligible
```

### Memory Overhead

```typescript
// Metadata per tunable variable: ~150 bytes
// 50 tunables: ~7.5KB
// Impact: Negligible
```

---

## Testing Strategy

```typescript
describe('Variable Tuning', () => {
  it('resolves simple primitive variables', () => {
    const game = { variables: { speed: 10 } };
    expect(getValue(game.variables.speed)).toBe(10);
  });
  
  it('resolves variables with tuning metadata', () => {
    const game = {
      variables: {
        speed: { value: 10, tuning: { min: 5, max: 20, step: 1 } }
      }
    };
    expect(getValue(game.variables.speed)).toBe(10);
  });
  
  it('identifies tunable variables', () => {
    const simple = 10;
    const tunable = { value: 10, tuning: { min: 5, max: 20, step: 1 } };
    expect(isTunable(simple)).toBe(false);
    expect(isTunable(tunable)).toBe(true);
  });
  
  it('updates variable value via UI', () => {
    const { result } = renderHook(() => useGameState(definition));
    act(() => {
      result.current.updateVariable('jumpForce', 20);
    });
    expect(result.current.gameState.variables.jumpForce).toBe(20);
  });
});
```

---

## Migration Guide

### Converting Flappy Bird

**Before**:
```typescript
const PIPE_SPEED = 15;
const PIPE_GAP = 3.0;

templates: {
  pipeTop: {
    behaviors: [{ type: 'move', speed: PIPE_SPEED }],
  }
}
```

**After**:
```typescript
variables: {
  pipeSpeed: {
    value: 15,
    tuning: { min: 5, max: 30, step: 1 },
    category: 'gameplay',
    label: 'Pipe Speed',
  },
  pipeGap: {
    value: 3.0,
    tuning: { min: 1.5, max: 5.0, step: 0.1 },
    category: 'gameplay',
    label: 'Gap Size',
  },
},

templates: {
  pipeTop: {
    behaviors: [{ type: 'move', speed: { expr: "pipeSpeed" } }],
  },
  scoreZone: {
    sprite: { height: { expr: "pipeGap" } },
    physics: { height: { expr: "pipeGap" } },
  },
}
```

---

## Files to Modify

| File | Changes | LOC |
|------|---------|-----|
| `shared/src/types/GameDefinition.ts` | Add VariableWithTuning | +40 |
| `shared/src/types/schemas.ts` | Add Zod schemas | +30 |
| `shared/src/expressions/EvalContextBuilder.ts` | Handle new format | +10 |
| `app/components/game/TuningPanel.tsx` | New component | +150 |
| `app/components/game/TunableSlider.tsx` | New component | +60 |
| `app/lib/game-engine/GameRuntime.godot.tsx` | Integration | +40 |
| `api/src/ai/prompts/game-generation.ts` | Update prompts | +50 |
| `app/lib/game-engine/__tests__/variables-tuning.test.ts` | Tests | +100 |

**Total New/Modified Code**: ~480 lines

---

## Success Criteria

- [ ] Can define tunable variables with metadata
- [ ] Tuning UI appears in __DEV__ mode only
- [ ] Sliders update game state immediately
- [ ] Changes apply to running game without reload
- [ ] Export produces valid GameDefinition JSON
- [ ] Existing games without tuning metadata work unchanged
- [ ] AI generates reasonable tuning ranges
- [ ] All tests pass

---

## Timeline

**Day 1**: Type system + schemas  
**Day 2-3**: Tuning UI components  
**Day 4**: GameRuntime integration + testing  
**Day 5**: AI integration + documentation

**Can start after hierarchy implementation** or in parallel (independent systems).

---

## Future Enhancements

- **Presets**: Save/load tuning configurations ("Easy Mode", "Speed Run")
- **History**: Undo/redo stack for tuning changes
- **Multiplayer Sync**: Share tuning across devices
- **Analytics**: Track which tunables correlate with fun/retention
- **Auto-Balance**: ML suggestions for parameter ranges

---

## Decision Log

**2026-01-26**: Chose hybrid inline approach over separate `variableMetadata` section
- **Rationale**: Single source of truth, no duplication, progressive complexity
- **User Input**: "I don't want to duplicate the word variable"
- **Team**: Approved by user
