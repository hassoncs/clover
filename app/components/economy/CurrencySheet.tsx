import { useState } from "react";
import { View, Text, Modal, Pressable, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { trpcReact } from "@/lib/trpc/react";
import { BuyGemsModal } from "./BuyGemsModal";
import { BuySparksModal } from "./BuySparksModal";

interface CurrencySheetProps {
  visible: boolean;
  onClose: () => void;
}

export function CurrencySheet({ visible, onClose }: CurrencySheetProps) {
  const [showGemsModal, setShowGemsModal] = useState(false);
  const [showSparksModal, setShowSparksModal] = useState(false);

  const { data: balance, isLoading } = trpcReact.economy.getBalance.useQuery(undefined, {
    enabled: visible,
  });

  const { data: history } = trpcReact.economy.getTransactions.useQuery(
    { limit: 10, offset: 0 },
    { enabled: visible }
  );

  return (
    <>
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={onClose}
      >
        <SafeAreaView className="flex-1 bg-gray-900">
          <View className="flex-row justify-between items-center px-4 py-3 border-b border-gray-700">
            <Text className="text-xl font-bold text-white">Currency</Text>
            <Pressable onPress={onClose}>
              <Text className="text-gray-400 text-lg">✕</Text>
            </Pressable>
          </View>

          <ScrollView className="flex-1">
            <View className="p-4">
              <View className="bg-gradient-to-br from-purple-900 to-gray-800 rounded-2xl p-6 mb-4 border border-purple-700">
                <Text className="text-gray-300 text-sm mb-4">Your Balance</Text>
                
                <View className="flex-row justify-between items-center mb-4">
                  <View className="flex-row items-baseline">
                    <Text className="text-4xl">💎</Text>
                    <Text className="text-white text-3xl font-bold ml-2">
                      {isLoading ? "..." : "0"}
                    </Text>
                    <Text className="text-gray-400 ml-2">Gems</Text>
                  </View>
                </View>

                <View className="border-t border-gray-700 pt-4">
                  <View className="flex-row items-baseline">
                    <Text className="text-4xl">⚡</Text>
                    <Text className="text-white text-3xl font-bold ml-2">
                      {isLoading ? "..." : balance?.balanceSparks.toLocaleString() ?? "0"}
                    </Text>
                    <Text className="text-gray-400 ml-2">Sparks</Text>
                  </View>
                  <Text className="text-gray-500 text-xs mt-1 ml-12">
                    ≈ ${isLoading ? "..." : (balance?.balanceSparks ? (balance.balanceSparks / 1000).toFixed(2) : "0.00")} compute credit
                  </Text>
                </View>
              </View>

              <View className="flex-row gap-3 mb-6">
                <Pressable
                  className="flex-1 bg-purple-600 rounded-xl p-4 items-center active:bg-purple-700"
                  onPress={() => setShowGemsModal(true)}
                >
                  <Text className="text-3xl mb-1">💎</Text>
                  <Text className="text-white font-bold">Buy Gems</Text>
                  <Text className="text-purple-200 text-xs mt-1">Premium items</Text>
                </Pressable>

                <Pressable
                  className="flex-1 bg-amber-500 rounded-xl p-4 items-center active:bg-amber-600"
                  onPress={() => setShowSparksModal(true)}
                >
                  <Text className="text-3xl mb-1">⚡</Text>
                  <Text className="text-white font-bold">Buy Sparks</Text>
                  <Text className="text-amber-100 text-xs mt-1">AI generation</Text>
                </Pressable>
              </View>

              <View className="bg-gray-800/50 rounded-xl p-4 border border-gray-700 mb-4">
                <Text className="text-gray-300 font-semibold mb-3">What's the difference?</Text>
                
                <View className="mb-3">
                  <View className="flex-row items-start mb-2">
                    <Text className="text-2xl mr-2">💎</Text>
                    <View className="flex-1">
                      <Text className="text-white font-semibold">Gems</Text>
                      <Text className="text-gray-400 text-sm">
                        Premium currency for exclusive items, cosmetics, and special features
                      </Text>
                    </View>
                  </View>
                </View>

                <View>
                  <View className="flex-row items-start">
                    <Text className="text-2xl mr-2">⚡</Text>
                    <View className="flex-1">
                      <Text className="text-white font-semibold">Sparks</Text>
                      <Text className="text-gray-400 text-sm">
                        Compute credits for AI-powered asset generation (sprites, backgrounds, audio)
                      </Text>
                    </View>
                  </View>
                </View>
              </View>

              {history && history.length > 0 && (
                <View className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
                  <Text className="text-white font-semibold mb-3">Recent Transactions</Text>
                  {history.map((tx: any) => (
                    <View key={tx.id} className="flex-row justify-between items-center py-2 border-b border-gray-700 last:border-0">
                      <View className="flex-1">
                        <Text className="text-gray-300 text-sm">
                          {tx.description || tx.type.replace(/_/g, ' ')}
                        </Text>
                        <Text className="text-gray-500 text-xs">
                          {new Date(tx.createdAt).toLocaleDateString()}
                        </Text>
                      </View>
                      <Text className={`font-bold ${tx.amountSparks > 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {tx.amountSparks > 0 ? '+' : ''}{tx.amountSparks} sparks
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      <BuyGemsModal 
        visible={showGemsModal} 
        onClose={() => setShowGemsModal(false)} 
      />
      
      <BuySparksModal 
        visible={showSparksModal} 
        onClose={() => setShowSparksModal(false)} 
      />
    </>
  );
}
