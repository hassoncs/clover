import React, { useState, useCallback } from 'react';
import { View, TextInput, Pressable, StyleSheet, ActivityIndicator, Platform, type NativeSyntheticEvent, type TextInputKeyPressEventData } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  onSend: (text: string) => void;
  isSubmitting: boolean;
}

export function Composer({ onSend, isSubmitting }: Props) {
  const [text, setText] = useState('');

  const handleSend = useCallback(() => {
    if (!text.trim() || isSubmitting) return;
    onSend(text.trim());
    setText('');
  }, [text, isSubmitting, onSend]);

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
      <TextInput
        style={styles.input}
        value={text}
        onChangeText={setText}
        placeholder="Describe what you'd like to create..."
        placeholderTextColor="#71717A"
        multiline
        maxLength={1000}
        onKeyPress={handleKeyPress}
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
    minHeight: 40,
    maxHeight: 120,
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
