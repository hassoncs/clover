import { Ionicons } from "@expo/vector-icons";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import {
	ActivityIndicator,
	Pressable,
	Text,
	useWindowDimensions,
	View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { trpcReact } from "@/lib/trpc/react";

// Slopcade theme colors (dark mode)
const colors = {
	background: "#050608",
	surface: "#111827",
	primary: "#6366F1",
	text: "#FFFFFF",
	textSecondary: "#9CA3AF",
	success: "#10B981",
	error: "#F85149",
};

export default function JoinOrgScreen() {
	const { slug } = useLocalSearchParams<{ slug: string }>();
	const router = useRouter();
	const insets = useSafeAreaInsets();
	const { width } = useWindowDimensions();

	const {
		data: org,
		isLoading,
		error,
	} = trpcReact.organizations.getBySlug.useQuery(
		{ slug: slug ?? "" },
		{ enabled: !!slug, retry: false },
	);

	const joinMutation = trpcReact.organizations.joinBySlug.useMutation({
		onSuccess: () => {
			router.replace("/(tabs)/profile");
		},
	});

	const handleJoin = () => {
		if (!slug) return;
		joinMutation.mutate({ slug });
	};

	if (isLoading) {
		return (
			<View
				style={{
					flex: 1,
					backgroundColor: colors.background,
					alignItems: "center",
					justifyContent: "center",
				}}
			>
				<ActivityIndicator size="large" color={colors.primary} />
			</View>
		);
	}

	if (error || !org) {
		return (
			<View
				style={{
					flex: 1,
					backgroundColor: colors.background,
					alignItems: "center",
					justifyContent: "center",
					padding: 24,
				}}
			>
				<Stack.Screen options={{ headerShown: false }} />
				<Ionicons
					name="alert-circle-outline"
					size={64}
					color={colors.textSecondary}
				/>
				<Text
					style={{
						color: colors.text,
						fontSize: 20,
						fontWeight: "bold",
						marginTop: 16,
						textAlign: "center",
					}}
				>
					Organization not found
				</Text>
				<Text
					style={{
						color: colors.textSecondary,
						fontSize: 16,
						marginTop: 8,
						textAlign: "center",
						marginBottom: 32,
					}}
				>
					The link you followed may be broken or the organization no longer
					exists.
				</Text>
				<Pressable
					onPress={() => router.replace("/")}
					style={{
						backgroundColor: colors.surface,
						paddingVertical: 12,
						paddingHorizontal: 24,
						borderRadius: 100,
						borderWidth: 1,
						borderColor: colors.textSecondary,
					}}
					accessibilityLabel="Go Home"
					accessibilityRole="button"
				>
					<Text
						style={{
							color: colors.text,
							fontSize: 16,
							fontWeight: "600",
						}}
					>
						Go Home
					</Text>
				</Pressable>
			</View>
		);
	}

	return (
		<View
			style={{
				flex: 1,
				backgroundColor: colors.background,
			}}
		>
			<Stack.Screen options={{ headerShown: false }} />
			<View
				style={{
					flex: 1,
					alignItems: "center",
					justifyContent: "center",
					padding: 24,
				}}
			>
				<View
					style={{
						width: 80,
						height: 80,
						borderRadius: 20,
						backgroundColor: colors.primary,
						alignItems: "center",
						justifyContent: "center",
						marginBottom: 24,
					}}
				>
					<Text
						style={{
							color: "#FFFFFF",
							fontSize: 32,
							fontWeight: "bold",
						}}
					>
						{org.name.substring(0, 2).toUpperCase()}
					</Text>
				</View>

				<Text
					style={{
						color: colors.text,
						fontSize: 24,
						fontWeight: "bold",
						textAlign: "center",
						marginBottom: 8,
					}}
				>
					Join {org.name}?
				</Text>

				<Text
					style={{
						color: colors.textSecondary,
						fontSize: 16,
						textAlign: "center",
						marginBottom: 32,
					}}
				>
					You've been invited to join this organization on Slopcade.
				</Text>

				{org.memberRole ? (
					<View style={{ alignItems: "center" }}>
						<View
							style={{
								flexDirection: "row",
								alignItems: "center",
								backgroundColor: colors.surface,
								paddingVertical: 8,
								paddingHorizontal: 16,
								borderRadius: 100,
								marginBottom: 24,
							}}
						>
							<Ionicons
								name="checkmark-circle"
								size={20}
								color={colors.success}
								style={{ marginRight: 8 }}
							/>
							<Text
								style={{
									color: colors.text,
									fontSize: 14,
									fontWeight: "600",
								}}
							>
								You are already a member
							</Text>
						</View>
						<Pressable
							onPress={() => router.replace("/(tabs)/profile")}
							style={{
								backgroundColor: colors.primary,
								paddingVertical: 16,
								paddingHorizontal: 32,
								borderRadius: 100,
								width: "100%",
								alignItems: "center",
							}}
							accessibilityLabel="Go to Profile"
							accessibilityRole="button"
						>
							<Text
								style={{
									color: "#FFFFFF",
									fontSize: 16,
									fontWeight: "bold",
								}}
							>
								Go to Profile
							</Text>
						</Pressable>
					</View>
				) : (
					<Pressable
						onPress={handleJoin}
						disabled={joinMutation.isPending}
						style={{
							backgroundColor: colors.primary,
							paddingVertical: 16,
							paddingHorizontal: 32,
							borderRadius: 100,
							width: "100%",
							alignItems: "center",
							opacity: joinMutation.isPending ? 0.7 : 1,
						}}
						accessibilityLabel={`Join ${org.name}`}
						accessibilityRole="button"
						accessibilityState={{
							disabled: joinMutation.isPending,
							busy: joinMutation.isPending,
						}}
					>
						{joinMutation.isPending ? (
							<ActivityIndicator color="#FFFFFF" />
						) : (
							<Text
								style={{
									color: "#FFFFFF",
									fontSize: 16,
									fontWeight: "bold",
								}}
							>
								Join Organization
							</Text>
						)}
					</Pressable>
				)}

				{joinMutation.error && (
					<Text
						style={{
							color: colors.error,
							fontSize: 14,
							marginTop: 16,
							textAlign: "center",
						}}
					>
						{joinMutation.error.message}
					</Text>
				)}

				<Pressable
					onPress={() => router.replace("/")}
					style={{
						marginTop: 24,
						padding: 12,
					}}
					accessibilityLabel="Cancel joining"
					accessibilityRole="button"
				>
					<Text
						style={{
							color: colors.textSecondary,
							fontSize: 16,
							fontWeight: "600",
						}}
					>
						Cancel
					</Text>
				</Pressable>
			</View>
		</View>
	);
}
