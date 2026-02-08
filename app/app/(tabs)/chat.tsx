import { View, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ChatScreen() {
  return (
    <SafeAreaView className="flex-1 bg-black" edges={["bottom"]}>
      <View className="flex-1 items-center justify-center px-6">
        <Text className="text-5xl mb-4">💬</Text>
        <Text className="text-zinc-100 text-2xl font-bold text-center">
          Game Maker Chat
        </Text>
        <Text className="text-zinc-500 text-base text-center mt-3">
          Chat with AI to create and iterate on games. Coming soon.
        </Text>
      </View>
    </SafeAreaView>
  );
}
