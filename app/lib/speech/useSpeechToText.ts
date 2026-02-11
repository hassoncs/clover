import { useState, useRef, useEffect, useCallback } from 'react';
import { initAudioCapture, startAudioCapture, stopAudioCapture, onAppBackground } from './audioCapture';
import { supabase } from '@/lib/supabase/client';
import { env } from '@/lib/config/env';
import type {
  SpeechToTextConfig,
  SpeechToTextState,
  SpeechToTextError,
  RealtimeEvent,
} from './types';

type InternalState = 'idle' | 'connecting' | 'recording' | 'stopping';

const DEFAULT_MAX_DURATION = 5 * 60 * 1000;

export function useSpeechToText(config: SpeechToTextConfig): SpeechToTextState {
  const [internalState, setInternalState] = useState<InternalState>('idle');
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<SpeechToTextError | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const configRef = useRef(config);
  configRef.current = config;

  const maxDuration = config.maxDuration ?? DEFAULT_MAX_DURATION;

  const cleanup = useCallback(() => {
    stopAudioCapture();

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setInternalState('idle');
  }, []);

  const stopRecording = useCallback(async () => {
    if (internalState === 'idle') return;
    cleanup();
  }, [internalState, cleanup]);

  const startRecording = useCallback(async () => {
    if (internalState !== 'idle') {
      if (configRef.current.mode === 'toggle') {
        cleanup();
      }
      return;
    }

    setInternalState('connecting');
    setError(null);

    try {
      initAudioCapture();

      const session = await supabase?.auth.getSession();
      const token = session?.data.session?.access_token;
      if (!token) {
        throw new Error('No auth token');
      }

      const wsProtocol = env.apiUrl.startsWith('https') ? 'wss' : 'ws';
      const wsHost = env.apiUrl.replace(/^https?:\/\//, '');
      const wsUrl = `${wsProtocol}://${wsHost}/ws/speech-to-text?token=${encodeURIComponent(token)}`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setInternalState('recording');

        const onData = (base64Chunk: string) => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
              type: 'input_audio_buffer.append',
              audio: base64Chunk,
            }));
          }
        };

        startAudioCapture(onData);

        ws.send(JSON.stringify({
          type: 'session.update',
          session: {
            input_audio_transcription: { model: 'whisper-1' },
            turn_detection: { type: 'server_vad' },
          },
        }));

        timeoutRef.current = setTimeout(() => {
          cleanup();
          setError({ code: 'SESSION_TIMEOUT', message: 'Session timed out after 5 minutes' });
        }, maxDuration);
      };

      ws.onmessage = (event) => {
        const msg: RealtimeEvent = JSON.parse(event.data);

        if (msg.type === 'conversation.item.input_audio_transcription.delta') {
          setTranscript((prev) => prev + msg.delta);
        } else if (msg.type === 'conversation.item.input_audio_transcription.completed') {
          setTranscript(msg.transcript);
          configRef.current.onTranscriptComplete?.(msg.transcript);
        } else if (msg.type === 'error') {
          setError({ code: 'OPENAI_ERROR', message: msg.error.message });
        }
      };

      ws.onerror = () => {
        setError({ code: 'CONNECTION_FAILED', message: 'WebSocket connection failed' });
        setInternalState('idle');
      };

      ws.onclose = () => {
        setInternalState('idle');
      };

    } catch (err) {
      setError({
        code: 'PERMISSION_DENIED',
        message: err instanceof Error ? err.message : 'Failed to start recording',
      });
      setInternalState('idle');
    }
  }, [internalState, cleanup, maxDuration]);

  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  useEffect(() => {
    return onAppBackground(() => {
      cleanup();
    });
  }, [cleanup]);

  const resetTranscript = useCallback(() => {
    setTranscript('');
  }, []);

  return {
    transcript,
    isRecording: internalState === 'recording',
    isConnecting: internalState === 'connecting',
    isTranscribing: internalState === 'recording' && transcript.length > 0,
    error,
    startRecording,
    stopRecording,
    resetTranscript,
  };
}
