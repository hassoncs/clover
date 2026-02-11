export type RealtimeRelayEnv = {
  OPENAI_API_KEY: string;
  // Add other bindings as needed
};

// OpenAI Realtime API event types for the relay
export type OpenAIRealtimeEvent =
  | { type: 'session.created' }
  | { type: 'session.updated' }
  | { type: 'conversation.item.input_audio_transcription.delta'; delta: string }
  | { type: 'conversation.item.input_audio_transcription.completed'; transcript: string }
  | { type: 'error'; error: { message: string } };
