import { useState } from "react";
import { View, Text, Modal, Pressable, ScrollView, TextInput, TouchableOpacity, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { trpcReact } from "@/lib/trpc/react";

interface BuyGemsModalProps {
  visible: boolean;
  onClose: () => void;
}

interface GemPack {
  id: string;
  name: string;
  gems: number;
  price: string;
  bonus?: string;
  popular?: boolean;
}

const GEM_PACKS: GemPack[] = [
  { id: "starter", name: "Starter Pack", gems: 100, price: "$0.99" },
  { id: "basic", name: "Basic Pack", gems: 500, price: "$4.99" },
  { id: "popular", name: "Popular Pack", gems: 1200, price: "$9.99", bonus: "+200 bonus", popular: true },
  { id: "mega", name: "Mega Pack", gems: 2500, price: "$19.99", bonus: "+500 bonus" },
  { id: "ultimate", name: "Ultimate Pack", gems: 6000, price: "$49.99", bonus: "+1500 bonus" },
];

export function BuyGemsModal({ visible, onClose }: BuyGemsModalProps) {
  const [promoCode, setPromoCode] = useState("");
  const [promoMessage, setPromoMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const redeemPromoMutation = trpcReact.economy.redeemPromoCode.useMutation({
    onSuccess: (data) => {
      if ('alreadyRedeemed' in data && data.alreadyRedeemed) {
        setPromoMessage({ text: data.message, type: "error" });
      } else {
        setPromoMessage({ text: data.message, type: "success" });
        setPromoCode("");
      }
    },
    onError: (error) => {
      setPromoMessage({ text: error.message, type: "error" });
    },
  });

  const handleRedeemPromo = () => {
    if (!promoCode.trim()) return;
    setPromoMessage(null);
    redeemPromoMutation.mutate({ code: promoCode.trim() });
  };

  const handlePurchasePack = (pack: GemPack) => {
    console.log("Purchase pack:", pack.id);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView className="flex-1 bg-gray-900">
        <View className="flex-row justify-between items-center px-4 py-3 border-b border-gray-700">
          <Text className="text-xl font-bold text-white">Buy Gems 💎</Text>
          <Pressable onPress={onClose}>
            <Text className="text-gray-400 text-lg">✕</Text>
          </Pressable>
        </View>

        <ScrollView className="flex-1">
          <View className="p-4">
            <Text className="text-gray-400 text-center mb-6">
              Premium currency for exclusive items, boosts, and cosmetics
            </Text>

            {GEM_PACKS.map((pack) => (
              <Pressable
                key={pack.id}
                className={`bg-gray-800 border rounded-xl p-4 mb-3 active:bg-gray-700 ${
                  pack.popular ? "border-purple-500" : "border-gray-700"
                }`}
                onPress={() => handlePurchasePack(pack)}
              >
                {pack.popular && (
                  <View className="absolute -top-2 left-1/2 -ml-12 bg-purple-600 px-3 py-1 rounded-full">
                    <Text className="text-white text-xs font-bold">POPULAR</Text>
                  </View>
                )}
                
                <View className="flex-row items-center justify-between">
                  <View className="flex-1">
                    <Text className="text-white font-bold text-lg">{pack.name}</Text>
                    <View className="flex-row items-baseline mt-1">
                      <Text className="text-purple-400 font-bold text-2xl">{pack.gems}</Text>
                      <Text className="text-gray-400 ml-1">gems</Text>
                      {pack.bonus && (
                        <View className="bg-green-900/50 px-2 py-0.5 rounded-full ml-2">
                          <Text className="text-green-400 text-xs font-bold">{pack.bonus}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                  
                  <View className="bg-purple-600 px-6 py-3 rounded-lg">
                    <Text className="text-white font-bold text-lg">{pack.price}</Text>
                  </View>
                </View>
              </Pressable>
            ))}

            <View className="mt-6 bg-gray-800/50 p-4 rounded-xl border border-gray-700">
              <Text className="text-white font-semibold mb-3">Have a Promo Code?</Text>
              
              <View className="flex-row gap-2">
                <TextInput
                  className="flex-1 bg-gray-800 border border-gray-600 rounded-xl px-4 py-3 text-white"
                  placeholder="Enter promo code"
                  placeholderTextColor="#666"
                  value={promoCode}
                  onChangeText={(text) => {
                    setPromoCode(text.toUpperCase());
                    setPromoMessage(null);
                  }}
                  autoCapitalize="characters"
                  editable={!redeemPromoMutation.isPending}
                />
                <TouchableOpacity
                  className={`bg-amber-500 px-4 py-3 rounded-xl justify-center items-center ${
                    redeemPromoMutation.isPending || !promoCode.trim() ? 'opacity-50' : ''
                  }`}
                  onPress={handleRedeemPromo}
                  disabled={redeemPromoMutation.isPending || !promoCode.trim()}
                >
                  {redeemPromoMutation.isPending ? (
                    <ActivityIndicator color="white" size="small" />
                  ) : (
                    <Text className="text-white font-bold">Redeem</Text>
                  )}
                </TouchableOpacity>
              </View>

              {promoMessage && (
                <Text className={`mt-2 text-sm ${promoMessage.type === 'success' ? 'text-green-400' : 'text-red-400'}`}>
                  {promoMessage.text}
                </Text>
              )}
            </View>

            <View className="mt-6 p-4 bg-gray-800/30 rounded-xl">
              <Text className="text-gray-400 text-center text-xs">
                Gems are premium currency used for exclusive content.
                {'\n'}Purchases are processed securely through your app store.
              </Text>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}
