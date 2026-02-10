export type DialogEventHandlerDeps = {
  onStart: () => void;
  onRestart: () => void;
  onResume: () => void;
  onBackToMenu?: () => void;
  onPreviousLevel?: () => void;
  triggerEvent: (eventName: string, data?: Record<string, unknown>) => void;
};

export function handleDialogEvent(
  eventName: string,
  data: Record<string, unknown> | undefined,
  deps: DialogEventHandlerDeps
): void {
  switch (eventName) {
    case 'start_game':
      deps.onStart();
      return;
    case 'restart':
      deps.onRestart();
      return;
    case 'resume':
      deps.onResume();
      return;
    case 'back_to_menu':
      if (deps.onBackToMenu) {
        deps.onBackToMenu();
        return;
      }
      break;
    case 'previous_level':
      if (deps.onPreviousLevel) {
        deps.onPreviousLevel();
        return;
      }
      break;
    default:
      break;
  }

  deps.triggerEvent(eventName, data);
}
