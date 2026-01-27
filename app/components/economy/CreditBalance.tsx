import { View, Text, Pressable } from "react-native";
import { trpcReact } from "@/lib/trpc/react";

interface CreditBalanceProps {
  onPress?: () => void;
}

export function CreditBalance({ onPress }: CreditBalanceProps) {
  const { data, isLoading } = trpcReact.economy.getBalance.useQuery(undefined, {
    refetchInterval: 30000,
  });

  const content = (
    <View className="flex-row items-center bg-amber-100 rounded-full px-3 py-1 border border-amber-200">
      <Text className="text-sm">⚡</Text>
      <Text className="text-amber-700 font-bold text-sm ml-1">
        {isLoading ? "..." : data?.balanceSparks.toLocaleString() ?? "0"}
      </Text>
    </View>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} className="active:opacity-80">
        {content}
      </Pressable>
    );
  }

  return content;
}
