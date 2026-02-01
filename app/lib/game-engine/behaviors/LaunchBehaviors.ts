import type {
  Behavior,
  StickToEntityBehavior,
  LaunchOnInputBehavior,
} from '@slopcade/shared';
import type { BehaviorContext } from '../BehaviorContext';
import type { BehaviorExecutor } from '../BehaviorExecutor';

export function registerLaunchBehaviors(executor: BehaviorExecutor): void {
  executor.registerHandler('stick_to_entity', (behavior, ctx, runtime) => {
    const stick = behavior as StickToEntityBehavior;

    console.log('[stick_to_entity] Behavior called for entity:', ctx.entity.id);
    console.log('[stick_to_entity] Looking for target tag:', stick.targetTag);

    const targets = ctx.entityManager.getEntitiesByTag(stick.targetTag);
    console.log('[stick_to_entity] Found targets count:', targets.length);

    if (targets.length === 0) {
      console.log('[stick_to_entity] No targets found, returning early');
      return;
    }

    const target = targets[0];
    console.log('[stick_to_entity] Target entity:', target.id);
    console.log('[stick_to_entity] Target position:', target.transform.x, target.transform.y);

    let offsetX = 0;
    let offsetY = 0;

    if (stick.offset) {
      const offset = ctx.resolveVec2(stick.offset);
      offsetX = offset.x;
      offsetY = offset.y;
      console.log('[stick_to_entity] Offset resolved:', offsetX, offsetY);
    }

    if (stick.inheritRotation && target.transform.angle !== 0) {
      const cos = Math.cos(target.transform.angle);
      const sin = Math.sin(target.transform.angle);
      const rotatedX = offsetX * cos - offsetY * sin;
      const rotatedY = offsetX * sin + offsetY * cos;
      offsetX = rotatedX;
      offsetY = rotatedY;
      console.log('[stick_to_entity] Rotation applied, new offset:', offsetX, offsetY);
    }

    console.log('[stick_to_entity] Entity position before:', ctx.entity.transform.x, ctx.entity.transform.y);

    ctx.entity.transform.x = target.transform.x + offsetX;
    ctx.entity.transform.y = target.transform.y + offsetY;

    console.log('[stick_to_entity] Entity position after:', ctx.entity.transform.x, ctx.entity.transform.y);

    if (stick.inheritRotation) {
      ctx.entity.transform.angle = target.transform.angle;
    }

    if (ctx.entity.bodyId) {
      console.log('[stick_to_entity] Setting physics body transform');
      ctx.physics.setLinearVelocity(ctx.entity.bodyId, { x: 0, y: 0 });
      ctx.physics.setTransform(ctx.entity.bodyId, {
        position: { x: ctx.entity.transform.x, y: ctx.entity.transform.y },
        angle: ctx.entity.transform.angle,
      });
    }
  });

  executor.registerHandler('launch_on_input', (behavior, ctx, runtime) => {
    const launch = behavior as LaunchOnInputBehavior;

    console.log('[launch_on_input] Behavior called for entity:', ctx.entity.id);
    console.log('[launch_on_input] Launched state:', runtime.state.launched);

    if (runtime.state.launched) {
      console.log('[launch_on_input] Already launched, returning early');
      return;
    }

    const shouldLaunch = ctx.input.tap !== undefined;
    console.log('[launch_on_input] Tap input detected:', shouldLaunch);
    console.log('[launch_on_input] Tap value:', ctx.input.tap);

    if (shouldLaunch) {
      console.log('[launch_on_input] Processing launch...');
      if (!ctx.entity.bodyId) {
        console.warn('[launch_on_input] Entity has no bodyId, cannot launch');
        return;
      }

      const speed = ctx.resolveNumber(launch.speed);
      const minAngle = launch.minAngle ?? 45;
      const maxAngle = launch.maxAngle ?? 135;

      console.log('[launch_on_input] Speed:', speed, 'Angle range:', minAngle, '-', maxAngle);

      const angleRange = maxAngle - minAngle;
      const randomAngle = minAngle + Math.random() * angleRange;
      const angleRad = (randomAngle * Math.PI) / 180;

      const vx = Math.sin(angleRad) * speed;
      const vy = -Math.cos(angleRad) * speed;

      console.log('[launch_on_input] Setting velocity:', vx, vy);

      ctx.physics.setLinearVelocity(ctx.entity.bodyId, { x: vx, y: vy });

      runtime.state.launched = true;
      console.log('[launch_on_input] Launch completed, state set to launched');

      if (launch.enableBehaviorAfterLaunch !== undefined) {
        const behaviorToEnable = ctx.entity.behaviors[launch.enableBehaviorAfterLaunch];
        if (behaviorToEnable) {
          console.log('[launch_on_input] Enabling behavior:', launch.enableBehaviorAfterLaunch);
          behaviorToEnable.enabled = true;
        }
      }

      runtime.enabled = false;
      console.log('[launch_on_input] Disabled behavior executor for this entity');
    }
  });
}
