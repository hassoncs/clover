import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator } from "react-native";
import { trpcReact } from "@/lib/trpc/react";

export function PromoCodeInput() {
  const [code, setCode] = useState("");
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const redeemMutation = trpcReact.economy.redeemPromoCode.useMutation({
    onSuccess: (data) => {
      if ('alreadyRedeemed' in data && data.alreadyRedeemed) {
        setMessage({ text: data.message, type: "error" });
      } else {
        setMessage({ text: data.message, type: "success" });
        setCode("");
      }
    },
    onError: (error) => {
      setMessage({ text: error.message, type: "error" });
    },
  });

  const handleRedeem = () => {
    if (!code.trim()) return;
    setMessage(null);
    redeemMutation.mutate({ code: code.trim() });
  };

  return (
    <View className="bg-gray-100 p-4 rounded-lg">
      <Text className="text-lg font-bold mb-2 text-gray-800">Redeem Promo Code</Text>
      
      <View className="flex-row gap-2">
        <TextInput
          className="flex-1 bg-white border border-gray-300 rounded px-3 py-2 text-gray-800"
          placeholder="Enter code"
          value={code}
          onChangeText={(text) => setCode(text.toUpperCase())}
          autoCapitalize="characters"
          editable={!redeemMutation.isPending}
        />
        <TouchableOpacity
          className={`bg-amber-500 px-4 py-2 rounded justify-center items-center ${redeemMutation.isPending ? 'opacity-50' : ''}`}
          onPress={handleRedeem}
          disabled={redeemMutation.isPending || !code.trim()}
        >
          {redeemMutation.isPending ? (
            <ActivityIndicator color="white" size="small" />
          ) : (
            <Text className="text-white font-bold">Redeem</Text>
          )}
        </TouchableOpacity>
      </View>

      {message && (
        <Text className={`mt-2 text-sm ${message.type === 'success' ? 'text-green-600' : 'text-red-500'}`}>
          {message.text}
        </Text>
      )}
    </View>
  );
}
