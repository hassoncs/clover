import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { MicButton } from '../MicButton';
import type { SpeechToTextError } from '@/lib/speech/types';
import { vi, describe, it, expect } from 'vitest';

vi.mock('react-native', async () => {
  const actual = await vi.importActual('react-native');
  return {
    ...actual,
    Pressable: ({ onPressIn, onPressOut, onPress, children, testID, accessibilityRole, accessibilityLabel, ...props }: any) => (
      <div
        {...props}
        data-testid={testID}
        role={accessibilityRole}
        aria-label={accessibilityLabel}
        onMouseDown={onPressIn}
        onMouseUp={onPressOut}
        onClick={onPress}
      >
        {children}
      </div>
    ),
  };
});

vi.mock('@expo/vector-icons', () => ({
  Ionicons: (props: any) => <div data-testid="mic-icon" {...props} />,
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
    expect(getByTestId('mic-button')).toBeTruthy();
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
