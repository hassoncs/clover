import React from "react";
import { Modal, Pressable, Text, View } from "react-native";

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
			<View className="flex-1 justify-center items-center bg-theme-background/80">
				<View className="bg-theme-surface rounded-2xl p-6 mx-4 w-full max-w-sm border border-theme-border">
					<View className="items-center mb-4">
						<Text className="text-5xl mb-4">⚠️</Text>
						<Text className="text-xl font-bold text-theme-text text-center">
							Insufficient Sparks
						</Text>
					</View>

					<Text className="text-theme-text-secondary text-center mb-6 text-base">
						You don't have enough Sparks to complete this action.
					</Text>

					<View className="bg-theme-surface-elevated rounded-xl p-4 mb-6">
						<View className="flex-row justify-between mb-2">
							<Text className="text-theme-text-secondary">Required:</Text>
							<Text className="text-theme-text font-bold">
								{requiredSparks} ⚡
							</Text>
						</View>
						<View className="flex-row justify-between mb-2">
							<Text className="text-theme-text-secondary">You Have:</Text>
							<Text className="text-theme-text-secondary">
								{currentBalance} ⚡
							</Text>
						</View>
						<View className="h-px bg-theme-border my-2" />
						<View className="flex-row justify-between">
							<Text className="text-theme-error font-medium">Missing:</Text>
							<Text className="text-theme-error font-bold">{shortfall} ⚡</Text>
						</View>
					</View>

					<Pressable
						className="bg-theme-warning w-full py-4 rounded-xl items-center mb-3 active:bg-theme-warning/90"
						onPress={onGetMore}
						accessibilityRole="button"
						accessibilityLabel="Get more sparks"
					>
						<Text className="text-theme-text-inverse font-bold text-lg">
							Get More Sparks
						</Text>
					</Pressable>

					<Pressable
						className="bg-theme-surface-elevated w-full py-4 rounded-xl items-center active:bg-theme-surface"
						onPress={onClose}
						accessibilityRole="button"
						accessibilityLabel="Cancel"
					>
						<Text className="text-theme-text font-semibold text-base">
							Cancel
						</Text>
					</Pressable>
				</View>
			</View>
		</Modal>
	);
}
