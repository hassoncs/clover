import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { SpeechToTextConfig } from '../types';

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

const React = require('react');
const ReactDOM = require('react-dom/client');

const act: (fn: () => void | Promise<void>) => Promise<void> = React.act;

function renderHook<T>(hookFn: () => T) {
  const result: { current: T } = { current: undefined as unknown as T };

  function TestComponent() {
    result.current = hookFn();
    return null;
  }

  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = ReactDOM.createRoot(container);

  act(() => {
    root.render(React.createElement(TestComponent));
  });

  const unmount = () => {
    act(() => {
      root.unmount();
    });
    document.body.removeChild(container);
  };

  return { result, unmount };
}

const mockInitAudioCapture = vi.fn();
const mockStartAudioCapture = vi.fn();
const mockStopAudioCapture = vi.fn();
let mockBackgroundCallback: (() => void) | null = null;
const mockBackgroundUnsubscribe = vi.fn();
vi.mock('../audioCapture', () => ({
  initAudioCapture: (...args: unknown[]) => mockInitAudioCapture(...args),
  startAudioCapture: (...args: unknown[]) => mockStartAudioCapture(...args),
  stopAudioCapture: (...args: unknown[]) => mockStopAudioCapture(...args),
  onAppBackground: (callback: () => void) => {
    mockBackgroundCallback = callback;
    return mockBackgroundUnsubscribe;
  },
}));

const mockGetAuthToken = vi.fn();
vi.mock('@/lib/auth/token', () => ({
  getAuthToken: () => mockGetAuthToken(),
}));

vi.mock('@/lib/config/env', () => ({
  env: {
    apiUrl: 'https://api.test.com',
  },
}));

vi.mock('react-native', () => ({
  Platform: {
    OS: 'ios',
    select: (obj: Record<string, unknown>) => obj.ios,
  },
}));

class MockWebSocket {
  static OPEN = 1;
  static CLOSED = 3;
  static instances: MockWebSocket[] = [];

  url: string;
  readyState = MockWebSocket.OPEN;
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onerror: (() => void) | null = null;
  onclose: ((event: { code: number; reason: string }) => void) | null = null;
  sentMessages: string[] = [];
  closed = false;

  constructor(url: string) {
    this.url = url;
    MockWebSocket.instances.push(this);
    setTimeout(() => this.onopen?.(), 0);
  }

  send(data: string) {
    this.sentMessages.push(data);
  }

  close() {
    this.closed = true;
    this.readyState = MockWebSocket.CLOSED;
    this.onclose?.({ code: 1000, reason: '' });
  }

  static reset() {
    MockWebSocket.instances = [];
  }
}

(globalThis as any).WebSocket = MockWebSocket;

function defaultConfig(overrides?: Partial<SpeechToTextConfig>): SpeechToTextConfig {
  return {
    mode: 'toggle',
    ...overrides,
  };
}

function setupAuthSuccess(token = 'test-token') {
  mockGetAuthToken.mockResolvedValue(token);
}

function setupAuthFailure() {
  mockGetAuthToken.mockResolvedValue(null);
}

describe('useSpeechToText', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    MockWebSocket.reset();
    mockInitAudioCapture.mockClear();
    mockStartAudioCapture.mockClear();
    mockStopAudioCapture.mockClear();
    mockGetAuthToken.mockReset();
    mockBackgroundCallback = null;
    mockBackgroundUnsubscribe.mockClear();
    setupAuthSuccess();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns correct initial state', async () => {
    const { useSpeechToText } = await import('../useSpeechToText');
    const { result } = renderHook(() => useSpeechToText(defaultConfig()));

    expect(result.current.isRecording).toBe(false);
    expect(result.current.isConnecting).toBe(false);
    expect(result.current.isTranscribing).toBe(false);
    expect(result.current.transcript).toBe('');
    expect(result.current.error).toBeNull();
    expect(typeof result.current.startRecording).toBe('function');
    expect(typeof result.current.stopRecording).toBe('function');
    expect(typeof result.current.resetTranscript).toBe('function');
  });

  it('startRecording initializes audio capture', async () => {
    const { useSpeechToText } = await import('../useSpeechToText');
    const { result } = renderHook(() => useSpeechToText(defaultConfig()));

    await act(async () => {
      result.current.startRecording();
      await vi.advanceTimersByTimeAsync(10);
    });

    expect(mockInitAudioCapture).toHaveBeenCalled();
  });

  it('startRecording opens WebSocket with auth token', async () => {
    const { useSpeechToText } = await import('../useSpeechToText');
    const { result } = renderHook(() => useSpeechToText(defaultConfig()));

    await act(async () => {
      result.current.startRecording();
      await vi.advanceTimersByTimeAsync(10);
    });

    expect(MockWebSocket.instances.length).toBe(1);
    const ws = MockWebSocket.instances[0];
    expect(ws.url).toContain('/ws/speech-to-text');
    expect(ws.url).toContain('token=test-token');
  });

  it('startRecording with no auth token sets error', async () => {
    setupAuthFailure();
    const { useSpeechToText } = await import('../useSpeechToText');
    const { result } = renderHook(() => useSpeechToText(defaultConfig()));

    await act(async () => {
      result.current.startRecording();
      await vi.advanceTimersByTimeAsync(10);
    });

    expect(result.current.error).not.toBeNull();
    expect(result.current.isRecording).toBe(false);
  });

  it('transitions to recording state after WebSocket opens', async () => {
    const { useSpeechToText } = await import('../useSpeechToText');
    const { result } = renderHook(() => useSpeechToText(defaultConfig()));

    await act(async () => {
      result.current.startRecording();
      await vi.advanceTimersByTimeAsync(10);
    });

    expect(result.current.isRecording).toBe(true);
    expect(result.current.isConnecting).toBe(false);
    expect(mockStartAudioCapture).toHaveBeenCalled();
  });

  it('audio data chunks are forwarded via WebSocket as input_audio_buffer.append', async () => {
    const { useSpeechToText } = await import('../useSpeechToText');
    const { result } = renderHook(() => useSpeechToText(defaultConfig()));

    await act(async () => {
      result.current.startRecording();
      await vi.advanceTimersByTimeAsync(10);
    });

    const dataCallback = mockStartAudioCapture.mock.calls[0]?.[0] as ((chunk: string) => void) | undefined;
    expect(dataCallback).toBeDefined();

    await act(async () => {
      dataCallback!('base64AudioChunk==');
    });

    const ws = MockWebSocket.instances[0];
    const sent = ws.sentMessages.map((m) => JSON.parse(m));
    const audioMsg = sent.find((m) => m.type === 'input_audio_buffer.append');
    expect(audioMsg).toBeDefined();
    expect(audioMsg.audio).toBe('base64AudioChunk==');
  });

  it('transcription.delta events update transcript state', async () => {
    const { useSpeechToText } = await import('../useSpeechToText');
    const { result } = renderHook(() => useSpeechToText(defaultConfig()));

    await act(async () => {
      result.current.startRecording();
      await vi.advanceTimersByTimeAsync(10);
    });

    const ws = MockWebSocket.instances[0];

    await act(async () => {
      ws.onmessage?.({
        data: JSON.stringify({
          type: 'conversation.item.input_audio_transcription.delta',
          delta: 'Hello ',
        }),
      });
    });

    expect(result.current.transcript).toBe('Hello ');

    await act(async () => {
      ws.onmessage?.({
        data: JSON.stringify({
          type: 'conversation.item.input_audio_transcription.delta',
          delta: 'world',
        }),
      });
    });

    expect(result.current.transcript).toBe('Hello world');
  });

  it('transcription.completed events call onTranscriptComplete callback', async () => {
    const onComplete = vi.fn();
    const { useSpeechToText } = await import('../useSpeechToText');
    const { result } = renderHook(() =>
      useSpeechToText(defaultConfig({ onTranscriptComplete: onComplete }))
    );

    await act(async () => {
      result.current.startRecording();
      await vi.advanceTimersByTimeAsync(10);
    });

    const ws = MockWebSocket.instances[0];

    await act(async () => {
      ws.onmessage?.({
        data: JSON.stringify({
          type: 'conversation.item.input_audio_transcription.completed',
          transcript: 'Hello world',
        }),
      });
    });

    expect(onComplete).toHaveBeenCalledWith('Hello world');
    expect(result.current.transcript).toBe('Hello world');
  });

  it('stopRecording stops audio stream and closes WebSocket', async () => {
    const { useSpeechToText } = await import('../useSpeechToText');
    const { result } = renderHook(() => useSpeechToText(defaultConfig()));

    await act(async () => {
      result.current.startRecording();
      await vi.advanceTimersByTimeAsync(10);
    });

    expect(result.current.isRecording).toBe(true);
    const ws = MockWebSocket.instances[0];

    await act(async () => {
      result.current.stopRecording();
    });

    expect(mockStopAudioCapture).toHaveBeenCalled();
    expect(ws.closed).toBe(true);
    expect(result.current.isRecording).toBe(false);
  });

  it('resetTranscript clears transcript to empty string', async () => {
    const { useSpeechToText } = await import('../useSpeechToText');
    const { result } = renderHook(() => useSpeechToText(defaultConfig()));

    await act(async () => {
      result.current.startRecording();
      await vi.advanceTimersByTimeAsync(10);
    });

    const ws = MockWebSocket.instances[0];

    await act(async () => {
      ws.onmessage?.({
        data: JSON.stringify({
          type: 'conversation.item.input_audio_transcription.delta',
          delta: 'some text',
        }),
      });
    });

    expect(result.current.transcript).toBe('some text');

    await act(async () => {
      result.current.resetTranscript();
    });

    expect(result.current.transcript).toBe('');
  });

  it('component unmount stops recording and closes WebSocket', async () => {
    const { useSpeechToText } = await import('../useSpeechToText');
    const { result, unmount } = renderHook(() => useSpeechToText(defaultConfig()));

    await act(async () => {
      result.current.startRecording();
      await vi.advanceTimersByTimeAsync(10);
    });

    const ws = MockWebSocket.instances[0];
    expect(result.current.isRecording).toBe(true);

    unmount();

    expect(mockStopAudioCapture).toHaveBeenCalled();
    expect(ws.closed).toBe(true);
  });

  it('app background stops recording', async () => {
    const { useSpeechToText } = await import('../useSpeechToText');
    const { result } = renderHook(() => useSpeechToText(defaultConfig()));

    await act(async () => {
      result.current.startRecording();
      await vi.advanceTimersByTimeAsync(10);
    });

    expect(result.current.isRecording).toBe(true);

    await act(async () => {
      mockBackgroundCallback?.();
    });

    expect(mockStopAudioCapture).toHaveBeenCalled();
    expect(result.current.isRecording).toBe(false);
  });

  it('5-minute timeout auto-stops recording', async () => {
    const { useSpeechToText } = await import('../useSpeechToText');
    const { result } = renderHook(() => useSpeechToText(defaultConfig()));

    await act(async () => {
      result.current.startRecording();
      await vi.advanceTimersByTimeAsync(10);
    });

    expect(result.current.isRecording).toBe(true);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5 * 60 * 1000);
    });

    expect(result.current.isRecording).toBe(false);
    expect(result.current.error?.code).toBe('SESSION_TIMEOUT');
  });

  it('mode toggle: startRecording toggles on/off', async () => {
    const { useSpeechToText } = await import('../useSpeechToText');
    const { result } = renderHook(() => useSpeechToText(defaultConfig({ mode: 'toggle' })));

    await act(async () => {
      result.current.startRecording();
      await vi.advanceTimersByTimeAsync(10);
    });
    expect(result.current.isRecording).toBe(true);

    await act(async () => {
      result.current.startRecording();
      await vi.advanceTimersByTimeAsync(10);
    });
    expect(result.current.isRecording).toBe(false);
  });

  it('mode hold: startRecording starts, stopRecording stops (no toggle)', async () => {
    const { useSpeechToText } = await import('../useSpeechToText');
    const { result } = renderHook(() => useSpeechToText(defaultConfig({ mode: 'hold' })));

    await act(async () => {
      result.current.startRecording();
      await vi.advanceTimersByTimeAsync(10);
    });
    expect(result.current.isRecording).toBe(true);

    await act(async () => {
      result.current.startRecording();
      await vi.advanceTimersByTimeAsync(10);
    });
    expect(result.current.isRecording).toBe(true);
    expect(MockWebSocket.instances.length).toBe(1);

    await act(async () => {
      result.current.stopRecording();
    });
    expect(result.current.isRecording).toBe(false);
  });

  it('rapid start/stop does not create multiple connections', async () => {
    const { useSpeechToText } = await import('../useSpeechToText');
    const { result } = renderHook(() => useSpeechToText(defaultConfig({ mode: 'hold' })));

    await act(async () => {
      result.current.startRecording();
      await vi.advanceTimersByTimeAsync(10);
    });

    await act(async () => {
      result.current.stopRecording();
    });

    await act(async () => {
      result.current.startRecording();
      await vi.advanceTimersByTimeAsync(10);
    });

    expect(MockWebSocket.instances.length).toBe(2);
    expect(result.current.isRecording).toBe(true);
  });

  it('WebSocket error sets CONNECTION_FAILED error state', async () => {
    const { useSpeechToText } = await import('../useSpeechToText');
    const { result } = renderHook(() => useSpeechToText(defaultConfig()));

    await act(async () => {
      result.current.startRecording();
      await vi.advanceTimersByTimeAsync(10);
    });

    const ws = MockWebSocket.instances[0];

    await act(async () => {
      ws.onerror?.();
    });

    expect(result.current.error).not.toBeNull();
    expect(result.current.error?.code).toBe('CONNECTION_FAILED');
    expect(result.current.isRecording).toBe(false);
  });

  it('sends session config on WebSocket open', async () => {
    const { useSpeechToText } = await import('../useSpeechToText');
    const { result } = renderHook(() => useSpeechToText(defaultConfig()));

    await act(async () => {
      result.current.startRecording();
      await vi.advanceTimersByTimeAsync(10);
    });

    const ws = MockWebSocket.instances[0];
    const sent = ws.sentMessages.map((m) => JSON.parse(m));
    const sessionMsg = sent.find((m) => m.type === 'session.update');
    expect(sessionMsg).toBeDefined();
    expect(sessionMsg.session.input_audio_transcription.model).toBe('whisper-1');
  });

  it('isTranscribing is true when recording and transcript is non-empty', async () => {
    const { useSpeechToText } = await import('../useSpeechToText');
    const { result } = renderHook(() => useSpeechToText(defaultConfig()));

    await act(async () => {
      result.current.startRecording();
      await vi.advanceTimersByTimeAsync(10);
    });

    expect(result.current.isTranscribing).toBe(false);

    const ws = MockWebSocket.instances[0];

    await act(async () => {
      ws.onmessage?.({
        data: JSON.stringify({
          type: 'conversation.item.input_audio_transcription.delta',
          delta: 'text',
        }),
      });
    });

    expect(result.current.isTranscribing).toBe(true);
  });
});
