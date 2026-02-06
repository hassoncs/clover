import { View, Text, Pressable } from 'react-native';
import type { AgentTier } from '@slopcade/shared';

interface TierSelectorProps {
  selectedTier: AgentTier;
  onSelect: (tier: AgentTier) => void;
}

const TIERS: { id: AgentTier; name: string; cost: string; description: string }[] = [
  { id: 'free', name: 'Free', cost: '0 ⚡', description: 'Basic generation, slower speed' },
  { id: 'standard', name: 'Standard', cost: '50 ⚡', description: 'Better quality, faster speed' },
  { id: 'pro', name: 'Pro', cost: '100 ⚡', description: 'Best quality, priority access' },
];

export function TierSelector({ selectedTier, onSelect }: TierSelectorProps) {
  return (
    <View className="flex-row gap-4">
      {TIERS.map((tier) => (
        <Pressable
          key={tier.id}
          onPress={() => onSelect(tier.id)}
          className={`flex-1 p-4 rounded-lg border-2 ${
            selectedTier === tier.id
              ? 'border-blue-500 bg-blue-500/10'
              : 'border-gray-700 bg-gray-800'
          }`}
        >
          <Text className={`font-bold text-lg ${selectedTier === tier.id ? 'text-blue-400' : 'text-gray-200'}`}>
            {tier.name}
          </Text>
          <Text className="text-yellow-400 font-medium mt-1">{tier.cost}</Text>
          <Text className="text-gray-400 text-xs mt-2">{tier.description}</Text>
        </Pressable>
      ))}
    </View>
  );
}
