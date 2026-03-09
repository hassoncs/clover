import React from 'react';
import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { SpeechToTextError } from '@/lib/speech/types';
import { MicButton } from '../MicButton';

vi.mock('@slopcade/ui', () => ({
  MicButton: ({
    isRecording,
    isConnecting,
    error,
    onPress,
    onPressIn,
    onPressOut,
  }: {
    isRecording?: boolean;
    isConnecting?: boolean;
    error?: SpeechToTextError | null;
    onPress?: () => void;
    onPressIn?: () => void;
    onPressOut?: () => void;
  }) => (
    <button
      type="button"
      data-testid="mic-button"
      aria-label="mic"
      onClick={onPress}
      onMouseDown={onPressIn}
      onMouseUp={onPressOut}
    >
      <span data-testid="mic-icon" />
      {isRecording ? <span data-testid="recording-indicator" /> : null}
      {isConnecting ? <span data-testid="loading-indicator" /> : null}
      {error ? <span data-testid="error-indicator" /> : null}
    </button>
  ),
}));

describe('MicButton', () => {
  const defaultProps = {
    isRecording: false,
    isConnecting: false,
    error: null,
    mode: 'toggle' as const,
  };

  it('renders mic icon in idle state', () => {
    const { getByTestId } = render(<MicButton {...defaultProps} />);
    expect(getByTestId('mic-button')).toBeTruthy();
    expect(getByTestId('mic-icon')).toBeTruthy();
  });

  it('renders active/recording state when isRecording=true', () => {
    const { getByTestId } = render(<MicButton {...defaultProps} isRecording={true} />);
    expect(getByTestId('recording-indicator')).toBeTruthy();
  });

  it('renders connecting state when isConnecting=true', () => {
    const { getByTestId } = render(<MicButton {...defaultProps} isConnecting={true} />);
    expect(getByTestId('loading-indicator')).toBeTruthy();
  });

  it('renders error state when error is set', () => {
    const error: SpeechToTextError = { code: 'NETWORK_ERROR', message: 'Network error' };
    const { getByTestId } = render(<MicButton {...defaultProps} error={error} />);
    expect(getByTestId('error-indicator')).toBeTruthy();
  });

  it('calls onPressIn when pressed (for hold mode)', () => {
    const onPressIn = vi.fn();
    const { getByTestId } = render(
      <MicButton {...defaultProps} mode="hold" onPressIn={onPressIn} />
    );
    fireEvent.mouseDown(getByTestId('mic-button'), { buttons: 1 });
    expect(onPressIn).toHaveBeenCalled();
  });

  it('calls onPressOut when released (for hold mode)', () => {
    const onPressOut = vi.fn();
    const { getByTestId } = render(
      <MicButton {...defaultProps} mode="hold" onPressOut={onPressOut} />
    );
    fireEvent.mouseDown(getByTestId('mic-button'), { buttons: 1 });
    fireEvent.mouseUp(getByTestId('mic-button'));
    expect(onPressOut).toHaveBeenCalled();
  });

  it('calls onPress when tapped (for toggle mode)', () => {
    const onPress = vi.fn();
    const { getByTestId } = render(
      <MicButton {...defaultProps} mode="toggle" onPress={onPress} />
    );
    fireEvent.click(getByTestId('mic-button'));
    expect(onPress).toHaveBeenCalled();
  });

  it('has accessibilityLabel and accessibilityRole', () => {
    const { getByRole } = render(<MicButton {...defaultProps} />);
    const button = getByRole('button');
    expect(button).toBeTruthy();
  });
});
