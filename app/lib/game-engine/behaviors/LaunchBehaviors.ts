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

    const targets = ctx.entityManager.getEntitiesByTag(stick.targetTag);

    if (targets.length === 0) {
      return;
    }

    const target = targets[0];

    let offsetX = 0;
    let offsetY = 0;

    if (stick.offset) {
      const offset = ctx.resolveVec2(stick.offset);
      offsetX = offset.x;
      offsetY = offset.y;
    }

    if (stick.inheritRotation && target.transform.angle !== 0) {
      const cos = Math.cos(target.transform.angle);
      const sin = Math.sin(target.transform.angle);
      const rotatedX = offsetX * cos - offsetY * sin;
      const rotatedY = offsetX * sin + offsetY * cos;
      offsetX = rotatedX;
      offsetY = rotatedY;
    }

    ctx.entity.transform.x = target.transform.x + offsetX;
    ctx.entity.transform.y = target.transform.y + offsetY;

    if (stick.inheritRotation) {
      ctx.entity.transform.angle = target.transform.angle;
    }

    if (ctx.entity.physics) {
      ctx.physics.setLinearVelocity(ctx.entity.id, { x: 0, y: 0 });
      ctx.physics.setTransform(ctx.entity.id, {
        position: { x: ctx.entity.transform.x, y: ctx.entity.transform.y },
        angle: ctx.entity.transform.angle,
      });
    }
  });

  executor.registerHandler('launch_on_input', (behavior, ctx, runtime) => {
    const launch = behavior as LaunchOnInputBehavior;

    if (runtime.state.launched) {
      return;
    }

    const shouldLaunch = ctx.input.tap !== undefined;

    if (shouldLaunch) {
      if (!ctx.entity.physics) {
        console.warn('[launch_on_input] Entity has no physics, cannot launch');
        return;
      }

      const speed = ctx.resolveNumber(launch.speed);
      const minAngle = launch.minAngle ?? 45;
      const maxAngle = launch.maxAngle ?? 135;

      const angleRange = maxAngle - minAngle;
      const randomAngle = minAngle + Math.random() * angleRange;
      const angleRad = (randomAngle * Math.PI) / 180;

      const vx = Math.sin(angleRad) * speed;
      const vy = -Math.cos(angleRad) * speed;

      ctx.physics.setLinearVelocity(ctx.entity.id, { x: vx, y: vy });

      runtime.state.launched = true;

      if (launch.enableBehaviorAfterLaunch !== undefined) {
        const behaviorToEnable = ctx.entity.behaviors[launch.enableBehaviorAfterLaunch];
        if (behaviorToEnable) {
          behaviorToEnable.enabled = true;
        }
      }

      runtime.enabled = false;
    }
  });
}
