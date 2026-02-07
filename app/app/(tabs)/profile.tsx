import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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

function initialsFromEmail(email: string | undefined): string {
  if (!email) return "SC";
  const base = email.split("@")[0] ?? "";
  const parts = base.split(/[._-]/).filter(Boolean);
  if (parts.length === 0) return base.slice(0, 2).toUpperCase() || "SC";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

export default function ProfileScreen() {
  const router = useRouter();
  const { user, signOut } = useAuth();
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
