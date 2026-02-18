import React from "react";
import { View, Text, Modal, Pressable, ActivityIndicator, ScrollView } from "react-native";
import { trpcReact } from "@/lib/trpc/react";
import { tokens } from "@slopcade/theme";

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
        <View className="bg-theme-surface rounded-t-3xl p-6 w-full border-t border-theme-border h-[80%]">
          <View className="flex-row justify-between items-center mb-6">
            <View>
              <Text className="text-2xl font-bold text-theme-text">Get Sparks</Text>
              <Text className="text-theme-text-secondary text-sm">Power your creativity</Text>
            </View>
            <Pressable
              onPress={onClose}
              className="bg-theme-surface-elevated p-2 rounded-full w-10 h-10 items-center justify-center active:opacity-80"
              accessibilityRole="button"
              accessibilityLabel="Close"
            >
              <Text className="text-theme-text font-bold text-lg">✕</Text>
            </Pressable>
          </View>

          {isLoading ? (
            <View className="flex-1 justify-center items-center">
              <ActivityIndicator size="large" color={tokens.colors.warning} />
            </View>
          ) : error ? (
            <View className="flex-1 justify-center items-center">
              <Text className="text-theme-error mb-4">Failed to load products</Text>
              <Pressable
                className="bg-theme-surface-elevated px-4 py-2 rounded-lg"
                onPress={onClose}
                accessibilityRole="button"
                accessibilityLabel="Close"
              >
                <Text className="text-theme-text">Close</Text>
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
                      className={`bg-theme-surface-elevated rounded-2xl p-4 border ${
                        isBestValue ? "border-theme-warning/50" : "border-theme-border"
                      }`}
                    >
                      {isBestValue && (
                        <View className="absolute -top-3 right-4 bg-theme-warning px-3 py-1 rounded-full">
                          <Text className="text-theme-text-inverse text-xs font-bold">
                            BEST VALUE
                          </Text>
                        </View>
                      )}

                      <View className="flex-row justify-between items-center mb-2">
                        <View>
                          <Text className="text-theme-text font-bold text-lg">
                            {product.name}
                          </Text>
                          {bonusPercent > 0 && (
                            <Text className="text-theme-warning text-xs font-bold">
                              +{bonusPercent}% BONUS
                            </Text>
                          )}
                        </View>
                        <View className="items-end">
                          <Text className="text-3xl font-bold text-theme-text">
                            {sparks.toLocaleString()}
                          </Text>
                          <Text className="text-theme-warning font-bold text-sm">
                            SPARKS ⚡
                          </Text>
                        </View>
                      </View>

                      <Pressable
                        className={`w-full py-3 rounded-xl items-center mt-2 ${
                          isBestValue
                            ? "bg-theme-warning active:opacity-90"
                            : "bg-theme-surface active:opacity-90"
                        }`}
                        onPress={() => handlePurchase(product.id)}
                        accessibilityRole="button"
                        accessibilityLabel={`Buy ${product.name} for ${price}`}
                      >
                        <Text
                          className={`font-bold text-lg ${
                            isBestValue ? "text-theme-text-inverse" : "text-theme-text"
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
                accessibilityRole="button"
                accessibilityLabel="Restore purchases"
              >
                <Text className="text-theme-text-tertiary text-sm underline">
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
