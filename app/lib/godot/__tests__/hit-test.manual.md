# Hit-Test Manual Testing Guide

This document provides manual testing procedures for the `_hit_test()` function in `GameBridge.gd` using game-inspector MCP tools.

## Function Under Test

**Location**: `godot_project/scripts/GameBridge.gd` lines 77-117

**Behavior**:
- Uses `MASK_HIT_TEST = 5` (bodies + hitboxes, not sensors)
- Priority: Hitboxes (Layer 4) > Bodies (Layer 1)
- Returns entity_id string or empty string if no hit

## Prerequisites

1. Game-inspector MCP server running
2. A test game loaded (e.g., ballSort, slopeggle)

## Test Cases

### Test 1: Hit-test returns correct entity

**Steps**:
```typescript
const available = await game_inspector_list();
await game_inspector_open({ name: available.games[0].name });
await game_inspector_pause();

const result = await game_inspector_spawn({
  template: 'box',
  position: { x: 0, y: 0 },
  id: 'test-entity',
});

const hitResult = await game_inspector_query_point({
  x: 0,
  y: 0,
  includeSensors: false,
});
```

**Expected**: `hitResult.entities` contains entity with `entityId: 'test-entity'`

**Cleanup**:
```typescript
await game_inspector_destroy({ entityId: 'test-entity' });
await game_inspector_close();
```

---

### Test 2: Hit-test returns empty for no entity

**Steps**:
```typescript
await game_inspector_open({ name: 'ballSort' });
await game_inspector_pause();

const hitResult = await game_inspector_query_point({
  x: 1000,
  y: 1000,
  includeSensors: false,
});
```

**Expected**: `hitResult.entities.length === 0`

**Cleanup**:
```typescript
await game_inspector_close();
```

---

### Test 3: Layer priority (hitbox > body)

**Note**: This test requires a game with entities that have both hitbox and body collision shapes.

**Steps**:
```typescript
await game_inspector_open({ name: 'ballSort' });
await game_inspector_pause();

const bodyResult = await game_inspector_spawn({
  template: 'box',
  position: { x: 5, y: 5 },
  id: 'test-body',
});

const hitResult = await game_inspector_query_point({
  x: 5,
  y: 5,
  includeSensors: false,
});

const shapes = await game_inspector_get_shapes({
  entityId: 'test-body',
});
```

**Expected**: 
- `hitResult.entities` contains `test-body`
- If entity has both hitbox and body shapes, hitbox should be prioritized

**Cleanup**:
```typescript
await game_inspector_destroy({ entityId: 'test-body' });
await game_inspector_close();
```

---

### Test 4: Sensors are ignored

**Steps**:
```typescript
await game_inspector_open({ name: 'ballSort' });
await game_inspector_pause();

const hitResult = await game_inspector_query_point({
  x: 0,
  y: 0,
  includeSensors: false,
});

const hitResultWithSensors = await game_inspector_query_point({
  x: 0,
  y: 0,
  includeSensors: true,
});
```

**Expected**: 
- `hitResult.entities.length <= hitResultWithSensors.entities.length`
- Sensors should only appear in `hitResultWithSensors`

**Cleanup**:
```typescript
await game_inspector_close();
```

---

### Test 5: Multiple overlapping entities

**Steps**:
```typescript
await game_inspector_open({ name: 'ballSort' });
await game_inspector_pause();

const ids = ['overlap-1', 'overlap-2', 'overlap-3'];
for (const id of ids) {
  await game_inspector_spawn({
    template: 'box',
    position: { x: 10, y: 10 },
    id,
  });
}

const hitResult = await game_inspector_query_point({
  x: 10,
  y: 10,
  includeSensors: false,
});
```

**Expected**: `hitResult.entities.length >= 3` (all spawned entities found)

**Cleanup**:
```typescript
for (const id of ids) {
  await game_inspector_destroy({ entityId: id });
}
await game_inspector_close();
```

---

### Test 6: Coordinate system (all quadrants)

**Steps**:
```typescript
await game_inspector_open({ name: 'ballSort' });
await game_inspector_pause();

const positions = [
  { x: 5, y: 5, id: 'pos-pos' },
  { x: -5, y: 5, id: 'neg-pos' },
  { x: -5, y: -5, id: 'neg-neg' },
  { x: 5, y: -5, id: 'pos-neg' },
];

for (const pos of positions) {
  await game_inspector_spawn({
    template: 'box',
    position: { x: pos.x, y: pos.y },
    id: pos.id,
  });
}

for (const pos of positions) {
  const hitResult = await game_inspector_query_point({
    x: pos.x,
    y: pos.y,
    includeSensors: false,
  });
  
  console.log(`Testing ${pos.id}:`, hitResult.entities.length > 0);
}
```

**Expected**: All four positions return entities

**Cleanup**:
```typescript
for (const pos of positions) {
  await game_inspector_destroy({ entityId: pos.id });
}
await game_inspector_close();
```

---

### Test 7: Rotated entities

**Steps**:
```typescript
await game_inspector_open({ name: 'ballSort' });
await game_inspector_pause();

await game_inspector_spawn({
  template: 'box',
  position: { x: 0, y: 0 },
  id: 'rotated',
});

await game_inspector_set_props({
  entityId: 'rotated',
  values: {
    'transform.rotation': Math.PI / 4,
  },
});

const hitResult = await game_inspector_query_point({
  x: 0,
  y: 0,
  includeSensors: false,
});
```

**Expected**: `hitResult.entities` contains `rotated` entity

**Cleanup**:
```typescript
await game_inspector_destroy({ entityId: 'rotated' });
await game_inspector_close();
```

---

### Test 8: Scaled entities

**Steps**:
```typescript
await game_inspector_open({ name: 'ballSort' });
await game_inspector_pause();

await game_inspector_spawn({
  template: 'box',
  position: { x: 0, y: 0 },
  id: 'scaled',
});

await game_inspector_set_props({
  entityId: 'scaled',
  values: {
    'transform.scale.x': 0.1,
    'transform.scale.y': 0.1,
  },
});

const hitResult = await game_inspector_query_point({
  x: 0,
  y: 0,
  includeSensors: false,
});
```

**Expected**: `hitResult.entities` contains `scaled` entity

**Cleanup**:
```typescript
await game_inspector_destroy({ entityId: 'scaled' });
await game_inspector_close();
```

---

## Automated Test Execution

To run these tests automatically, an AI agent with access to game-inspector MCP tools can execute each test case and verify the expected results.

## Test Coverage Summary

- ✅ Basic hit-test functionality
- ✅ Empty space returns no hit
- ✅ Layer priority (hitbox > body)
- ✅ Sensors ignored
- ✅ Multiple overlapping entities
- ✅ All coordinate quadrants
- ✅ Rotated entities
- ✅ Scaled entities
