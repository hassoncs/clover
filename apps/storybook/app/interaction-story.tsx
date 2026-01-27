import { Text, View } from 'react-native';
import { Interaction } from '@slopcade/physics';

export default function InteractionStory() {
  return (
    <View style={{ flex: 1 }}>
      <Text className="text-lg font-bold mb-4 text-center text-primary">
        Physics Interaction Component
      </Text>
      <Interaction />
    </View>
  );
}