import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/hooks/useAuth";
import { CreditBalance } from "@/components/economy/CreditBalance";
import { CurrencySheet } from "@/components/economy/CurrencySheet";
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
  const { signInWithGoogle, sendMagicLink } = useAuth();

  const [loginEmail, setLoginEmail] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [magicLinkSent, setMagicLinkSent] = useState(false);

  const { data: inviteStatus, isLoading: isCheckingInvite } = trpcReact.invites.isEmailInvited.useQuery(
    { email: loginEmail },
    { enabled: loginEmail.length > 0 && loginEmail.includes("@") }
  );

  const handleGoogleSignIn = useCallback(async () => {
    setIsLoggingIn(true);
    setLoginError(null);
    try {
      await signInWithGoogle();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to sign in with Google";
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
      setLoginError("This email hasn't been invited to Slopcade yet. Invited users can sign in.");
      return;
    }

    setIsLoggingIn(true);
    setLoginError(null);
    try {
      await sendMagicLink(loginEmail.trim());
      setMagicLinkSent(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to send magic link";
      setLoginError(message);
    } finally {
      setIsLoggingIn(false);
    }
  }, [loginEmail, sendMagicLink, inviteStatus]);

  return (
    <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 130 }}>
      <View className="p-6 items-center">
        <Image
          source={heroImage}
          style={{ width: 280, height: 140, marginBottom: 24 }}
          resizeMode="contain"
        />
        <Text className="text-gray-400 text-center mb-8">
          Sign in to create and save your games
        </Text>

        {magicLinkSent ? (
          <View className="w-full bg-green-900/30 p-6 rounded-xl border border-green-700 mb-6">
            <Text className="text-green-300 text-center text-lg font-semibold mb-2">
              Check your email!
            </Text>
            <Text className="text-green-400 text-center">
              We sent a magic link to {loginEmail}
            </Text>
            <Pressable
              className="mt-4 py-2"
              onPress={() => {
                setMagicLinkSent(false);
                setLoginEmail("");
              }}
            >
              <Text className="text-green-400 text-center underline">
                Use a different email
              </Text>
            </Pressable>
          </View>
        ) : (
          <>
            <View className="w-full mb-6">
              <TextInput
                className="bg-gray-800 p-4 rounded-xl border border-gray-700 text-white text-base mb-3"
                placeholder="Enter your email"
                placeholderTextColor="#666"
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
                      <ActivityIndicator size="small" color="#666" />
                      <Text className="text-gray-500 ml-2 text-sm">Checking invite status...</Text>
                    </View>
                  ) : inviteStatus?.invited === false ? (
                    <View className="flex-row items-center">
                      <Text className="text-red-400 mr-2">✕</Text>
                      <Text className="text-red-400 text-sm">Not invited</Text>
                    </View>
                  ) : inviteStatus?.invited === true ? (
                    <View className="flex-row items-center">
                      <Text className="text-green-400 mr-2">✓</Text>
                      <Text className="text-green-400 text-sm">Invited</Text>
                    </View>
                  ) : null}
                </View>
              )}

              <Pressable
                className={`py-4 rounded-xl items-center ${
                  isLoggingIn || (loginEmail.length > 0 && inviteStatus?.invited === false)
                    ? "bg-gray-600"
                    : "bg-indigo-600 active:bg-indigo-700"
                }`}
                onPress={handleMagicLink}
                disabled={isLoggingIn || (loginEmail.length > 0 && inviteStatus?.invited === false)}
              >
                <Text className="text-white font-semibold text-base">
                  {isLoggingIn ? "Sending..." : "Send Magic Link"}
                </Text>
              </Pressable>
            </View>

            <View className="flex-row items-center w-full mb-6">
              <View className="flex-1 h-px bg-gray-700" />
              <Text className="text-gray-500 px-4">or</Text>
              <View className="flex-1 h-px bg-gray-700" />
            </View>

            <Pressable
              className={`w-full py-4 rounded-xl items-center flex-row justify-center ${
                isLoggingIn ? "bg-gray-600" : "bg-white active:bg-gray-100"
              }`}
              onPress={handleGoogleSignIn}
              disabled={isLoggingIn}
            >
              <Text className="text-gray-800 font-semibold text-base">
                Continue with Google
              </Text>
            </Pressable>
          </>
        )}

        {loginError && (
          <View className="w-full mt-4 p-4 bg-red-900/50 rounded-xl border border-red-700">
            <Text className="text-red-300 text-center">{loginError}</Text>
          </View>
        )}

        <View className="mt-8 p-4 bg-gray-800/50 rounded-xl">
          <Text className="text-gray-400 text-center text-sm">
            You can browse and play public games without signing in.
            Sign in to create, save, and manage your own games.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: isAuthLoading, signOut } = useAuth();
  const [showCurrencySheet, setShowCurrencySheet] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);
  const [isInviting, setIsInviting] = useState(false);
  const createInvite = trpcReact.invites.create.useMutation();

  const displayName = useMemo(() => {
    const emailName = user?.email?.split("@")[0] ?? "Slopcade Creator";
    return emailName;
  }, [user?.email]);

  const username = useMemo(() => {
    const raw = user?.email?.split("@")[0] ?? "slopcade";
    return raw.toLowerCase();
  }, [user?.email]);

  if (isAuthLoading) {
    return (
      <SafeAreaView className="flex-1 bg-black items-center justify-center" edges={["bottom"]}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text className="text-gray-400 mt-4">Loading...</Text>
      </SafeAreaView>
    );
  }

  if (!isAuthenticated) {
    return (
      <SafeAreaView className="flex-1 bg-black" edges={["bottom"]}>
        <LoginScreen />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-black" edges={["bottom"]}>
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 130 }}>
        <View className="px-5 pt-5">
          <View className="flex-row items-center justify-between">
            <Pressable className="h-10 w-10 items-center justify-center rounded-full bg-zinc-900/70">
              <Ionicons name="settings-outline" size={20} color="#E4E4E7" />
            </Pressable>
            <Pressable className="h-10 w-10 items-center justify-center rounded-full bg-zinc-900/70">
              <Ionicons name="person-add-outline" size={20} color="#E4E4E7" />
            </Pressable>
          </View>

          <View className="items-center mt-6">
            <View className="h-44 w-44 rounded-full items-center justify-center bg-zinc-800 border border-zinc-700">
              <Text className="text-zinc-100 text-6xl font-bold">{initialsFromEmail(user?.email)}</Text>
            </View>
            <Text className="text-zinc-100 text-5xl font-bold mt-4">{displayName}</Text>
            <Text className="text-zinc-400 text-3xl mt-1">{username}</Text>
          </View>

          <View className="flex-row items-center justify-around mt-8">
            <View className="items-center">
              <Text className="text-zinc-100 text-4xl font-semibold">0</Text>
              <Text className="text-zinc-500 text-2xl mt-1">followers</Text>
            </View>
            <View className="items-center">
              <Text className="text-zinc-100 text-4xl font-semibold">0</Text>
              <Text className="text-zinc-500 text-2xl mt-1">following</Text>
            </View>
          </View>

          <View className="flex-row mt-8 gap-3">
            <Pressable className="flex-1 h-14 rounded-full bg-zinc-700 items-center justify-center">
              <Text className="text-zinc-100 text-2xl font-semibold">Edit</Text>
            </Pressable>
            <Pressable className="flex-1 h-14 rounded-full bg-zinc-100 items-center justify-center">
              <Text className="text-black text-2xl font-semibold">Share</Text>
            </Pressable>
          </View>

          <View className="flex-row items-center justify-around mt-8 pb-4 border-b border-zinc-800">
            <Pressable className="items-center">
              <Ionicons name="grid" size={24} color="#F4F4F5" />
            </Pressable>
            <Pressable className="items-center">
              <Ionicons name="videocam" size={24} color="#71717A" />
            </Pressable>
            <Pressable className="items-center">
              <Ionicons name="heart-dislike-outline" size={24} color="#71717A" />
            </Pressable>
            <Pressable className="items-center">
              <Ionicons name="heart-dislike" size={24} color="#71717A" />
            </Pressable>
          </View>

          <View className="mt-6 rounded-3xl bg-zinc-900 p-4 border border-zinc-800">
            <Text className="text-zinc-100 text-2xl font-semibold mb-3">Account Actions</Text>
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-zinc-400 text-base">Sparks</Text>
              <CreditBalance onPress={() => setShowCurrencySheet(true)} />
            </View>
            <Pressable
              className="mb-3 bg-zinc-800 h-12 rounded-full items-center justify-center border border-zinc-700"
              onPress={() => router.push("/themes")}
            >
              <Text className="text-zinc-100 text-base font-semibold">Open Themes Library</Text>
            </Pressable>
            <View className="flex-row gap-3">
              <Pressable
                className="flex-1 bg-emerald-600 h-12 rounded-full items-center justify-center"
                onPress={() => setShowInviteModal(true)}
              >
                <Text className="text-white text-base font-semibold">Invite</Text>
              </Pressable>
              <Pressable className="flex-1 bg-zinc-700 h-12 rounded-full items-center justify-center" onPress={signOut}>
                <Text className="text-zinc-100 text-base font-semibold">Sign Out</Text>
              </Pressable>
            </View>
          </View>

          <View className="mt-6 rounded-3xl bg-zinc-950 border border-zinc-900 p-4 min-h-[260px] items-center justify-center">
            <Text className="text-zinc-100 text-4xl font-semibold">Your Posts</Text>
            <Text className="text-zinc-500 text-2xl mt-2">Nothing to see here, yet!</Text>
          </View>
        </View>
      </ScrollView>

      <Modal animationType="slide" transparent visible={showInviteModal} onRequestClose={() => setShowInviteModal(false)}>
        <SafeAreaView className="flex-1 bg-gray-900" edges={["bottom"]}>
          <View className="flex-1 p-6">
            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-2xl font-bold text-white">Invite Friend</Text>
              <Pressable onPress={() => setShowInviteModal(false)}>
                <Text className="text-gray-400 text-lg">✕</Text>
              </Pressable>
            </View>

            <Text className="text-gray-400 mb-4">
              Invite someone to join Slopcade by email. They will be able to sign in once invited.
            </Text>

            <TextInput
              className="w-full bg-gray-800 text-white p-4 rounded-xl border border-gray-700"
              placeholder="friend@example.com"
              placeholderTextColor="#6b7280"
              value={inviteEmail}
              onChangeText={setInviteEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              editable={!isInviting}
            />

            <Pressable
              className={`mt-4 py-4 rounded-xl items-center ${
                isInviting || !inviteEmail.includes("@") ? "bg-gray-600" : "bg-green-600 active:bg-green-700"
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
                  Alert.alert("Invite Failed", err instanceof Error ? err.message : "Failed to send invite");
                } finally {
                  setIsInviting(false);
                }
              }}
              disabled={isInviting || !inviteEmail.includes("@")}
            >
              {isInviting ? (
                <View className="flex-row items-center">
                  <ActivityIndicator color="white" size="small" />
                  <Text className="text-white font-bold text-lg ml-2">Sending...</Text>
                </View>
              ) : (
                <Text className="text-white font-bold text-lg">Send Invite</Text>
              )}
            </Pressable>

            {inviteSuccess && (
              <View className="mt-4 p-4 bg-green-900/30 rounded-xl border border-green-700">
                <Text className="text-green-400 text-center">{inviteSuccess}</Text>
              </View>
            )}
          </View>
        </SafeAreaView>
      </Modal>

      <CurrencySheet visible={showCurrencySheet} onClose={() => setShowCurrencySheet(false)} />
    </SafeAreaView>
  );
}
