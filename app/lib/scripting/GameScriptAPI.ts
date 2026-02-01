import type {
  ScriptContext,
  SandboxRuntimeContext,
} from './types';

export function createScriptContext(runtime: SandboxRuntimeContext): ScriptContext {
  const seededRandom = createSeededRandom(Date.now());

  return {
    getVariable: (name) => runtime.rulesEvaluator.getVariable(name),
    setVariable: (name, value) => runtime.rulesEvaluator.setVariable(name, value),
    getConstant: (name) => {
      if (runtime.constants && name in runtime.constants) {
        return runtime.constants[name];
      }
      return runtime.rulesEvaluator.getConstant(name);
    },
    emit: (eventName, data) => runtime.rulesEvaluator.emitEvent(eventName, data),
    win: () => runtime.rulesEvaluator.win(),
    lose: () => runtime.rulesEvaluator.lose(),
    addScore: (points) => runtime.rulesEvaluator.addScore(points),
    addLives: (count) => runtime.rulesEvaluator.addLives(count),

    spawnEntity: (templateId, position, opts) =>
      runtime.entityManager.spawnEntity(templateId, position, opts),
    destroyEntity: (entityId) => runtime.entityManager.destroyEntity(entityId),
    getEntityPosition: (entityId) => runtime.entityManager.getEntityPosition(entityId),
    setEntityPosition: (entityId, position) =>
      runtime.entityManager.setEntityPosition(entityId, position),
    getEntityVelocity: (entityId) => runtime.entityManager.getEntityVelocity(entityId),
    setEntityVelocity: (entityId, velocity) =>
      runtime.entityManager.setEntityVelocity(entityId, velocity),
    applyImpulse: (entityId, impulse) => runtime.entityManager.applyImpulse(entityId, impulse),
    getEntityTags: (entityId) => runtime.entityManager.getEntityTags(entityId),
    addTag: (entityId, tag) => runtime.entityManager.addTag(entityId, tag),
    removeTag: (entityId, tag) => runtime.entityManager.removeTag(entityId, tag),
    hasTag: (entityId, tag) => runtime.entityManager.hasTag(entityId, tag),
    queryEntities: (query) => runtime.entityManager.queryEntities(query),
    getInput: () => runtime.inputSnapshot,
    getMouse: () => runtime.mousePosition,
    getDrag: () => runtime.dragState,

    random: () => seededRandom(),
    randomInt: (min, max) => Math.floor(seededRandom() * (max - min + 1)) + min,
    randomChoice: <T>(array: readonly T[]) => array[Math.floor(seededRandom() * array.length)],
    clamp: (value, min, max) => Math.max(min, Math.min(max, value)),
    lerp: (a, b, t) => a + (b - a) * t,
    distance: (a, b) => Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2),

    get frameId() { return runtime.frameInfo.frameId; },
    get elapsed() { return runtime.frameInfo.elapsed; },
    get dt() { return runtime.frameInfo.dt; },
  };
}

function createSeededRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    return state / 0x7fffffff;
  };
}

export function contextToPlainObject(ctx: ScriptContext): Record<string, unknown> {
  return {
    getVariable: ctx.getVariable,
    setVariable: ctx.setVariable,
    getConstant: ctx.getConstant,
    emit: ctx.emit,
    win: ctx.win,
    lose: ctx.lose,
    addScore: ctx.addScore,
    addLives: ctx.addLives,
    spawnEntity: ctx.spawnEntity,
    destroyEntity: ctx.destroyEntity,
    getEntityPosition: ctx.getEntityPosition,
    setEntityPosition: ctx.setEntityPosition,
    getEntityVelocity: ctx.getEntityVelocity,
    setEntityVelocity: ctx.setEntityVelocity,
    applyImpulse: ctx.applyImpulse,
    getEntityTags: ctx.getEntityTags,
    addTag: ctx.addTag,
    removeTag: ctx.removeTag,
    hasTag: ctx.hasTag,
    queryEntities: ctx.queryEntities,
    getInput: ctx.getInput,
    getMouse: ctx.getMouse,
    getDrag: ctx.getDrag,
    random: ctx.random,
    randomInt: ctx.randomInt,
    randomChoice: ctx.randomChoice,
    clamp: ctx.clamp,
    lerp: ctx.lerp,
    distance: ctx.distance,
    frameId: ctx.frameId,
    elapsed: ctx.elapsed,
    dt: ctx.dt,
  };
}
