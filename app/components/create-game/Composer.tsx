import React, { useState, useCallback } from 'react';
import { View, Pressable, StyleSheet, ActivityIndicator, Platform, type NativeSyntheticEvent, type TextInputKeyPressEventData, type TextInputContentSizeChangeEventData } from 'react-native';
import { BottomSheetTextInput } from '@gorhom/bottom-sheet';
import { Ionicons } from '@expo/vector-icons';

const MIN_INPUT_HEIGHT = 40;
const MAX_INPUT_HEIGHT = 120;

interface Props {
  onSend: (text: string) => void;
  isSubmitting: boolean;
}

export function Composer({ onSend, isSubmitting }: Props) {
  const [text, setText] = useState('');
  const [inputHeight, setInputHeight] = useState(MIN_INPUT_HEIGHT);

  const handleSend = useCallback(() => {
    if (!text.trim() || isSubmitting) return;
    onSend(text.trim());
    setText('');
    setInputHeight(MIN_INPUT_HEIGHT);
  }, [text, isSubmitting, onSend]);

  const handleContentSizeChange = useCallback(
    (e: NativeSyntheticEvent<TextInputContentSizeChangeEventData>) => {
      const contentHeight = e.nativeEvent.contentSize.height;
      const clamped = Math.min(Math.max(contentHeight, MIN_INPUT_HEIGHT), MAX_INPUT_HEIGHT);
      setInputHeight(clamped);
    },
    []
  );

  const handleChangeText = useCallback((newText: string) => {
    setText(newText);
  }, []);

  const handleKeyPress = useCallback((e: NativeSyntheticEvent<TextInputKeyPressEventData>) => {
    if (Platform.OS !== 'web') return;
    const nativeEvent = e.nativeEvent as TextInputKeyPressEventData & { shiftKey?: boolean };
    if (nativeEvent.key === 'Enter' && !nativeEvent.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  const isDisabled = !text.trim() || isSubmitting;

  return (
    <View style={styles.container}>
      <BottomSheetTextInput
        style={[styles.input, { height: inputHeight }]}
        value={text}
        onChangeText={handleChangeText}
        placeholder="Make an edit..."
        placeholderTextColor="#71717A"
        multiline
        maxLength={1000}
        onKeyPress={handleKeyPress}
        onContentSizeChange={handleContentSizeChange}
        blurOnSubmit={false}
        accessibilityLabel="Message input"
      />
      <Pressable
        onPress={handleSend}
        disabled={isDisabled}
        style={[styles.sendButton, isDisabled && styles.sendButtonDisabled]}
        accessibilityRole="button"
        accessibilityLabel="Send message"
        accessibilityState={{ disabled: isDisabled }}
      >
        {isSubmitting ? (
          <ActivityIndicator size="small" color="#A1A1AA" />
        ) : (
          <Ionicons 
            name="arrow-up-circle" 
            size={32} 
            color={isDisabled ? '#3F3F46' : '#2563EB'} 
          />
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    backgroundColor: '#0A0B0E',
  },
  input: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    color: '#FFFFFF',
    fontSize: 16,
    marginRight: 12,
  },
  sendButton: {
    width: 32,
    height: 32,
    marginBottom: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.8,
  },
});
