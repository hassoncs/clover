import { useState } from "react";
import { View, Text, Modal, Pressable, ScrollView, TextInput, TouchableOpacity, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { trpcReact } from "@/lib/trpc/react";
import { tokens } from "@slopcade/theme";

interface BuySparksModalProps {
  visible: boolean;
  onClose: () => void;
}

interface SparkPack {
  id: string;
  name: string;
  sparks: number;
  price: string;
  generations: string;
  popular?: boolean;
}

const SPARK_PACKS: SparkPack[] = [
  { id: "quick", name: "Quick Start", sparks: 1000, price: "$0.99", generations: "~10 assets" },
  { id: "starter", name: "Starter Pack", sparks: 5000, price: "$4.99", generations: "~50 assets" },
  { id: "creator", name: "Creator Pack", sparks: 12000, price: "$9.99", generations: "~120 assets", popular: true },
  { id: "pro", name: "Pro Pack", sparks: 30000, price: "$24.99", generations: "~300 assets" },
  { id: "studio", name: "Studio Pack", sparks: 100000, price: "$79.99", generations: "~1000 assets" },
];

export function BuySparksModal({ visible, onClose }: BuySparksModalProps) {
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

  const handlePurchasePack = (pack: SparkPack) => {
    console.log("Purchase pack:", pack.id);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView className="flex-1 bg-theme-background">
        <View className="flex-row justify-between items-center px-4 py-3 border-b border-theme-border">
          <Text className="text-xl font-bold text-theme-text">Buy Sparks ⚡</Text>
          <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close">
            <Text className="text-theme-text-secondary text-lg">✕</Text>
          </Pressable>
        </View>

        <ScrollView className="flex-1">
          <View className="p-4">
            <Text className="text-theme-text-secondary text-center mb-2">
              Sparks power AI asset generation
            </Text>
            <Text className="text-theme-text-tertiary text-center text-sm mb-6">
              Generate sprites, backgrounds, and game assets
            </Text>

            {SPARK_PACKS.map((pack) => (
              <Pressable
                key={pack.id}
                className={`bg-theme-surface-elevated border rounded-xl p-4 mb-3 active:opacity-80 ${
                  pack.popular ? "border-theme-warning" : "border-theme-border"
                }`}
                onPress={() => handlePurchasePack(pack)}
                accessibilityRole="button"
                accessibilityLabel={`Buy ${pack.name}, ${pack.sparks} sparks for ${pack.price}`}
              >
                {pack.popular && (
                  <View className="absolute -top-2 left-1/2 -ml-12 bg-theme-warning px-3 py-1 rounded-full">
                    <Text className="text-theme-text-inverse text-xs font-bold">BEST VALUE</Text>
                  </View>
                )}
                
                <View className="flex-row items-center justify-between">
                  <View className="flex-1">
                    <Text className="text-theme-text font-bold text-lg">{pack.name}</Text>
                    <View className="flex-row items-baseline mt-1">
                      <Text className="text-theme-warning font-bold text-2xl">{pack.sparks.toLocaleString()}</Text>
                      <Text className="text-theme-text-secondary ml-1">sparks</Text>
                    </View>
                    <Text className="text-theme-text-tertiary text-sm mt-1">{pack.generations}</Text>
                  </View>
                  
                  <View className="bg-theme-warning px-6 py-3 rounded-lg">
                    <Text className="text-theme-text-inverse font-bold text-lg">{pack.price}</Text>
                  </View>
                </View>
              </Pressable>
            ))}

            <View className="mt-6 bg-theme-surface-elevated/50 p-4 rounded-xl border border-theme-border">
              <Text className="text-theme-text font-semibold mb-3">Have a Promo Code?</Text>
              
              <View className="flex-row gap-2">
                <TextInput
                  className="flex-1 bg-theme-surface border border-theme-border rounded-xl px-4 py-3 text-theme-text"
                  placeholder="Enter promo code"
                  placeholderTextColor={tokens.colors.text.tertiary}
                  value={promoCode}
                  onChangeText={(text) => {
                    setPromoCode(text.toUpperCase());
                    setPromoMessage(null);
                  }}
                  autoCapitalize="characters"
                  editable={!redeemPromoMutation.isPending}
                  accessibilityLabel="Promo code input"
                />
                <TouchableOpacity
                  className={`bg-theme-warning px-4 py-3 rounded-xl justify-center items-center ${
                    redeemPromoMutation.isPending || !promoCode.trim() ? 'opacity-50' : ''
                  }`}
                  onPress={handleRedeemPromo}
                  disabled={redeemPromoMutation.isPending || !promoCode.trim()}
                  accessibilityRole="button"
                  accessibilityLabel="Redeem promo code"
                  accessibilityState={{ disabled: redeemPromoMutation.isPending || !promoCode.trim() }}
                >
                  {redeemPromoMutation.isPending ? (
                    <ActivityIndicator color={tokens.colors.text.inverse} size="small" />
                  ) : (
                    <Text className="text-theme-text-inverse font-bold">Redeem</Text>
                  )}
                </TouchableOpacity>
              </View>

              {promoMessage && (
                <Text className={`mt-2 text-sm ${promoMessage.type === 'success' ? 'text-theme-success' : 'text-theme-error'}`}>
                  {promoMessage.text}
                </Text>
              )}
            </View>

            <View className="mt-6 p-4 bg-theme-surface-elevated/30 rounded-xl">
              <Text className="text-theme-text-tertiary text-center text-xs">
                Sparks are used for AI generation costs.
                {'\n'}1 Spark ≈ $0.001 of compute
                {'\n'}Purchases are processed securely through your app store.
              </Text>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}
