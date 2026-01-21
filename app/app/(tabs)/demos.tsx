import { Link } from "expo-router";
import { Text, FlatList, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const EXAMPLES = [
  {
    id: "box2d",
    title: "Falling Boxes (Box2D)",
    description: "Basic rigid bodies and colliders falling under gravity.",
    route: "/examples/box2d",
  },
  {
    id: "pendulum",
    title: "Pendulum (Joints)",
    description: "Revolute joints and chain physics.",
    route: "/examples/pendulum",
  },
  {
    id: "interaction",
    title: "Interaction",
    description: "Touch to spawn and move objects.",
    route: "/examples/interaction",
  },
  {
    id: "bridge",
    title: "Bridge",
    description: "Chain of bodies connected by joints.",
    route: "/examples/bridge",
  },
  {
    id: "car",
    title: "Car",
    description: "Vehicle with motors and terrain.",
    route: "/examples/car",
  },
  {
    id: "avalanche",
    title: "Avalanche",
    description: "Stress test with 150+ bodies.",
    route: "/examples/avalanche",
  },
  {
    id: "newtons_cradle",
    title: "Newton's Cradle",
    description: "Restitution and momentum conservation.",
    route: "/examples/newtons_cradle",
  },
  {
    id: "dominoes",
    title: "Dominoes",
    description: "Stacking stability and chain reaction.",
    route: "/examples/dominoes",
  },
];

export default function DemosScreen() {
  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["bottom"]}>
      <FlatList
        data={EXAMPLES}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16 }}
        ListHeaderComponent={
          <Text className="text-gray-600 mb-4">
            Low-level physics demos using React Native Box2D + Skia.
          </Text>
        }
        renderItem={({ item }) => (
          <Link href={item.route as any} asChild>
            <Pressable className="bg-white p-4 rounded-xl border border-gray-200 mb-3 active:bg-gray-100">
              <Text className="text-lg font-semibold text-gray-800">
                {item.title}
              </Text>
              <Text className="text-gray-500 mt-1">{item.description}</Text>
            </Pressable>
          </Link>
        )}
      />
    </SafeAreaView>
  );
}
