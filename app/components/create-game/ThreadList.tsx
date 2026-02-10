import { View, Text, Pressable, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Thread {
  id: string;
  title: string | null;
  updatedAt: number;
}

interface Props {
  threads: Thread[];
  activeThreadId: string | null;
  onSelect: (threadId: string) => void;
  onCreateNew: () => void;
  isLoading: boolean;
}

export function ThreadList({ threads, activeThreadId, onSelect, onCreateNew, isLoading }: Props) {
  return (
    <View style={styles.container}>
      <Pressable style={styles.newChatButton} onPress={onCreateNew}>
        <Ionicons name="add" size={16} color="#FFFFFF" />
        <Text style={styles.newChatText}>New Chat</Text>
      </Pressable>
      {isLoading && threads.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color="#6366F1" />
        </View>
      ) : (
        <FlatList
          data={threads}
          keyExtractor={item => item.id}
          renderItem={({ item, index }) => (
            <Pressable
              style={[styles.threadItem, item.id === activeThreadId && styles.threadItemActive]}
              onPress={() => onSelect(item.id)}
            >
              <Text style={[styles.threadTitle, item.id === activeThreadId && styles.threadTitleActive]} numberOfLines={1}>
                {item.title || `Chat ${threads.length - index}`}
              </Text>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 200,
    backgroundColor: '#0D0E12',
    borderRightWidth: 1,
    borderRightColor: 'rgba(255,255,255,0.08)',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  newChatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    margin: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#6366F1',
    borderRadius: 8,
  },
  newChatText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  threadItem: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginHorizontal: 8,
    borderRadius: 6,
  },
  threadItemActive: {
    backgroundColor: 'rgba(99,102,241,0.15)',
  },
  threadTitle: {
    color: '#9CA3AF',
    fontSize: 13,
  },
  threadTitleActive: {
    color: '#FFFFFF',
  },
});
