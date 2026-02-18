import React from 'react';
import { render, fireEvent, act } from '@testing-library/react';
import { ChatTextArea } from './ChatTextArea';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock react-native
vi.mock('react-native', async () => {
  const actual = await vi.importActual('react-native');
  return {
    ...actual,
    View: (props: any) => <div {...props} />,
    Text: (props: any) => <span {...props} />,
    Pressable: ({ onPress, children, testID, disabled, ...props }: any) => (
      <button
        type="button"
        data-testid={testID}
        onClick={!disabled ? onPress : undefined}
        disabled={disabled}
        {...props}
      >
        {children}
      </button>
    ),
    TextInput: ({ onChangeText, value, testID, placeholder, ...props }: any) => (
      <input
        data-testid={testID}
        value={value}
        onChange={(e) => onChangeText(e.target.value)}
        placeholder={placeholder}
        {...props}
      />
    ),
    StyleSheet: {
      create: (styles: any) => styles,
    },
    Platform: {
      OS: 'web',
      select: (obj: any) => obj.web,
    },
    ActivityIndicator: () => <div data-testid="activity-indicator" />,
  };
});

vi.mock('@expo/vector-icons', () => ({
  Ionicons: () => <div data-testid="icon" />,
}));

vi.mock('@gorhom/bottom-sheet', () => ({
  BottomSheetTextInput: (props: any) => <input {...props} />,
}));

vi.mock('@/components/ui/MicButton', () => ({
  MicButton: ({ onPress, isRecording }: any) => (
    <button type="button" data-testid="mic-button" onClick={onPress}>
      {isRecording ? 'Stop Recording' : 'Start Recording'}
    </button>
  ),
}));

const mockStartRecording = vi.fn();
const mockStopRecording = vi.fn();
const mockUseSpeechToText = vi.fn(() => ({
  transcript: '',
  isRecording: false,
  isConnecting: false,
  error: null,
  startRecording: mockStartRecording,
  stopRecording: mockStopRecording,
}));

vi.mock('@/lib/speech/useSpeechToText', () => ({
  useSpeechToText: (config: any) => {
    (global as any).mockSpeechConfig = config;
    return mockUseSpeechToText();
  },
}));

describe('ChatTextArea Speech-to-Text Integration', () => {
  const mockOnSend = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseSpeechToText.mockReturnValue({
      transcript: '',
      isRecording: false,
      isConnecting: false,
      error: null,
      startRecording: mockStartRecording,
      stopRecording: mockStopRecording,
    });
  });

  it('does not render MicButton when enableSpeechToText is false (default)', () => {
    const { queryByTestId } = render(
      <ChatTextArea onSend={mockOnSend} isSubmitting={false} />
    );
    expect(queryByTestId('mic-button')).toBeNull();
  });

  it('renders MicButton when enableSpeechToText is true', () => {
    const { getByTestId } = render(
      <ChatTextArea onSend={mockOnSend} isSubmitting={false} enableSpeechToText={true} />
    );
    expect(getByTestId('mic-button')).toBeTruthy();
  });

  it('starts recording when MicButton is pressed', () => {
    const { getByTestId } = render(
      <ChatTextArea onSend={mockOnSend} isSubmitting={false} enableSpeechToText={true} />
    );
    
    fireEvent.click(getByTestId('mic-button'));
    expect(mockStartRecording).toHaveBeenCalled();
  });

  it('displays transcript in input while recording', () => {
    mockUseSpeechToText.mockReturnValue({
      transcript: 'Hello world',
      isRecording: true,
      isConnecting: false,
      error: null,
      startRecording: mockStartRecording,
      stopRecording: mockStopRecording,
    });

    const { getByTestId } = render(
      <ChatTextArea onSend={mockOnSend} isSubmitting={false} enableSpeechToText={true} />
    );

    const input = getByTestId('composer-input') as HTMLInputElement;
    expect(input.value).toBe('Hello world');
  });

  it('appends transcript to existing text', () => {
    const { getByTestId, rerender } = render(
      <ChatTextArea onSend={mockOnSend} isSubmitting={false} enableSpeechToText={true} />
    );
    
    const input = getByTestId('composer-input');
    fireEvent.change(input, { target: { value: 'Initial text ' } });

    mockUseSpeechToText.mockReturnValue({
      transcript: 'added speech',
      isRecording: true,
      isConnecting: false,
      error: null,
      startRecording: mockStartRecording,
      stopRecording: mockStopRecording,
    });

    rerender(<ChatTextArea onSend={mockOnSend} isSubmitting={false} enableSpeechToText={true} />);
  });

  it('appends final transcript to text when recording completes', () => {
    const { getByTestId } = render(
      <ChatTextArea onSend={mockOnSend} isSubmitting={false} enableSpeechToText={true} />
    );
    
    const input = getByTestId('composer-input') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Start ' } });
    
    act(() => {
      (global as any).mockSpeechConfig.onTranscriptComplete('finished speech');
    });
    
    expect(input.value).toBe('Start finished speech');
  });
});
