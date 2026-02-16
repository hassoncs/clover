import { Ionicons } from "@expo/vector-icons";
import { tokens } from "@slopcade/theme";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
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
import { activeBrand } from "@/lib/brand";
import { trpc } from "@/lib/trpc/client";
import { trpcReact } from "@/lib/trpc/react";

const heroImage = require("@/assets/slopcade-title-hero.jpg");

function initialsFromEmail(email: string | undefined): string {
	if (!email) return "SC";
	const base = email.split("@")[0] ?? "";
	const parts = base.split(/[._-]/).filter(Boolean);
	if (parts.length === 0) return base.slice(0, 2).toUpperCase() || "SC";
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
				`This email hasn't been invited to ${activeBrand.displayName} yet. Invited users can sign in.`,
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
					{activeBrand.features.userGeneratedContent
						? "Sign in to create and save your games"
						: "Sign in to save your favorites and follow creators"}
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
						{activeBrand.features.userGeneratedContent
							? "You can browse and play public games without signing in. Sign in to create, save, and manage your own games."
							: "You can browse and play public games without signing in. Sign in to save favorites and follow creators."}
					</Text>
				</View>
			</View>
		</ScrollView>
	);
}

interface MyGameItem {
	id: string;
	title: string;
	description: string | null;
	playCount: number;
	isPublic: boolean;
	createdAt: string;
	updatedAt: string;
	version: string;
	buildNumber: number;
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

	const { data: profileData } = trpcReact.social.getUserProfile.useQuery(
		{ userId: user?.id ?? "" },
		{ enabled: isAuthenticated && !!user?.id },
	);

	const utils = trpcReact.useUtils();
	const [myGames, setMyGames] = useState<MyGameItem[]>([]);
	const [isLoadingGames, setIsLoadingGames] = useState(false);
	const [isRefreshing, setIsRefreshing] = useState(false);

	const fetchMyGames = useCallback(async (showRefresh = false) => {
		if (showRefresh) setIsRefreshing(true);
		else setIsLoadingGames(true);
		try {
			const result = await trpc.games.list.query();
			setMyGames(
				result.map((g) => {
					const raw = g as Record<string, unknown>;
					return {
						id: g.id,
						title: g.title,
						description: g.description,
						playCount: g.playCount,
						isPublic: g.isPublic,
						createdAt: g.createdAt,
						updatedAt: g.updatedAt,
						version: (raw.version as string) ?? "1.0.0",
						buildNumber: (raw.buildNumber as number) ?? 1,
					};
				}),
			);
		} catch {
			setMyGames([]);
		} finally {
			setIsLoadingGames(false);
			setIsRefreshing(false);
		}
	}, []);

	const handleRefresh = useCallback(async () => {
		setIsRefreshing(true);
		await Promise.all([
			fetchMyGames(true),
			utils.economy.getBalance.invalidate(),
			utils.social.getUserProfile.invalidate(),
		]);
		setIsRefreshing(false);
	}, [fetchMyGames, utils]);

	useEffect(() => {
		if (isAuthenticated) {
			fetchMyGames();
		}
	}, [isAuthenticated, fetchMyGames]);

	const handleDeleteGame = useCallback((game: MyGameItem) => {
		Alert.alert(
			"Delete Game",
			`Are you sure you want to delete "${game.title}"?`,
			[
				{ text: "Cancel", style: "cancel" },
				{
					text: "Delete",
					style: "destructive",
					onPress: async () => {
						try {
							await trpc.games.delete.mutate({ id: game.id });
							setMyGames((prev) => prev.filter((g) => g.id !== game.id));
						} catch (err) {
							const message =
								err instanceof Error ? err.message : "Failed to delete";
							Alert.alert("Error", message);
						}
					},
				},
			],
		);
	}, []);

	const handlePublishGame = useCallback((game: MyGameItem) => {
		const nextBuild = game.buildNumber + 1;
		const actionLabel = game.isPublic ? "Update" : "Publish";
		Alert.alert(
			`${actionLabel} "${game.title}"?`,
			`This will make the game public and set it to v${game.version} (${nextBuild}).`,
			[
				{ text: "Cancel", style: "cancel" },
				{
					text: actionLabel,
					onPress: async () => {
						try {
							const result = await trpc.games.publish.mutate({ id: game.id });
							setMyGames((prev) =>
								prev.map((g) =>
									g.id === game.id
										? {
												...g,
												isPublic: true,
												version: result.version,
												buildNumber: result.buildNumber,
											}
										: g,
								),
							);
							Alert.alert(
								"Published!",
								`${game.title} is now live (v${result.version} build ${result.buildNumber}).`,
							);
						} catch (err) {
							const message =
								err instanceof Error ? err.message : "Failed to publish";
							Alert.alert("Error", message);
						}
					},
				},
			],
		);
	}, []);

	const displayName = useMemo(() => {
		const emailName =
			user?.email?.split("@")[0] ?? `${activeBrand.displayName} Creator`;
		return emailName;
	}, [user?.email]);

	const username = useMemo(() => {
		const raw = user?.email?.split("@")[0] ?? "slopcade";
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
					<View className="flex-row items-center justify-between">
						<Pressable
							className="h-10 w-10 items-center justify-center rounded-full bg-theme-surface-elevated"
							onPress={() => router.push("/notifications")}
						>
							<Ionicons
								name="notifications-outline"
								size={20}
								color={tokens.semantic.colors.text.primary}
							/>
						</Pressable>
						<Pressable
							className="h-10 w-10 items-center justify-center rounded-full bg-theme-surface-elevated"
							onPress={() => router.push("/discover")}
						>
							<Ionicons
								name="person-add-outline"
								size={20}
								color={tokens.semantic.colors.text.primary}
							/>
						</Pressable>
					</View>

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

					<View className="flex-row items-center justify-around mt-8">
						<Pressable
							className="items-center"
							onPress={() =>
								router.push({
									pathname: "/user/followers",
									params: { userId: user!.id, tab: "followers" },
								})
							}
						>
							<Text className="text-theme-text text-4xl font-semibold">
								{profileData?.followerCount ?? 0}
							</Text>
							<Text className="text-theme-text-secondary text-2xl mt-1">
								followers
							</Text>
						</Pressable>
						<Pressable
							className="items-center"
							onPress={() =>
								router.push({
									pathname: "/user/followers",
									params: { userId: user!.id, tab: "following" },
								})
							}
						>
							<Text className="text-theme-text text-4xl font-semibold">
								{profileData?.followingCount ?? 0}
							</Text>
							<Text className="text-theme-text-secondary text-2xl mt-1">
								following
							</Text>
						</Pressable>
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

					<View className="flex-row items-center justify-around mt-8 pb-4 border-b border-theme-border">
						<Pressable className="items-center">
							<Ionicons
								name="grid"
								size={24}
								color={tokens.semantic.colors.text.primary}
							/>
						</Pressable>
						<Pressable className="items-center">
							<Ionicons
								name="videocam"
								size={24}
								color={tokens.semantic.colors.text.secondary}
							/>
						</Pressable>
						<Pressable className="items-center">
							<Ionicons
								name="heart-dislike-outline"
								size={24}
								color={tokens.semantic.colors.text.secondary}
							/>
						</Pressable>
						<Pressable className="items-center">
							<Ionicons
								name="heart-dislike"
								size={24}
								color={tokens.semantic.colors.text.secondary}
							/>
						</Pressable>
					</View>

					<View className="mt-6 rounded-3xl bg-theme-surface p-4 border border-theme-border">
						<Text className="text-theme-text text-2xl font-semibold mb-3">
							Account Actions
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
						{activeBrand.features.organizations && (
							<Pressable
								className="mb-3 bg-theme-surface-elevated h-12 rounded-full items-center justify-center border border-theme-border"
								onPress={() => router.push("/settings/my-org")}
							>
								<Text className="text-theme-text text-base font-semibold">
									My Church
								</Text>
							</Pressable>
						)}
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

					<View className="mt-6">
						<Text className="text-theme-text text-2xl font-semibold mb-4">
							My Games
						</Text>
						{isLoadingGames ? (
							<View className="items-center py-12">
								<ActivityIndicator
									size="large"
									color={tokens.semantic.colors.primary}
								/>
								<Text className="text-theme-text-secondary mt-4">
									Loading games...
								</Text>
							</View>
						) : myGames.length === 0 ? (
							<View className="rounded-3xl bg-theme-surface border border-theme-border p-6 min-h-[200px] items-center justify-center">
								<Text className="text-5xl mb-4">🎮</Text>
								<Text className="text-theme-text text-xl font-semibold">
									No games yet
								</Text>
								{activeBrand.features.userGeneratedContent && (
									<Text className="text-theme-text-secondary text-base mt-2 text-center">
										Tap the + button to create your first game!
									</Text>
								)}
							</View>
						) : (
							<View>
								<Text className="text-theme-text-secondary text-sm mb-3">
									{myGames.length} game{myGames.length !== 1 ? "s" : ""} · Long
									press to delete
								</Text>
								{myGames.map((game) => (
									<Pressable
										key={game.id}
										className="bg-theme-surface p-4 rounded-2xl border border-theme-border mb-3 active:bg-theme-surface-elevated"
										onPress={() => {
											if (game.isPublic) {
												router.push(`/game-detail/${game.id}`);
											} else {
												router.push(`/editor/${game.id}`);
											}
										}}
										onLongPress={() => handleDeleteGame(game)}
									>
										<View className="flex-row items-center justify-between">
											<View className="flex-1 mr-3">
												<View className="flex-row items-center gap-2 mb-1">
													<Text
														className="text-lg font-semibold text-theme-text"
														numberOfLines={1}
													>
														{game.title}
													</Text>
													<View
														style={{
															paddingHorizontal: 8,
															paddingVertical: 2,
															borderRadius: 4,
															backgroundColor: game.isPublic
																? "rgba(34,197,94,0.15)"
																: "rgba(156,163,175,0.15)",
														}}
													>
														<Text
															style={{
																fontSize: 11,
																fontWeight: "600",
																color: game.isPublic
																	? tokens.semantic.colors.success
																	: tokens.semantic.colors.text.tertiary,
															}}
														>
															{game.isPublic ? "Published" : "Draft"}
														</Text>
													</View>
												</View>
												{game.description && (
													<Text
														className="text-theme-text-secondary mt-1"
														numberOfLines={2}
													>
														{game.description}
													</Text>
												)}
												<Text className="text-xs text-theme-text-tertiary mt-2">
													v{game.version} ({game.buildNumber}) ·{" "}
													{game.playCount} plays ·{" "}
													{new Date(game.createdAt).toLocaleDateString()}
												</Text>
											</View>
											<View className="items-end gap-2">
												<Pressable
													className="px-3 py-1.5 rounded-lg"
													style={{
														backgroundColor: game.isPublic
															? "rgba(99,102,241,0.15)"
															: "rgba(34,197,94,0.15)",
													}}
													onPress={(e) => {
														e.stopPropagation();
														handlePublishGame(game);
													}}
												>
													<Text
														style={{
															fontSize: 12,
															fontWeight: "600",
															color: game.isPublic
																? tokens.semantic.colors.primary
																: tokens.semantic.colors.success,
														}}
													>
														{game.isPublic ? "Update" : "Publish"}
													</Text>
												</Pressable>
												<Ionicons
													name="chevron-forward"
													size={18}
													color={tokens.semantic.colors.text.tertiary}
												/>
											</View>
										</View>
									</Pressable>
								))}
							</View>
						)}
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
							Invite someone to join {activeBrand.displayName} by email. They
							will be able to sign in once invited.
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
