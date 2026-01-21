import { registerRootComponent } from 'expo';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

function StorybookRoot() {
  if (process.env.STORYBOOK_ENABLED === 'true') {
    return (
      <SafeAreaProvider>
        <GestureHandlerRootView style={{ flex: 1 }}>
        </GestureHandlerRootView>
      </SafeAreaProvider>
    );
  }
  
  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}

registerRootComponent(StorybookRoot);