import React from "react";
import { View, Text, Modal, Pressable } from "react-native";

interface InsufficientBalanceModalProps {
  visible: boolean;
  onClose: () => void;
  onGetMore: () => void;
  requiredSparks: number;
  currentBalance: number;
}

export function InsufficientBalanceModal({
  visible,
  onClose,
  onGetMore,
  requiredSparks,
  currentBalance,
}: InsufficientBalanceModalProps) {
  const shortfall = Math.max(0, requiredSparks - currentBalance);

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-center items-center bg-black/80">
        <View className="bg-gray-900 rounded-2xl p-6 mx-4 w-full max-w-sm border border-gray-800">
          <View className="items-center mb-4">
            <Text className="text-5xl mb-4">⚠️</Text>
            <Text className="text-xl font-bold text-white text-center">
              Insufficient Sparks
            </Text>
          </View>

          <Text className="text-gray-400 text-center mb-6 text-base">
            You don't have enough Sparks to complete this action.
          </Text>

          <View className="bg-gray-800 rounded-xl p-4 mb-6">
            <View className="flex-row justify-between mb-2">
              <Text className="text-gray-400">Required:</Text>
              <Text className="text-white font-bold">{requiredSparks} ⚡</Text>
            </View>
            <View className="flex-row justify-between mb-2">
              <Text className="text-gray-400">You Have:</Text>
              <Text className="text-gray-400">{currentBalance} ⚡</Text>
            </View>
            <View className="h-px bg-gray-700 my-2" />
            <View className="flex-row justify-between">
              <Text className="text-red-400 font-medium">Missing:</Text>
              <Text className="text-red-400 font-bold">{shortfall} ⚡</Text>
            </View>
          </View>

          <Pressable
            className="bg-amber-500 w-full py-4 rounded-xl items-center mb-3 active:bg-amber-600"
            onPress={onGetMore}
          >
            <Text className="text-black font-bold text-lg">Get More Sparks</Text>
          </Pressable>

          <Pressable
            className="bg-gray-800 w-full py-4 rounded-xl items-center active:bg-gray-700"
            onPress={onClose}
          >
            <Text className="text-white font-semibold text-base">Cancel</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
