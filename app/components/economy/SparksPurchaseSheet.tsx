import React from "react";
import { View, Text, Modal, Pressable, ActivityIndicator, ScrollView } from "react-native";
import { trpcReact } from "@/lib/trpc/react";

interface SparksPurchaseSheetProps {
  visible: boolean;
  onClose: () => void;
}

export function SparksPurchaseSheet({ visible, onClose }: SparksPurchaseSheetProps) {
  const { data: products, isLoading, error } = trpcReact.economy.getProducts.useQuery();

  const handlePurchase = (productId: string) => {
    // Placeholder for RevenueCat integration
    console.log(`Initiating purchase for ${productId}`);
    alert("Purchase flow coming soon!");
  };

  const handleRestore = () => {
    // Placeholder for restore purchases
    console.log("Restoring purchases");
    alert("Restore purchases coming soon!");
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-end bg-black/80">
        <View className="bg-gray-900 rounded-t-3xl p-6 w-full border-t border-gray-800 h-[80%]">
          <View className="flex-row justify-between items-center mb-6">
            <View>
              <Text className="text-2xl font-bold text-white">Get Sparks</Text>
              <Text className="text-gray-400 text-sm">Power your creativity</Text>
            </View>
            <Pressable
              onPress={onClose}
              className="bg-gray-800 p-2 rounded-full w-10 h-10 items-center justify-center active:bg-gray-700"
            >
              <Text className="text-white font-bold text-lg">✕</Text>
            </Pressable>
          </View>

          {isLoading ? (
            <View className="flex-1 justify-center items-center">
              <ActivityIndicator size="large" color="#F59E0B" />
            </View>
          ) : error ? (
            <View className="flex-1 justify-center items-center">
              <Text className="text-red-400 mb-4">Failed to load products</Text>
              <Pressable
                className="bg-gray-800 px-4 py-2 rounded-lg"
                onPress={onClose}
              >
                <Text className="text-white">Close</Text>
              </Pressable>
            </View>
          ) : (
            <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
              <View className="gap-4 pb-8">
                {products?.map((product) => {
                  const sparks = Math.floor(product.creditAmountMicros / 1000);
                  const bonusPercent = product.bonusPercent ?? 0;
                  const isBestValue = bonusPercent >= 20;
                  const price = `$${(product.priceCents / 100).toFixed(2)}`;

                  return (
                    <View
                      key={product.id}
                      className={`bg-gray-800 rounded-2xl p-4 border ${
                        isBestValue ? "border-amber-500/50" : "border-gray-700"
                      }`}
                    >
                      {isBestValue && (
                        <View className="absolute -top-3 right-4 bg-amber-500 px-3 py-1 rounded-full">
                          <Text className="text-black text-xs font-bold">
                            BEST VALUE
                          </Text>
                        </View>
                      )}

                      <View className="flex-row justify-between items-center mb-2">
                        <View>
                          <Text className="text-white font-bold text-lg">
                            {product.name}
                          </Text>
                          {bonusPercent > 0 && (
                            <Text className="text-amber-400 text-xs font-bold">
                              +{bonusPercent}% BONUS
                            </Text>
                          )}
                        </View>
                        <View className="items-end">
                          <Text className="text-3xl font-bold text-white">
                            {sparks.toLocaleString()}
                          </Text>
                          <Text className="text-amber-500 font-bold text-sm">
                            SPARKS ⚡
                          </Text>
                        </View>
                      </View>

                      <Pressable
                        className={`w-full py-3 rounded-xl items-center mt-2 ${
                          isBestValue
                            ? "bg-amber-500 active:bg-amber-600"
                            : "bg-gray-700 active:bg-gray-600"
                        }`}
                        onPress={() => handlePurchase(product.id)}
                      >
                        <Text
                          className={`font-bold text-lg ${
                            isBestValue ? "text-black" : "text-white"
                          }`}
                        >
                          {price}
                        </Text>
                      </Pressable>
                    </View>
                  );
                })}
              </View>

              <Pressable
                className="items-center py-4 mb-8"
                onPress={handleRestore}
              >
                <Text className="text-gray-500 text-sm underline">
                  Restore Purchases
                </Text>
              </Pressable>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}
