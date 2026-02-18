import { describe, it, expect } from 'vitest';
import type { GameDefinition } from '@slopcade/shared';

import { ensureStateDialogs } from '../ensureStateDialogs';

const makeDefinition = (overrides?: Partial<GameDefinition>): GameDefinition => ({
  metadata: {
    id: 'test-game',
    title: 'Test Game',
    instructions: 'Tap to start',
    version: '1.0.0',
  },
  world: {
    gravity: { x: 0, y: 10 },
    pixelsPerMeter: 50,
  },
  prefabs: {},
  entities: [],
  ...overrides,
});

describe('ensureStateDialogs', () => {
  it('injects ready/won/lost/paused dialogs when missing', () => {
    const definition = makeDefinition();
    const enhanced = ensureStateDialogs(definition);

    const dialogs = enhanced.dialogs?.dialogs ?? [];
    const ready = dialogs.find(dialog => dialog.showOnState === 'ready');
    const won = dialogs.find(dialog => dialog.showOnState === 'won');
    const lost = dialogs.find(dialog => dialog.showOnState === 'lost');
    const paused = dialogs.find(dialog => dialog.showOnState === 'paused');

    expect(ready).toMatchObject({
      title: 'Test Game',
      message: 'Tap to start',
    });
    expect(won).toBeTruthy();
    expect(lost).toBeTruthy();
    expect(paused).toBeTruthy();
  });

  it('keeps existing dialogs and fills only missing states', () => {
    const existing = {
      id: 'custom-paused',
      title: 'Break time',
      showOnState: 'paused' as const,
      buttons: [{ label: 'Resume', eventName: 'resume', variant: 'primary' as const }],
    };
    const definition = makeDefinition({
      dialogs: {
        activeDialogVariable: 'activeDialog',
        dialogs: [existing],
      },
    });

    const enhanced = ensureStateDialogs(definition);
    const dialogs = enhanced.dialogs?.dialogs ?? [];

    expect(dialogs.find(dialog => dialog.id === 'custom-paused')).toEqual(existing);
    expect(dialogs.filter(dialog => dialog.showOnState === 'paused')).toHaveLength(1);
    expect(dialogs.find(dialog => dialog.showOnState === 'ready')).toBeTruthy();
    expect(dialogs.find(dialog => dialog.showOnState === 'won')).toBeTruthy();
    expect(dialogs.find(dialog => dialog.showOnState === 'lost')).toBeTruthy();
  });

  it('adds back_to_menu buttons for win/loss defaults', () => {
    const definition = makeDefinition();
    const enhanced = ensureStateDialogs(definition);
    const dialogs = enhanced.dialogs?.dialogs ?? [];

    const won = dialogs.find(dialog => dialog.showOnState === 'won');
    const lost = dialogs.find(dialog => dialog.showOnState === 'lost');

    expect(won?.buttons.some(button => button.eventName === 'back_to_menu')).toBe(true);
    expect(lost?.buttons.some(button => button.eventName === 'back_to_menu')).toBe(true);
  });
});
