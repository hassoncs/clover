import React from 'react';
import { Pressable, ActivityIndicator, View } from 'react-native';
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
  const getIconName = () => {
    if (error) return 'mic-off';
    if (isRecording) return 'mic';
    return 'mic-outline';
  };

  const getIconColor = () => {
    if (error) return '#EF4444';
    if (isRecording) return '#EF4444';
    if (isConnecting) return '#6B7280';
    return '#6B7280';
  };

  const getBackgroundColor = () => {
    if (error) return 'bg-red-100';
    if (isRecording) return 'bg-red-100';
    if (isConnecting) return 'bg-gray-100';
    return 'bg-transparent';
  };

  return (
    <Pressable
      onPress={mode === 'toggle' ? onPress : undefined}
      onPressIn={mode === 'hold' ? onPressIn : undefined}
      onPressOut={mode === 'hold' ? onPressOut : undefined}
      className={`p-2 rounded-full ${getBackgroundColor()}`}
      accessibilityLabel={isRecording ? 'Stop recording' : 'Start recording'}
      accessibilityRole="button"
      accessibilityState={{ selected: isRecording }}
      testID="mic-button"
    >
      <View className="relative">
        {isConnecting ? (
          <ActivityIndicator size="small" color="#6B7280" testID="loading-indicator" />
        ) : (
          <Ionicons
            name={getIconName()}
            size={24}
            color={getIconColor()}
            testID="mic-icon"
          />
        )}
        {isRecording && (
          <View 
            className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" 
            testID="recording-indicator"
          />
        )}
      </View>
    </Pressable>
  );
}
