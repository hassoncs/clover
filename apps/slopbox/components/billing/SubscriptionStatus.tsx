import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";

interface SubscriptionStatusProps {
	isPro: boolean;
	proUntil: number | null;
	source: "stripe" | "revenuecat" | "org" | null;
	onManage: () => void;
}

const SLOPBOX_PRO_FEATURES = [
	"Unlimited games",
	"No ads",
	"All game types",
	"Cloud sync & offline play",
];

export default function SubscriptionStatus({
	isPro,
	proUntil,
	source,
	onManage,
}: SubscriptionStatusProps) {
	const formatDate = (timestamp: number) => {
		return new Date(timestamp).toLocaleDateString(undefined, {
			year: "numeric",
			month: "long",
			day: "numeric",
		});
	};

	if (isPro) {
		return (
			<View className="bg-gray-800 border border-gray-700 rounded-xl p-4 mb-6">
				<View className="flex-row items-center justify-between mb-4">
					<View>
						<Text className="text-white text-lg font-semibold mb-1">
							Slopbox+
						</Text>
						<View className="flex-row items-center">
							<View className="bg-indigo-600/20 border border-indigo-500 px-2 py-0.5 rounded text-xs mr-2">
								<Text className="text-indigo-400 text-xs font-medium">
									ACTIVE
								</Text>
							</View>
							{source && (
								<Text className="text-gray-500 text-xs capitalize">
									via {source === "stripe" ? "Web" : "App Store"}
								</Text>
							)}
						</View>
					</View>
					<Ionicons name="star" size={24} color="#818CF8" />
				</View>

				{proUntil && (
					<Text className="text-gray-400 text-sm mb-4">
						Renews on {formatDate(proUntil)}
					</Text>
				)}

				<Pressable
					onPress={onManage}
					className="bg-gray-700 py-3 rounded-xl items-center active:bg-gray-600"
				>
					<Text className="text-white font-semibold">Manage Subscription</Text>
				</Pressable>
			</View>
		);
	}

	return (
		<View className="bg-gray-800 border border-gray-700 rounded-xl p-4 mb-6">
			<View className="flex-row items-center justify-between mb-4">
				<View>
					<Text className="text-white text-lg font-semibold mb-1">
						Free Plan
					</Text>
					<Text className="text-gray-400 text-sm">
						Upgrade to unlock all features
					</Text>
				</View>
				<Ionicons name="cube-outline" size={24} color="#9CA3AF" />
			</View>

			<View className="mb-6 space-y-3">
				{SLOPBOX_PRO_FEATURES.map((feature) => (
					<View key={feature} className="flex-row items-center mb-2">
						<Ionicons
							name="checkmark-circle"
							size={20}
							color="#818CF8"
							style={{ marginRight: 8 }}
						/>
						<Text className="text-gray-300 text-sm">{feature}</Text>
					</View>
				))}
			</View>

			<View className="bg-indigo-600/10 border border-indigo-500/30 py-3 rounded-xl items-center">
				<Text className="text-indigo-400 font-semibold">$4.99/month</Text>
			</View>
		</View>
	);
}
