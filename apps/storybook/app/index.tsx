import { Text, View } from 'react-native';
import { Button } from '@slopcade/ui';

export default function Index() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 16 }}>Storybook</Text>
      <Text style={{ fontSize: 16, marginBottom: 32 }}>Component development environment</Text>
      <Button variant="default" size="default" label="Get Started" />
    </View>
  );
}