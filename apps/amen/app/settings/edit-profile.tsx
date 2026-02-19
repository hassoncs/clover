import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
	ActivityIndicator,
	KeyboardAvoidingView,
	Platform,
	Pressable,
	ScrollView,
	Text,
	TextInput,
	View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { trpcReact } from "@/lib/trpc/react";

const DISPLAY_NAME_MAX = 50;
const BIO_MAX = 160;

export default function EditProfileScreen() {
	const router = useRouter();
	const utils = trpcReact.useUtils();

	const { data: profile, isLoading } = trpcReact.users.getProfile.useQuery();
	const updateProfile = trpcReact.users.updateProfile.useMutation({
		onSuccess: () => {
			utils.users.getProfile.invalidate();
			utils.social.getUserProfile.invalidate();
		},
	});

	const [displayName, setDisplayName] = useState("");
	const [bio, setBio] = useState("");
	const [saved, setSaved] = useState(false);

	useEffect(() => {
		if (profile) {
			setDisplayName(profile.displayName ?? "");
			setBio(profile.bio ?? "");
		}
	}, [profile]);

	const handleSave = async () => {
		setSaved(false);
		await updateProfile.mutateAsync({
			displayName: displayName.trim(),
			bio: bio.trim(),
		});
		setSaved(true);
		setTimeout(() => {
			router.back();
		}, 600);
	};

	const hasChanges =
		profile &&
		(displayName.trim() !== (profile.displayName ?? "") ||
			bio.trim() !== (profile.bio ?? ""));

	if (isLoading) {
		return (
			<SafeAreaView className="flex-1 bg-theme-background items-center justify-center">
				<ActivityIndicator size="large" color="#C9A84C" />
			</SafeAreaView>
		);
	}

	return (
		<SafeAreaView className="flex-1 bg-theme-background">
			<KeyboardAvoidingView
				className="flex-1"
				behavior={Platform.OS === "ios" ? "padding" : "height"}
			>
				<View className="flex-row items-center px-4 py-3 border-b border-theme-border">
					<Pressable onPress={() => router.back()} className="mr-3">
						<Ionicons name="arrow-back" size={24} color="#FDF8F0" />
					</Pressable>
					<Text className="text-theme-text font-semibold text-lg flex-1">
						Edit Profile
					</Text>
					<Pressable
						onPress={handleSave}
						disabled={!hasChanges || updateProfile.isPending}
						className={`px-4 py-2 rounded-lg ${
							hasChanges && !updateProfile.isPending
								? "bg-theme-primary active:bg-theme-primary/90"
								: "bg-theme-surface-elevated"
						}`}
					>
						{updateProfile.isPending ? (
							<ActivityIndicator size="small" color="#FDF8F0" />
						) : (
							<Text
								className={`font-semibold ${
									hasChanges
										? "text-theme-secondary"
										: "text-theme-text-tertiary"
								}`}
							>
								Save
							</Text>
						)}
					</Pressable>
				</View>

				<ScrollView className="flex-1 px-4 pt-6">
					<View className="mb-6">
						<View className="flex-row items-center justify-between mb-2">
							<Text className="text-theme-text-secondary text-sm font-medium">
								Display Name
							</Text>
							<Text
								className={`text-xs ${
									displayName.length > DISPLAY_NAME_MAX
										? "text-theme-error"
										: "text-theme-text-tertiary"
								}`}
							>
								{displayName.length}/{DISPLAY_NAME_MAX}
							</Text>
						</View>
						<TextInput
							className="bg-theme-surface p-4 rounded-xl border border-theme-border text-theme-text text-base"
							value={displayName}
							onChangeText={(text) =>
								setDisplayName(text.slice(0, DISPLAY_NAME_MAX))
							}
							placeholder="Your display name"
							placeholderTextColor="#A89B7D"
							maxLength={DISPLAY_NAME_MAX}
							autoCapitalize="words"
						/>
					</View>

					<View className="mb-6">
						<View className="flex-row items-center justify-between mb-2">
							<Text className="text-theme-text-secondary text-sm font-medium">
								Bio
							</Text>
							<Text
								className={`text-xs ${
									bio.length > BIO_MAX
										? "text-theme-error"
										: "text-theme-text-tertiary"
								}`}
							>
								{bio.length}/{BIO_MAX}
							</Text>
						</View>
						<TextInput
							className="bg-theme-surface p-4 rounded-xl border border-theme-border text-theme-text text-base"
							value={bio}
							onChangeText={(text) => setBio(text.slice(0, BIO_MAX))}
							placeholder="Tell people about yourself"
							placeholderTextColor="#A89B7D"
							maxLength={BIO_MAX}
							multiline
							numberOfLines={4}
							style={{ minHeight: 100, textAlignVertical: "top" }}
						/>
					</View>

					{saved && (
						<View className="bg-theme-success/30 p-4 rounded-xl border border-theme-success mb-6">
							<Text className="text-theme-success text-center font-medium">
								Profile updated
							</Text>
						</View>
					)}

					{updateProfile.isError && (
						<View className="bg-theme-error/30 p-4 rounded-xl border border-theme-error mb-6">
							<Text className="text-theme-error text-center">
								Failed to update profile. Please try again.
							</Text>
						</View>
					)}
				</ScrollView>
			</KeyboardAvoidingView>
		</SafeAreaView>
	);
}
