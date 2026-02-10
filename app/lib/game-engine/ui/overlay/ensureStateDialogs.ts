import type { GameDefinition, GameDialogDefinition } from '@slopcade/shared';

const DEFAULT_STATE_DIALOGS: GameDialogDefinition[] = [
  {
    id: '__default_won',
    showOnState: 'won',
    title: 'You Win!',
    stats: [{ label: 'Score', variable: 'score' }],
    buttons: [
      { label: 'Play Again', eventName: 'restart', variant: 'primary' },
    ],
  },
  {
    id: '__default_lost',
    showOnState: 'lost',
    title: 'Game Over',
    stats: [{ label: 'Score', variable: 'score' }],
    buttons: [
      { label: 'Try Again', eventName: 'restart', variant: 'primary' },
    ],
  },
  {
    id: '__default_paused',
    showOnState: 'paused',
    title: 'Paused',
    buttons: [
      { label: 'Resume', eventName: 'resume', variant: 'primary' },
      { label: 'Restart', eventName: 'restart', variant: 'secondary' },
    ],
  },
];

export function ensureStateDialogs(definition: GameDefinition): GameDefinition {
  const existing = definition.dialogs?.dialogs ?? [];
  const coveredStates = new Set(
    existing.filter(d => d.showOnState).map(d => d.showOnState)
  );

  const defaults = DEFAULT_STATE_DIALOGS.filter(
    d => d.showOnState && !coveredStates.has(d.showOnState)
  );

  if (defaults.length === 0) return definition;

  return {
    ...definition,
    dialogs: {
      ...definition.dialogs,
      activeDialogVariable: definition.dialogs?.activeDialogVariable,
      dialogs: [...existing, ...defaults],
    },
  };
}
