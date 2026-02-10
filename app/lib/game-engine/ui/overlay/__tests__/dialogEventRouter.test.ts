import { describe, it, expect, vi } from 'vitest';

import { handleDialogEvent } from '../dialogEventRouter';

describe('handleDialogEvent', () => {
  it('routes start_game to the start handler', () => {
    const onStart = vi.fn();
    const triggerEvent = vi.fn();

    handleDialogEvent('start_game', undefined, {
      onStart,
      onRestart: vi.fn(),
      onResume: vi.fn(),
      triggerEvent,
    });

    expect(onStart).toHaveBeenCalledTimes(1);
    expect(triggerEvent).not.toHaveBeenCalled();
  });

  it('routes resume to the resume handler', () => {
    const onResume = vi.fn();

    handleDialogEvent('resume', undefined, {
      onStart: vi.fn(),
      onRestart: vi.fn(),
      onResume,
      triggerEvent: vi.fn(),
    });

    expect(onResume).toHaveBeenCalledTimes(1);
  });

  it('routes restart to the restart handler', () => {
    const onRestart = vi.fn();

    handleDialogEvent('restart', undefined, {
      onStart: vi.fn(),
      onRestart,
      onResume: vi.fn(),
      triggerEvent: vi.fn(),
    });

    expect(onRestart).toHaveBeenCalledTimes(1);
  });

  it('routes back_to_menu when a handler is available', () => {
    const onBackToMenu = vi.fn();
    const triggerEvent = vi.fn();

    handleDialogEvent('back_to_menu', undefined, {
      onStart: vi.fn(),
      onRestart: vi.fn(),
      onResume: vi.fn(),
      onBackToMenu,
      triggerEvent,
    });

    expect(onBackToMenu).toHaveBeenCalledTimes(1);
    expect(triggerEvent).not.toHaveBeenCalled();
  });

  it('falls back to triggerEvent for back_to_menu when no handler exists', () => {
    const triggerEvent = vi.fn();

    handleDialogEvent('back_to_menu', undefined, {
      onStart: vi.fn(),
      onRestart: vi.fn(),
      onResume: vi.fn(),
      triggerEvent,
    });

    expect(triggerEvent).toHaveBeenCalledWith('back_to_menu', undefined);
  });

  it('falls back to triggerEvent for non-special events', () => {
    const triggerEvent = vi.fn();

    handleDialogEvent('custom_event', { level: 2 }, {
      onStart: vi.fn(),
      onRestart: vi.fn(),
      onResume: vi.fn(),
      triggerEvent,
    });

    expect(triggerEvent).toHaveBeenCalledWith('custom_event', { level: 2 });
  });
});
