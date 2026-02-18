import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import * as Notifications from 'expo-notifications';

interface ClientAgentEvent {
  seq: number;
  eventType: string;
}

const NOTIFICATION_EVENT_TYPES = new Set([
  'run_completed',
  'run_failed',
  'run_canceled',
  'user_question',
  'clarification_requested',
]);

function getNotificationContent(event: ClientAgentEvent): { title: string; body: string } | null {
  switch (event.eventType) {
    case 'run_completed':
      return { title: 'Game Ready!', body: 'Your game has been built successfully.' };
    case 'run_failed':
      return { title: 'Build Failed', body: 'Something went wrong during game creation.' };
    case 'run_canceled':
      return { title: 'Build Canceled', body: 'Game creation was canceled.' };
    case 'user_question':
      return { title: 'Question for You', body: 'The game builder needs your input to continue.' };
    case 'clarification_requested':
      return { title: 'Clarification Needed', body: 'The game builder has a question about your game.' };
    default:
      return null;
  }
}

export function useAgentNotifications(events: ClientAgentEvent[]) {
  const processedSeqs = useRef(new Set<number>());

  useEffect(() => {
    if (!events.length) return;

    const appState = AppState.currentState;
    const isBackground = appState !== 'active';

    for (const event of events) {
      if (processedSeqs.current.has(event.seq)) continue;
      processedSeqs.current.add(event.seq);

      if (!isBackground) continue;
      if (!NOTIFICATION_EVENT_TYPES.has(event.eventType)) continue;

      const content = getNotificationContent(event);
      if (!content) continue;

      Notifications.scheduleNotificationAsync({
        content: {
          ...content,
          data: { eventType: event.eventType, seq: event.seq },
          ...(AppState.currentState === 'background' ? {} : {}),
        },
        trigger: null,
      });
    }
  }, [events]);
}
