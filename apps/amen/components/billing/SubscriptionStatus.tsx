import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";

interface SubscriptionStatusProps {
	isPro: boolean;
	proUntil: number | null;
	source: "stripe" | "revenuecat" | "org" | null;
	onManage: () => void;
}

const AMEN_PRO_FEATURES = [
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
			<View className="bg-theme-surface border border-theme-border rounded-xl p-4 mb-6">
				<View className="flex-row items-center justify-between mb-4">
					<View>
						<Text className="text-theme-text text-lg font-semibold mb-1">
							Amen+
						</Text>
						<View className="flex-row items-center">
							<View className="bg-theme-primary/20 border border-theme-primary px-2 py-0.5 rounded text-xs mr-2">
								<Text className="text-theme-primary text-xs font-medium">
									ACTIVE
								</Text>
							</View>
							{source && (
								<Text className="text-theme-text-tertiary text-xs capitalize">
									via {source === "stripe" ? "Web" : "App Store"}
								</Text>
							)}
						</View>
					</View>
					<Ionicons name="star" size={24} color="#C9A84C" />
				</View>

				{proUntil && (
					<Text className="text-theme-text-secondary text-sm mb-4">
						Renews on {formatDate(proUntil)}
					</Text>
				)}

				<Pressable
					onPress={onManage}
					className="bg-theme-surface-elevated py-3 rounded-xl items-center active:bg-theme-surface"
				>
					<Text className="text-theme-text font-semibold">
						Manage Subscription
					</Text>
				</Pressable>
			</View>
		);
	}

	return (
		<View className="bg-theme-surface border border-theme-border rounded-xl p-4 mb-6">
			<View className="flex-row items-center justify-between mb-4">
				<View>
					<Text className="text-theme-text text-lg font-semibold mb-1">
						Free Plan
					</Text>
					<Text className="text-theme-text-secondary text-sm">
						Upgrade to unlock all features
					</Text>
				</View>
				<Ionicons name="cube-outline" size={24} color="#A89B7D" />
			</View>

			<View className="mb-6 space-y-3">
				{AMEN_PRO_FEATURES.map((feature) => (
					<View key={feature} className="flex-row items-center mb-2">
						<Ionicons
							name="checkmark-circle"
							size={20}
							color="#C9A84C"
							style={{ marginRight: 8 }}
						/>
						<Text className="text-theme-text-secondary text-sm">{feature}</Text>
					</View>
				))}
			</View>

			<View className="bg-theme-primary/10 border border-theme-primary/30 py-3 rounded-xl items-center">
				<Text className="text-theme-primary font-semibold">$4.99/month</Text>
			</View>
		</View>
	);
}
