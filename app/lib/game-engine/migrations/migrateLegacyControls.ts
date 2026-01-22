import type { GameDefinition, ControlBehavior, GameRule, EntityTarget } from '@slopcade/shared';

export function migrateLegacyControls(definition: GameDefinition): GameDefinition {
  const newRules: GameRule[] = [...(definition.rules ?? [])];

  for (const entity of definition.entities) {
    const controlBehaviors = entity.behaviors?.filter(b => b.type === 'control') ?? [];

    for (const behavior of controlBehaviors) {
      const controlBehavior = behavior as ControlBehavior;
      const rules = convertControlToRules(entity.id, controlBehavior);
      newRules.push(...rules);
    }

    if (entity.behaviors) {
      entity.behaviors = entity.behaviors.filter(b => b.type !== 'control');
    }
  }

  return { ...definition, rules: newRules };
}

function convertControlToRules(entityId: string, control: ControlBehavior): GameRule[] {
  const target: EntityTarget = { type: 'by_id', entityId };
  const force = control.force ?? 10;
  const cooldown = control.cooldown ?? 0.2;

  switch (control.controlType) {
    case 'tap_to_jump':
      return [{
        id: `${entityId}_tap_jump`,
        name: 'Jump on tap',
        trigger: { type: 'tap' },
        conditions: [{ type: 'on_ground', value: true }],
        actions: [{ type: 'apply_impulse', target, y: -force }],
        cooldown,
      }];

    case 'tap_to_shoot':
      return [{
        id: `${entityId}_tap_shoot`,
        name: 'Shoot on tap',
        trigger: { type: 'tap' },
        actions: [{ type: 'event', eventName: 'shoot' }],
        cooldown,
      }];

    case 'drag_to_aim':
      return [{
        id: `${entityId}_drag_aim`,
        name: 'Launch on drag',
        trigger: { type: 'drag', phase: 'end', target: 'self' },
        actions: [{ type: 'apply_impulse', target, direction: 'drag_direction', force }],
      }];

    case 'tilt_to_move':
      return [{
        id: `${entityId}_tilt_move`,
        name: 'Tilt to move',
        trigger: { type: 'tilt', threshold: 0.1 },
        actions: [{ type: 'apply_force', target, direction: 'tilt_direction', force }],
      }];

    case 'buttons':
      return [
        {
          id: `${entityId}_move_left`,
          name: 'Move left',
          trigger: { type: 'button', button: 'left', state: 'held' },
          actions: [{ type: 'apply_force', target, x: -force }],
        },
        {
          id: `${entityId}_move_right`,
          name: 'Move right',
          trigger: { type: 'button', button: 'right', state: 'held' },
          actions: [{ type: 'apply_force', target, x: force }],
        },
        {
          id: `${entityId}_jump`,
          name: 'Jump',
          trigger: { type: 'button', button: 'jump', state: 'pressed' },
          conditions: [{ type: 'on_ground', value: true }],
          actions: [{ type: 'apply_impulse', target, y: -force }],
          cooldown,
        },
      ];

    case 'drag_to_move':
      return [{
        id: `${entityId}_drag_move`,
        name: 'Drag to move',
        trigger: { type: 'drag', phase: 'move' },
        actions: [{ type: 'apply_force', target, direction: 'toward_touch', force }],
      }];

    case 'tilt_gravity':
      return [{
        id: `${entityId}_tilt_gravity`,
        name: 'Tilt gravity',
        trigger: { type: 'tilt', threshold: 0.05 },
        actions: [{ type: 'apply_force', target, direction: 'tilt_direction', force }],
      }];

    case 'tap_to_flip':
      return [{
        id: `${entityId}_tap_flip`,
        name: 'Flip on tap',
        trigger: { type: 'tap' },
        actions: [{ type: 'apply_impulse', target, y: -force }],
        cooldown,
      }];

    default:
      return [];
  }
}
