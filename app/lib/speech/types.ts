// Hook configuration
type SpeechToTextMode = 'toggle' | 'hold';

type SpeechToTextConfig = {
  mode: SpeechToTextMode;
  maxDuration?: number; // ms, default 300000 (5 min)
  onTranscriptComplete?: (transcript: string) => void;
  onError?: (error: SpeechToTextError) => void;
};

// Hook return type
type SpeechToTextState = {
  transcript: string;
  isRecording: boolean;
  isConnecting: boolean;
  isTranscribing: boolean;
  error: SpeechToTextError | null;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<void>;
  resetTranscript: () => void;
};

// Error types
type SpeechToTextErrorCode = 
  | 'PERMISSION_DENIED'
  | 'CONNECTION_FAILED'
  | 'SESSION_TIMEOUT'
  | 'NETWORK_ERROR'
  | 'OPENAI_ERROR'
  | 'UNKNOWN';

type SpeechToTextError = {
  code: SpeechToTextErrorCode;
  message: string;
};

// OpenAI Realtime API message types (subset needed for transcription)
export type RealtimeEvent = 
  | { type: 'session.update'; session: { input_audio_transcription: { model: string }; turn_detection: { type: string } } }
  | { type: 'input_audio_buffer.append'; audio: string }
  | { type: 'conversation.item.input_audio_transcription.delta'; delta: string }
  | { type: 'conversation.item.input_audio_transcription.completed'; transcript: string }
  | { type: 'error'; error: { message: string } };

export type {
  SpeechToTextMode,
  SpeechToTextConfig,
  SpeechToTextState,
  SpeechToTextErrorCode,
  SpeechToTextError,
};
