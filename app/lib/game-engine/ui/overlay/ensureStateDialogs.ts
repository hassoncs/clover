import type { GameDefinition, GameDialogDefinition } from '@slopcade/shared';

export function ensureStateDialogs(definition: GameDefinition): GameDefinition {
  const existing = definition.dialogs?.dialogs ?? [];
  const coveredStates = new Set(
    existing.filter(d => d.showOnState).map(d => d.showOnState)
  );

  const defaults: GameDialogDefinition[] = [];

  if (!coveredStates.has('ready')) {
    defaults.push({
      id: '__default_ready',
      showOnState: 'ready',
      title: definition.metadata?.title ?? 'Ready',
      message: definition.metadata?.instructions,
      buttons: [
        { label: 'Play', eventName: 'start_game', variant: 'primary' },
      ],
    });
  }

  if (!coveredStates.has('won')) {
    defaults.push({
      id: '__default_won',
      showOnState: 'won',
      title: 'You Win!',
      stats: [{ label: 'Score', variable: 'score' }],
      buttons: [
        { label: 'Play Again', eventName: 'restart', variant: 'primary' },
        { label: 'Back to Menu', eventName: 'back_to_menu', variant: 'secondary' },
      ],
    });
  }

  if (!coveredStates.has('lost')) {
    defaults.push({
      id: '__default_lost',
      showOnState: 'lost',
      title: 'Game Over',
      stats: [{ label: 'Score', variable: 'score' }],
      buttons: [
        { label: 'Try Again', eventName: 'restart', variant: 'primary' },
        { label: 'Back to Menu', eventName: 'back_to_menu', variant: 'secondary' },
      ],
    });
  }

  if (!coveredStates.has('paused')) {
    defaults.push({
      id: '__default_paused',
      showOnState: 'paused',
      title: 'Paused',
      buttons: [
        { label: 'Resume', eventName: 'resume', variant: 'primary' },
        { label: 'Restart', eventName: 'restart', variant: 'secondary' },
      ],
    });
  }

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
