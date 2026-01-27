import { View, Text, ActivityIndicator } from 'react-native';
import { trpcReact } from '@/lib/trpc/react';
import { microsToSparks } from '@slopcade/shared';

interface CostPreviewProps {
  gameId: string;
  regenerateAll?: boolean;
  specificTemplates?: string[];
}

export function CostPreview({ gameId, regenerateAll, specificTemplates }: CostPreviewProps) {
  const { data, isLoading, error } = trpcReact.economy.estimateCost.useQuery({
    gameId,
    regenerateAll,
    specificTemplates,
  });

  if (isLoading) {
    return (
      <View className="bg-gray-100 p-6 rounded-lg items-center justify-center">
        <ActivityIndicator size="small" color="#666" />
        <Text className="text-gray-500 mt-2 text-sm">Estimating cost...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View className="bg-red-50 p-4 rounded-lg border border-red-100">
        <Text className="text-red-600 text-center">Failed to load cost estimate</Text>
      </View>
    );
  }

  if (!data) return null;

  return (
    <View className="bg-gray-100 p-4 rounded-lg shadow-sm">
      <Text className="text-lg font-bold mb-3 text-gray-800">
        Cost: {data.totalSparks} ⚡
      </Text>

      <View className="mb-3">
        {data.breakdown.map((item) => (
          <View key={item.description} className="flex-row justify-between mb-1">
            <Text className="text-gray-600 text-sm flex-1">
              {item.description} {item.count > 1 && `(x${item.count})`}
            </Text>
            <Text className={`text-sm font-medium ${item.totalMicros < 0 ? 'text-green-600' : 'text-gray-700'}`}>
              {item.totalMicros < 0 ? '-' : ''}{microsToSparks(Math.abs(item.totalMicros))} ⚡
            </Text>
          </View>
        ))}
      </View>

      <View className="h-[1px] bg-gray-300 my-2" />

      <View className="flex-row justify-between items-center">
        <Text className="text-gray-700 font-medium">Your Balance:</Text>
        <Text className={`font-bold ${data.canAfford ? 'text-green-600' : 'text-red-600'}`}>
          {data.currentBalanceSparks} ⚡
        </Text>
      </View>

      {!data.canAfford && (
        <View className="mt-3 bg-red-50 p-2 rounded border border-red-100">
          <Text className="text-red-600 text-center text-sm font-medium">
            Need {data.shortfallSparks} more Sparks
          </Text>
        </View>
      )}
    </View>
  );
}
