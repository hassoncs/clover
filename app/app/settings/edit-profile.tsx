import { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
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
      <SafeAreaView className="flex-1 bg-gray-900 items-center justify-center">
        <ActivityIndicator size="large" color="#818CF8" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-900">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View className="flex-row items-center px-4 py-3 border-b border-gray-800">
          <Pressable onPress={() => router.back()} className="mr-3">
            <Ionicons name="arrow-back" size={24} color="#E4E4E7" />
          </Pressable>
          <Text className="text-white font-semibold text-lg flex-1">
            Edit Profile
          </Text>
          <Pressable
            onPress={handleSave}
            disabled={!hasChanges || updateProfile.isPending}
            className={`px-4 py-2 rounded-lg ${
              hasChanges && !updateProfile.isPending
                ? "bg-indigo-600 active:bg-indigo-700"
                : "bg-gray-700"
            }`}
          >
            {updateProfile.isPending ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text
                className={`font-semibold ${
                  hasChanges ? "text-white" : "text-gray-500"
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
              <Text className="text-gray-400 text-sm font-medium">
                Display Name
              </Text>
              <Text
                className={`text-xs ${
                  displayName.length > DISPLAY_NAME_MAX
                    ? "text-red-400"
                    : "text-gray-600"
                }`}
              >
                {displayName.length}/{DISPLAY_NAME_MAX}
              </Text>
            </View>
            <TextInput
              className="bg-gray-800 p-4 rounded-xl border border-gray-700 text-white text-base"
              value={displayName}
              onChangeText={(text) =>
                setDisplayName(text.slice(0, DISPLAY_NAME_MAX))
              }
              placeholder="Your display name"
              placeholderTextColor="#6B7280"
              maxLength={DISPLAY_NAME_MAX}
              autoCapitalize="words"
            />
          </View>

          <View className="mb-6">
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-gray-400 text-sm font-medium">Bio</Text>
              <Text
                className={`text-xs ${
                  bio.length > BIO_MAX ? "text-red-400" : "text-gray-600"
                }`}
              >
                {bio.length}/{BIO_MAX}
              </Text>
            </View>
            <TextInput
              className="bg-gray-800 p-4 rounded-xl border border-gray-700 text-white text-base"
              value={bio}
              onChangeText={(text) => setBio(text.slice(0, BIO_MAX))}
              placeholder="Tell people about yourself"
              placeholderTextColor="#6B7280"
              maxLength={BIO_MAX}
              multiline
              numberOfLines={4}
              style={{ minHeight: 100, textAlignVertical: "top" }}
            />
          </View>

          {saved && (
            <View className="bg-green-900/30 p-4 rounded-xl border border-green-700 mb-6">
              <Text className="text-green-400 text-center font-medium">
                Profile updated
              </Text>
            </View>
          )}

          {updateProfile.isError && (
            <View className="bg-red-900/30 p-4 rounded-xl border border-red-700 mb-6">
              <Text className="text-red-400 text-center">
                Failed to update profile. Please try again.
              </Text>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
