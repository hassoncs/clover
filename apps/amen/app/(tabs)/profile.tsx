import { Ionicons } from "@expo/vector-icons";
import { tokens } from "@slopcade/theme";
import { useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
	ActivityIndicator,
	Alert,
	Image,
	Modal,
	Pressable,
	RefreshControl,
	ScrollView,
	Text,
	TextInput,
	View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { CreditBalance } from "@/components/economy/CreditBalance";
import { CurrencySheet } from "@/components/economy/CurrencySheet";
import { useAuth } from "@/hooks/useAuth";
import { trpcReact } from "@/lib/trpc/react";

const heroImage = require("@/assets/brands/amen/splash.png");

function initialsFromEmail(email: string | undefined): string {
	if (!email) return "AG";
	const base = email.split("@")[0] ?? "";
	const parts = base.split(/[._-]/).filter(Boolean);
	if (parts.length === 0) return base.slice(0, 2).toUpperCase() || "AG";
	if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
	return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

function LoginScreen() {
	const { signInWithGoogle, sendMagicLink, signInAsDev } = useAuth();

	const [loginEmail, setLoginEmail] = useState("");
	const [isLoggingIn, setIsLoggingIn] = useState(false);
	const [loginError, setLoginError] = useState<string | null>(null);
	const [magicLinkSent, setMagicLinkSent] = useState(false);

	const { data: inviteStatus, isLoading: isCheckingInvite } =
		trpcReact.invites.isEmailInvited.useQuery(
			{ email: loginEmail },
			{ enabled: loginEmail.length > 0 && loginEmail.includes("@") },
		);

	const handleGoogleSignIn = useCallback(async () => {
		setIsLoggingIn(true);
		setLoginError(null);
		try {
			await signInWithGoogle();
		} catch (err) {
			const message =
				err instanceof Error ? err.message : "Failed to sign in with Google";
			setLoginError(message);
		} finally {
			setIsLoggingIn(false);
		}
	}, [signInWithGoogle]);

	const handleMagicLink = useCallback(async () => {
		if (!loginEmail.trim() || !loginEmail.includes("@")) {
			setLoginError("Please enter a valid email address");
			return;
		}

		if (inviteStatus?.invited === false) {
			setLoginError(
				`This email hasn't been invited to Amen yet. Invited users can sign in.`,
			);
			return;
		}

		setIsLoggingIn(true);
		setLoginError(null);
		try {
			await sendMagicLink(loginEmail.trim());
			setMagicLinkSent(true);
		} catch (err) {
			const message =
				err instanceof Error ? err.message : "Failed to send magic link";
			setLoginError(message);
		} finally {
			setIsLoggingIn(false);
		}
	}, [loginEmail, sendMagicLink, inviteStatus]);

	return (
		<ScrollView
			className="flex-1"
			contentContainerStyle={{ paddingBottom: 130 }}
		>
			<View className="p-6 items-center">
				<Image
					source={heroImage}
					style={{ width: 280, height: 140, marginBottom: 24 }}
					resizeMode="contain"
				/>
				<Text className="text-theme-text-secondary text-center mb-8">
					Sign in to save your favorites
				</Text>

				{magicLinkSent ? (
					<View className="w-full bg-theme-success/20 p-6 rounded-xl border border-theme-success mb-6">
						<Text className="text-theme-success text-center text-lg font-semibold mb-2">
							Check your email!
						</Text>
						<Text className="text-theme-success text-center">
							We sent a magic link to {loginEmail}
						</Text>
						<Pressable
							className="mt-4 py-2"
							onPress={() => {
								setMagicLinkSent(false);
								setLoginEmail("");
							}}
						>
							<Text className="text-theme-success text-center underline">
								Use a different email
							</Text>
						</Pressable>
					</View>
				) : (
					<>
						<View className="w-full mb-6">
							<TextInput
								className="bg-theme-surface-elevated p-4 rounded-xl border border-theme-border text-theme-text text-base mb-3"
								placeholder="Enter your email"
								placeholderTextColor={tokens.semantic.colors.text.secondary}
								value={loginEmail}
								onChangeText={(text) => {
									setLoginEmail(text);
									setLoginError(null);
								}}
								keyboardType="email-address"
								autoCapitalize="none"
								autoComplete="email"
								editable={!isLoggingIn}
							/>

							{loginEmail.length > 0 && loginEmail.includes("@") && (
								<View className="mb-3">
									{isCheckingInvite ? (
										<View className="flex-row items-center">
											<ActivityIndicator
												size="small"
												color={tokens.semantic.colors.text.secondary}
											/>
											<Text className="text-theme-text-secondary ml-2 text-sm">
												Checking invite status...
											</Text>
										</View>
									) : inviteStatus?.invited === false ? (
										<View className="flex-row items-center">
											<Text className="text-theme-error mr-2">✕</Text>
											<Text className="text-theme-error text-sm">
												Not invited
											</Text>
										</View>
									) : inviteStatus?.invited === true ? (
										<View className="flex-row items-center">
											<Text className="text-theme-success mr-2">✓</Text>
											<Text className="text-theme-success text-sm">
												Invited
											</Text>
										</View>
									) : null}
								</View>
							)}

							<Pressable
								className={`py-4 rounded-xl items-center ${
									isLoggingIn ||
									(loginEmail.length > 0 && inviteStatus?.invited === false)
										? "bg-theme-surface-elevated"
										: "bg-theme-primary active:opacity-90"
								}`}
								onPress={handleMagicLink}
								disabled={
									isLoggingIn ||
									(loginEmail.length > 0 && inviteStatus?.invited === false)
								}
							>
								<Text className="text-theme-text-inverse font-semibold text-base">
									{isLoggingIn ? "Sending..." : "Send Magic Link"}
								</Text>
							</Pressable>
						</View>

						<View className="flex-row items-center w-full mb-6">
							<View className="flex-1 h-px bg-theme-border" />
							<Text className="text-theme-text-secondary px-4">or</Text>
							<View className="flex-1 h-px bg-theme-border" />
						</View>

						<Pressable
							className={`w-full py-4 rounded-xl items-center flex-row justify-center ${
								isLoggingIn
									? "bg-theme-surface-elevated"
									: "bg-white active:bg-gray-100"
							}`}
							onPress={handleGoogleSignIn}
							disabled={isLoggingIn}
						>
							<Text className="text-black font-semibold text-base">
								Continue with Google
							</Text>
						</Pressable>

						{__DEV__ && (
							<>
								<View className="flex-row items-center w-full my-6">
									<View className="flex-1 h-px bg-theme-border" />
									<Text className="text-theme-text-secondary px-4">dev</Text>
									<View className="flex-1 h-px bg-theme-border" />
								</View>

								<Pressable
									className="w-full py-4 rounded-xl items-center bg-theme-warning active:opacity-90"
									onPress={signInAsDev}
								>
									<Text className="text-white font-semibold text-base">
										Login as Dev User
									</Text>
								</Pressable>
							</>
						)}
					</>
				)}

				{loginError && (
					<View className="w-full mt-4 p-4 bg-theme-error/20 rounded-xl border border-theme-error">
						<Text className="text-theme-error text-center">{loginError}</Text>
					</View>
				)}

				<View className="mt-8 p-4 bg-theme-surface-elevated/50 rounded-xl">
					<Text className="text-theme-text-secondary text-center text-sm">
						You can browse and play public games without signing in. Sign in to
						save favorites.
					</Text>
				</View>
			</View>
		</ScrollView>
	);
}

export default function ProfileScreen() {
	const router = useRouter();
	const {
		user,
		isAuthenticated,
		isLoading: isAuthLoading,
		signOut,
	} = useAuth();
	const [showCurrencySheet, setShowCurrencySheet] = useState(false);
	const [showInviteModal, setShowInviteModal] = useState(false);
	const [inviteEmail, setInviteEmail] = useState("");
	const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);
	const [isInviting, setIsInviting] = useState(false);
	const createInvite = trpcReact.invites.create.useMutation();

	const utils = trpcReact.useUtils();
	const [isRefreshing, setIsRefreshing] = useState(false);

	const handleRefresh = useCallback(async () => {
		setIsRefreshing(true);
		await utils.economy.getBalance.invalidate();
		setIsRefreshing(false);
	}, [utils]);

	const displayName = useMemo(() => {
		const emailName = user?.email?.split("@")[0] ?? "Amen User";
		return emailName;
	}, [user?.email]);

	const username = useMemo(() => {
		const raw = user?.email?.split("@")[0] ?? "amen";
		return raw.toLowerCase();
	}, [user?.email]);

	if (isAuthLoading) {
		return (
			<SafeAreaView
				className="flex-1 bg-theme-background items-center justify-center"
				edges={["bottom"]}
			>
				<ActivityIndicator
					size="large"
					color={tokens.semantic.colors.primary}
				/>
				<Text className="text-theme-text-secondary mt-4">Loading...</Text>
			</SafeAreaView>
		);
	}

	if (!isAuthenticated) {
		return (
			<SafeAreaView className="flex-1 bg-theme-background" edges={["bottom"]}>
				<LoginScreen />
			</SafeAreaView>
		);
	}

	return (
		<SafeAreaView className="flex-1 bg-theme-background" edges={["bottom"]}>
			<ScrollView
				className="flex-1"
				contentContainerStyle={{ paddingBottom: 130 }}
				refreshControl={
					<RefreshControl
						refreshing={isRefreshing}
						onRefresh={handleRefresh}
						tintColor={tokens.semantic.colors.primary}
					/>
				}
			>
				<View className="px-5 pt-5">
					<View className="items-center mt-6">
						<View className="h-44 w-44 rounded-full items-center justify-center bg-theme-surface-elevated border border-theme-border">
							<Text className="text-theme-text text-6xl font-bold">
								{initialsFromEmail(user?.email)}
							</Text>
						</View>
						<Text className="text-theme-text text-5xl font-bold mt-4">
							{displayName}
						</Text>
						<Text className="text-theme-text-secondary text-3xl mt-1">
							{username}
						</Text>
					</View>

					<View className="flex-row mt-8 gap-3">
						<Pressable
							className="flex-1 h-14 rounded-full bg-theme-surface-elevated items-center justify-center"
							onPress={() => router.push("/settings/edit-profile")}
						>
							<Text className="text-theme-text text-2xl font-semibold">
								Edit
							</Text>
						</Pressable>
						<Pressable className="flex-1 h-14 rounded-full bg-white items-center justify-center">
							<Text className="text-black text-2xl font-semibold">Share</Text>
						</Pressable>
					</View>

					<View className="mt-6 rounded-3xl bg-theme-surface p-4 border border-theme-border">
						<Text className="text-theme-text text-2xl font-semibold mb-3">
							Account
						</Text>
						<View className="flex-row items-center justify-between mb-3">
							<Text className="text-theme-text-secondary text-base">
								Sparks
							</Text>
							<CreditBalance onPress={() => setShowCurrencySheet(true)} />
						</View>
						<Pressable
							className="mb-3 bg-theme-surface-elevated h-12 rounded-full items-center justify-center border border-theme-border"
							onPress={() => router.push("/themes")}
						>
							<Text className="text-theme-text text-base font-semibold">
								Open Themes Library
							</Text>
						</Pressable>
						<Pressable
							className="mb-3 bg-theme-surface-elevated h-12 rounded-full items-center justify-center border border-theme-border"
							onPress={() => router.push("/settings/blocked-users")}
						>
							<Text className="text-theme-text text-base font-semibold">
								Blocked Users
							</Text>
						</Pressable>
						<Pressable
							className="mb-3 bg-theme-surface-elevated h-12 rounded-full items-center justify-center border border-theme-border"
							onPress={() => router.push("/settings/my-org")}
						>
							<Text className="text-theme-text text-base font-semibold">
								My Church
							</Text>
						</Pressable>
						<View className="flex-row gap-3">
							<Pressable
								className="flex-1 bg-theme-success h-12 rounded-full items-center justify-center"
								onPress={() => setShowInviteModal(true)}
							>
								<Text className="text-white text-base font-semibold">
									Invite
								</Text>
							</Pressable>
							<Pressable
								className="flex-1 bg-theme-surface-elevated h-12 rounded-full items-center justify-center"
								onPress={signOut}
							>
								<Text className="text-theme-text text-base font-semibold">
									Sign Out
								</Text>
							</Pressable>
						</View>
					</View>
				</View>
			</ScrollView>

			<Modal
				animationType="slide"
				transparent
				visible={showInviteModal}
				onRequestClose={() => setShowInviteModal(false)}
			>
				<SafeAreaView className="flex-1 bg-theme-background" edges={["bottom"]}>
					<View className="flex-1 p-6">
						<View className="flex-row justify-between items-center mb-6">
							<Text className="text-2xl font-bold text-theme-text">
								Invite Friend
							</Text>
							<Pressable onPress={() => setShowInviteModal(false)}>
								<Text className="text-theme-text-secondary text-lg">✕</Text>
							</Pressable>
						</View>

						<Text className="text-theme-text-secondary mb-4">
							Invite someone to join Amen by email. They will be able to sign in
							once invited.
						</Text>

						<TextInput
							className="w-full bg-theme-surface-elevated text-theme-text p-4 rounded-xl border border-theme-border"
							placeholder="friend@example.com"
							placeholderTextColor={tokens.semantic.colors.text.secondary}
							value={inviteEmail}
							onChangeText={setInviteEmail}
							autoCapitalize="none"
							keyboardType="email-address"
							editable={!isInviting}
						/>

						<Pressable
							className={`mt-4 py-4 rounded-xl items-center ${
								isInviting || !inviteEmail.includes("@")
									? "bg-theme-surface-elevated"
									: "bg-theme-success active:opacity-90"
							}`}
							onPress={async () => {
								if (!inviteEmail.includes("@")) return;
								setIsInviting(true);
								setInviteSuccess(null);
								try {
									await createInvite.mutateAsync({ email: inviteEmail });
									setInviteSuccess(`Invited ${inviteEmail}`);
									setInviteEmail("");
								} catch (err) {
									setInviteSuccess(null);
									Alert.alert(
										"Invite Failed",
										err instanceof Error
											? err.message
											: "Failed to send invite",
									);
								} finally {
									setIsInviting(false);
								}
							}}
							disabled={isInviting || !inviteEmail.includes("@")}
						>
							{isInviting ? (
								<View className="flex-row items-center">
									<ActivityIndicator color="white" size="small" />
									<Text className="text-white font-bold text-lg ml-2">
										Sending...
									</Text>
								</View>
							) : (
								<Text className="text-white font-bold text-lg">
									Send Invite
								</Text>
							)}
						</Pressable>

						{inviteSuccess && (
							<View className="mt-4 p-4 bg-theme-success/20 rounded-xl border border-theme-success">
								<Text className="text-theme-success text-center">
									{inviteSuccess}
								</Text>
							</View>
						)}
					</View>
				</SafeAreaView>
			</Modal>

			<CurrencySheet
				visible={showCurrencySheet}
				onClose={() => setShowCurrencySheet(false)}
			/>
		</SafeAreaView>
	);
}
