import { Text, View } from 'react-native';
import { Button } from '@clover/ui';

export default function Index() {
  return (
    <View className="flex-1 items-center justify-center bg-background">
      <Text className="text-2xl font-bold mb-4 text-primary">Storybook</Text>
      <Text className="text-base mb-8 text-secondary">Component development environment</Text>
      <Button variant="primary" size="md">
        Get Started
      </Button>
    </View>
  );
}