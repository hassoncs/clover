import { Link } from "expo-router";
import { Text, FlatList, Pressable, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { EXAMPLES } from "@/lib/registry/generated/examples";

export default function DemosScreen() {
  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["bottom"]}>
      <FlatList
        data={EXAMPLES}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.container}
        ListHeaderComponent={
          <Text className="text-gray-600 mb-4">
            Godot physics experiments for development testing.
          </Text>
        }
        renderItem={({ item }) => (
          <Link href={item.href} asChild>
            <Pressable className="bg-white p-4 rounded-xl border border-gray-200 mb-3 active:bg-gray-100">
              <Text className="text-lg font-semibold text-gray-800">
                {item.meta.title}
              </Text>
              <Text className="text-gray-500 mt-1">{item.meta.description}</Text>
            </Pressable>
          </Link>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
});
