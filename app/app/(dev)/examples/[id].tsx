import { Suspense, useMemo } from "react";
import { View, Text, Pressable, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { EXAMPLES_BY_ID, getExampleComponent, type ExampleId } from "@/lib/registry/generated/examples";

export default function ExampleScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  
  const entry = useMemo(
    () => (id && id in EXAMPLES_BY_ID ? EXAMPLES_BY_ID[id as ExampleId] : undefined),
    [id]
  );

  if (!entry) {
    return (
      <SafeAreaView className="flex-1 bg-gray-900 items-center justify-center p-6">
        <Text className="text-red-400 text-center text-lg">Unknown example: {id}</Text>
        <Pressable 
          className="mt-6 py-3 px-6 bg-gray-700 rounded-lg" 
          onPress={() => router.back()}
        >
          <Text className="text-white font-semibold">← Go Back</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const ExampleComponent = getExampleComponent(entry.id);

  return (
    <Suspense
      fallback={
        <SafeAreaView className="flex-1 bg-gray-900 items-center justify-center">
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text className="text-white mt-4">Loading {entry.meta.title}...</Text>
        </SafeAreaView>
      }
    >
      <ExampleComponent />
    </Suspense>
  );
}
