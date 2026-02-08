import React, { useCallback, useRef, useEffect } from 'react';
import { FlatList, StyleSheet, View, Text, NativeSyntheticEvent, NativeScrollEvent, Animated, LayoutAnimation, Platform, UIManager } from 'react-native';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}
import { ChatMessage } from './ChatMessage';
import { ChatMessage as ChatMessageModel } from './types';

interface Props {
  messages: ChatMessageModel[];
  onSubmitUserAnswer?: (batchId: string, answers: string[][]) => void;
  onSubmitClarification?: (questionId: string, answer: string) => void;
  onRetry?: () => void;
  isRunning?: boolean;
  hasPendingQuestion?: boolean;
}

const SCROLL_THRESHOLD = 100;

function TypingIndicator() {
  const opacity1 = useRef(new Animated.Value(0.3)).current;
  const opacity2 = useRef(new Animated.Value(0.3)).current;
  const opacity3 = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animate = (anim: Animated.Value, delay: number) => {
      Animated.sequence([
        Animated.delay(delay),
        Animated.loop(
          Animated.sequence([
            Animated.timing(anim, {
              toValue: 1,
              duration: 400,
              useNativeDriver: true,
            }),
            Animated.timing(anim, {
              toValue: 0.3,
              duration: 400,
              useNativeDriver: true,
            }),
          ])
        ),
      ]).start();
    };

    animate(opacity1, 0);
    animate(opacity2, 200);
    animate(opacity3, 400);
  }, [opacity1, opacity2, opacity3]);

  return (
    <View style={styles.typingContainer}>
      <Animated.View style={[styles.dot, { opacity: opacity1 }]} />
      <Animated.View style={[styles.dot, { opacity: opacity2 }]} />
      <Animated.View style={[styles.dot, { opacity: opacity3 }]} />
      <Text style={styles.typingText}>Building your game...</Text>
    </View>
  );
}

const MAINTAIN_POSITION = { minIndexForVisible: 0 };

export function ChatTimeline({ messages, onSubmitUserAnswer, onSubmitClarification, onRetry, isRunning, hasPendingQuestion }: Props) {
  const listRef = useRef<FlatList>(null);
  const isNearBottom = useRef(true);
  const prevMessageCount = useRef(messages.length);
  const scrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (messages.length !== prevMessageCount.current) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      prevMessageCount.current = messages.length;
    }
  }, [messages.length]);

  const handleScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, layoutMeasurement, contentSize } = e.nativeEvent;
    isNearBottom.current = contentOffset.y + layoutMeasurement.height >= contentSize.height - SCROLL_THRESHOLD;
  }, []);

  const handleContentSizeChange = useCallback(() => {
    if (!isNearBottom.current) return;
    if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
    scrollTimerRef.current = setTimeout(() => {
      listRef.current?.scrollToEnd({ animated: true });
    }, 50);
  }, []);

  return (
    <FlatList
      ref={listRef}
      data={messages}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <ChatMessage 
          message={item} 
          onSubmitUserAnswer={onSubmitUserAnswer}
          onSubmitClarification={onSubmitClarification}
          onRetry={onRetry}
        />
      )}
      contentContainerStyle={styles.content}
      onScroll={handleScroll}
      scrollEventThrottle={16}
      onContentSizeChange={handleContentSizeChange}
      maintainVisibleContentPosition={MAINTAIN_POSITION}
      keyboardShouldPersistTaps="handled"
      ListEmptyComponent={
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Describe your dream game...</Text>
          <Text style={styles.emptySubtext}>
            &quot;A platformer where you play as a slice of toast&quot;
          </Text>
        </View>
      }
      ListFooterComponent={
        isRunning && !hasPendingQuestion ? <TypingIndicator /> : null
      }
    />
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
    flexGrow: 1,
  },
  typingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    alignSelf: 'flex-start',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#A1A1AA',
    marginRight: 4,
  },
  typingText: {
    fontSize: 13,
    color: '#71717A',
    marginLeft: 8,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
    opacity: 0.5,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#A1A1AA',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#71717A',
    fontStyle: 'italic',
  },
});
