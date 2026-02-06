import { View, Text } from 'react-native';
import { microsToSparks } from '@slopcade/shared';

interface CostDisplayProps {
  estimatedCostMicros?: number | null;
  actualCostMicros?: number;
  reservedMicros?: number;
  isFinished?: boolean;
}

export function CostDisplay({ estimatedCostMicros, actualCostMicros, reservedMicros, isFinished }: CostDisplayProps) {
  if (isFinished) {
    return (
      <View className="bg-gray-800 p-3 rounded-lg border border-gray-700">
        <Text className="text-gray-400 text-xs uppercase font-bold">Total Cost</Text>
        <View className="flex-row items-baseline gap-2">
          <Text className="text-yellow-400 font-bold text-xl">
            {microsToSparks(actualCostMicros ?? 0)} ⚡
          </Text>
          {reservedMicros && reservedMicros > (actualCostMicros ?? 0) && (
            <Text className="text-green-400 text-xs">
              ({microsToSparks(reservedMicros - (actualCostMicros ?? 0))} returned)
            </Text>
          )}
        </View>
      </View>
    );
  }

  if (actualCostMicros !== undefined && actualCostMicros > 0) {
    return (
      <View className="bg-gray-800 p-3 rounded-lg border border-gray-700">
        <Text className="text-gray-400 text-xs uppercase font-bold">Current Cost</Text>
        <View className="flex-row items-baseline gap-2">
          <Text className="text-yellow-400 font-bold text-xl">
            {microsToSparks(actualCostMicros)} ⚡
          </Text>
          <Text className="text-gray-500 text-xs">
            / {microsToSparks(reservedMicros ?? 0)} reserved
          </Text>
        </View>
      </View>
    );
  }

  if (estimatedCostMicros) {
    return (
      <View className="bg-gray-800 p-3 rounded-lg border border-gray-700">
        <Text className="text-gray-400 text-xs uppercase font-bold">Estimated Cost</Text>
        <Text className="text-yellow-400 font-bold text-xl">
          {microsToSparks(estimatedCostMicros)} ⚡
        </Text>
      </View>
    );
  }

  return null;
}
