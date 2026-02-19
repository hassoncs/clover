import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
	ActivityIndicator,
	Keyboard,
	Pressable,
	Text,
	TextInput,
	TouchableWithoutFeedback,
	View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { trpcReact } from "@/lib/trpc/react";

export default function JoinOrgScreen() {
	const router = useRouter();
	const [code, setCode] = useState("");
	const [error, setError] = useState<string | null>(null);

	const joinMutation = trpcReact.organizations.join.useMutation({
		onSuccess: () => {
			router.replace("/settings/my-org");
		},
		onError: (err) => {
			setError(err.message);
		},
	});

	const handleJoin = () => {
		if (code.length !== 6) {
			setError("Code must be 6 characters");
			return;
		}
		setError(null);
		joinMutation.mutate({ joinCode: code });
	};

	return (
		<SafeAreaView className="flex-1 bg-theme-background">
			<View className="flex-row items-center px-4 py-3 border-b border-theme-border">
				<Pressable
					onPress={() => router.back()}
					className="mr-3"
					accessibilityLabel="Go back"
					accessibilityRole="button"
				>
					<Ionicons name="arrow-back" size={24} color="#FDF8F0" />
				</Pressable>
				<Text className="text-theme-text font-semibold text-lg">
					Join Amen Organization
				</Text>
			</View>

			<TouchableWithoutFeedback onPress={Keyboard.dismiss}>
				<View className="flex-1 p-6 items-center pt-12">
					<View
						className="w-16 h-16 bg-theme-surface rounded-2xl items-center justify-center mb-6"
						accessible={true}
						accessibilityLabel="Organization icon"
					>
						<Ionicons name="people" size={32} color="#FDF8F0" />
					</View>

					<Text
						className="text-theme-text text-2xl font-bold text-center mb-2"
						accessibilityRole="header"
					>
						Enter Join Code
					</Text>
					<Text className="text-theme-text-secondary text-center mb-8 px-4">
						Ask your organization leader for the 6-character code to join their
						group.
					</Text>

					<View className="w-full max-w-xs">
						<TextInput
							className="bg-theme-surface border border-theme-border rounded-xl px-4 py-4 text-theme-text text-center font-bold text-2xl tracking-[8px] mb-4"
							placeholder="CODE"
							placeholderTextColor="#A89B7D"
							value={code}
							onChangeText={(text) => {
								setCode(
									text
										.toUpperCase()
										.replace(/[^A-Z0-9]/g, "")
										.slice(0, 6),
								);
								setError(null);
							}}
							autoCapitalize="characters"
							autoCorrect={false}
							maxLength={6}
							returnKeyType="go"
							onSubmitEditing={handleJoin}
							accessibilityLabel="Enter 6-character join code"
							accessibilityHint="Type the code provided by your organization leader"
						/>

						{error && (
							<View
								className="bg-theme-error/30 p-3 rounded-lg border border-theme-error mb-4"
								accessible={true}
								accessibilityLabel={`Error: ${error}`}
								accessibilityLiveRegion="polite"
							>
								<Text className="text-theme-error text-center text-sm">
									{error}
								</Text>
							</View>
						)}

						<Pressable
							className={`w-full py-4 rounded-xl items-center ${
								joinMutation.isPending || code.length !== 6
									? "bg-theme-surface-elevated opacity-50"
									: "bg-theme-primary active:bg-theme-primary/90"
							}`}
							onPress={handleJoin}
							disabled={joinMutation.isPending || code.length !== 6}
							accessibilityLabel="Join Organization"
							accessibilityRole="button"
							accessibilityState={{
								disabled: joinMutation.isPending || code.length !== 6,
								busy: joinMutation.isPending,
							}}
						>
							{joinMutation.isPending ? (
								<ActivityIndicator color="#1B3A6B" />
							) : (
								<Text className="text-theme-secondary font-bold text-lg">
									Join Organization
								</Text>
							)}
						</Pressable>
					</View>
				</View>
			</TouchableWithoutFeedback>
		</SafeAreaView>
	);
}
