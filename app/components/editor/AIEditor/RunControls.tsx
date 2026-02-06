import { View, Pressable, Text, ActivityIndicator } from 'react-native';
import type { AgentRunStatus } from '@slopcade/shared';

interface RunControlsProps {
  status: AgentRunStatus;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onCancel: () => void;
  isProcessing: boolean;
  isStartDisabled?: boolean;
}

export function RunControls({ status, onStart, onPause, onResume, onCancel, isProcessing, isStartDisabled }: RunControlsProps) {
  if (status === 'succeeded' || status === 'failed' || status === 'canceled') {
    return null;
  }

  return (
    <View className="flex-row gap-2 mt-4">
      {status === 'planning' && (
        <Pressable
          onPress={onStart}
          disabled={isProcessing || isStartDisabled}
          className={`flex-1 py-3 rounded-lg items-center justify-center ${isProcessing || isStartDisabled ? 'bg-gray-700 opacity-50' : 'bg-green-600'}`}
        >
          {isProcessing ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className={`font-bold ${isStartDisabled ? 'text-gray-400' : 'text-white'}`}>
              {isStartDisabled ? 'Complete Requirements to Start' : 'Confirm and Start Build'}
            </Text>
          )}
        </Pressable>
      )}

      {status === 'running' && (
        <Pressable
          onPress={onPause}
          disabled={isProcessing}
          className="flex-1 bg-yellow-600 py-3 rounded-lg items-center justify-center"
        >
          <Text className="text-white font-bold">Pause</Text>
        </Pressable>
      )}

      {status === 'paused' && (
        <Pressable
          onPress={onResume}
          disabled={isProcessing}
          className="flex-1 bg-green-600 py-3 rounded-lg items-center justify-center"
        >
          <Text className="text-white font-bold">Resume</Text>
        </Pressable>
      )}

      {(status === 'running' || status === 'paused' || status === 'queued') && (
        <Pressable
          onPress={onCancel}
          disabled={isProcessing}
          className="bg-red-900/50 border border-red-800 px-4 rounded-lg items-center justify-center"
        >
          <Text className="text-red-400 font-bold">Cancel</Text>
        </Pressable>
      )}
    </View>
  );
}
