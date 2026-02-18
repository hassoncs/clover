import React, { Suspense, useState } from "react";
import {
	ActivityIndicator,
	Modal,
	Pressable,
	ScrollView,
	Text,
	View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { trpcReact } from "@/lib/trpc/react";

const BuyGemsModal = React.lazy(() =>
	import("./BuyGemsModal").then((m) => ({ default: m.BuyGemsModal })),
);

interface CurrencySheetProps {
	visible: boolean;
	onClose: () => void;
}

export function CurrencySheet({ visible, onClose }: CurrencySheetProps) {
	const [showGemsModal, setShowGemsModal] = useState(false);

	const { data: balance, isLoading } = trpcReact.economy.getBalance.useQuery(
		undefined,
		{
			enabled: visible,
		},
	);

	const { data: history } = trpcReact.economy.getTransactions.useQuery(
		{ limit: 10, offset: 0 },
		{ enabled: visible },
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
						<Pressable
							onPress={onClose}
							accessibilityRole="button"
							accessibilityLabel="Close"
						>
							<Text className="text-gray-400 text-lg">✕</Text>
						</Pressable>
					</View>

					<ScrollView className="flex-1">
						<View className="p-4">
							<View className="bg-gradient-to-br from-purple-900 to-gray-800 rounded-2xl p-6 mb-4 border border-purple-700">
								<Text className="text-gray-300 text-sm mb-4">Your Balance</Text>

								<View className="flex-row justify-between items-center">
									<View className="flex-row items-baseline">
										<Text className="text-4xl">💎</Text>
										<Text className="text-white text-3xl font-bold ml-2">
											{isLoading ? "..." : "0"}
										</Text>
										<Text className="text-gray-400 ml-2">Gems</Text>
									</View>
								</View>
							</View>

							<View className="flex-row gap-3 mb-6">
								<Pressable
									className="flex-1 bg-purple-600 rounded-xl p-4 items-center active:bg-purple-700"
									onPress={() => setShowGemsModal(true)}
									accessibilityRole="button"
									accessibilityLabel="Buy Gems"
								>
									<Text className="text-3xl mb-1">💎</Text>
									<Text className="text-white font-bold">Buy Gems</Text>
									<Text className="text-purple-200 text-xs mt-1">
										Premium items
									</Text>
								</Pressable>
							</View>

							<View className="bg-gray-800/50 rounded-xl p-4 border border-gray-700 mb-4">
								<Text className="text-gray-300 font-semibold mb-3">
									About Gems
								</Text>

								<View className="flex-row items-start">
									<Text className="text-2xl mr-2">💎</Text>
									<View className="flex-1">
										<Text className="text-white font-semibold">Gems</Text>
										<Text className="text-gray-400 text-sm">
											Premium currency for exclusive items, cosmetics, and
											special features
										</Text>
									</View>
								</View>
							</View>

							{history && history.length > 0 && (
								<View className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
									<Text className="text-white font-semibold mb-3">
										Recent Transactions
									</Text>
									{history.map((tx: any) => (
										<View
											key={tx.id}
											className="flex-row justify-between items-center py-2 border-b border-gray-700 last:border-0"
										>
											<View className="flex-1">
												<Text className="text-gray-300 text-sm">
													{tx.description || tx.type.replace(/_/g, " ")}
												</Text>
												<Text className="text-gray-500 text-xs">
													{new Date(tx.createdAt).toLocaleDateString()}
												</Text>
											</View>
											<Text
												className={`font-bold ${tx.amountSparks > 0 ? "text-green-400" : "text-red-400"}`}
											>
												{tx.amountSparks > 0 ? "+" : ""}
												{tx.amountSparks} sparks
											</Text>
										</View>
									))}
								</View>
							)}
						</View>
					</ScrollView>
				</SafeAreaView>
			</Modal>

			{showGemsModal && (
				<Suspense
					fallback={
						<Modal visible={true} transparent animationType="fade">
							<View className="flex-1 items-center justify-center bg-black/50">
								<ActivityIndicator size="large" color="#6366F1" />
							</View>
						</Modal>
					}
				>
					<BuyGemsModal
						visible={showGemsModal}
						onClose={() => setShowGemsModal(false)}
					/>
				</Suspense>
			)}
		</>
	);
}
