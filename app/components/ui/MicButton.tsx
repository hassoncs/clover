import { useEffect, useRef } from 'react';
import { Pressable, ActivityIndicator, Animated, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { SpeechToTextError } from '@/lib/speech/types';

interface MicButtonProps {
  isRecording: boolean;
  isConnecting: boolean;
  error: SpeechToTextError | null;
  onPress?: () => void;
  onPressIn?: () => void;
  onPressOut?: () => void;
  mode: 'toggle' | 'hold';
}

export function MicButton({
  isRecording,
  isConnecting,
  error,
  onPress,
  onPressIn,
  onPressOut,
  mode,
}: MicButtonProps) {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (error) {
      console.warn('[MicButton] Speech error:', error.code, error.message);
    }
  }, [error]);

  useEffect(() => {
    if (isRecording) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 0.4, duration: 800, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
    pulseAnim.setValue(1);
  }, [isRecording, pulseAnim]);

  return (
    <Pressable
      onPress={mode === 'toggle' ? onPress : undefined}
      onPressIn={mode === 'hold' ? onPressIn : undefined}
      onPressOut={mode === 'hold' ? onPressOut : undefined}
      style={[styles.button, isRecording && styles.buttonRecording]}
      accessibilityLabel={isRecording ? 'Stop recording' : 'Start recording'}
      accessibilityRole="button"
      accessibilityState={{ selected: isRecording }}
      testID="mic-button"
    >
      {isConnecting ? (
        <ActivityIndicator size="small" color="#6B7280" testID="loading-indicator" />
      ) : (
        <Animated.View style={isRecording ? { opacity: pulseAnim } : undefined}>
          <Ionicons
            name={isRecording ? 'mic' : 'mic-outline'}
            size={24}
            color={isRecording ? '#EF4444' : '#6B7280'}
            testID="mic-icon"
          />
        </Animated.View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    padding: 8,
    borderRadius: 9999,
  },
  buttonRecording: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
});
