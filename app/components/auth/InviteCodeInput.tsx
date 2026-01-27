import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator } from "react-native";
import { trpcReact } from "@/lib/trpc/react";

interface InviteCodeInputProps {
  onValidated: (code: string) => void;
}

export function InviteCodeInput({ onValidated }: InviteCodeInputProps) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isValid, setIsValid] = useState(false);

  const validateQuery = trpcReact.economy.validateSignupCode.useQuery(
    { code: code.trim() },
    { 
      enabled: false,
      retry: false 
    }
  );

  const handleValidate = async () => {
    if (!code.trim()) {
      setError("Please enter an invite code");
      return;
    }
    
    setError(null);
    setIsValidating(true);

    try {
      const validation = await validateQuery.refetch();
      
      if (validation.data?.valid) {
        setIsValid(true);
        onValidated(code.trim());
      } else {
        const errorMsg = !validation.data?.valid && 'error' in (validation.data || {}) 
          ? (validation.data as { error: string }).error 
          : "Invalid invite code";
        setError(errorMsg);
      }
    } catch (err) {
      setError("Failed to validate code");
    } finally {
      setIsValidating(false);
    }
  };

  if (isValid) {
    return (
      <View className="w-full bg-green-900/30 p-4 rounded-xl border border-green-700 mb-4">
        <Text className="text-green-300 text-center font-semibold">
          ✓ Invite code verified
        </Text>
        <Text className="text-green-400 text-center text-sm mt-1">
          You can now sign in below
        </Text>
      </View>
    );
  }

  return (
    <View className="w-full bg-gray-800/50 p-4 rounded-xl border border-gray-700 mb-4">
      <Text className="text-white font-semibold text-center mb-2">
        🎫 Have an Invite Code?
      </Text>
      <Text className="text-gray-400 text-center text-sm mb-3">
        Slopcade is invite-only during beta
      </Text>

      <View className="mb-2">
        <TextInput
          className="bg-gray-800 border border-gray-600 rounded-xl px-4 py-3 text-white text-center font-bold tracking-widest"
          placeholder="ENTER INVITE CODE"
          placeholderTextColor="#666"
          value={code}
          onChangeText={(text) => {
            setCode(text.toUpperCase());
            setError(null);
          }}
          autoCapitalize="characters"
          autoCorrect={false}
          editable={!isValidating}
        />
        {error && (
          <Text className="text-red-400 text-center mt-2 text-sm">
            {error}
          </Text>
        )}
      </View>

      <TouchableOpacity
        className={`w-full py-3 rounded-xl items-center ${
          isValidating || !code.trim()
            ? "bg-gray-700"
            : "bg-indigo-600 active:bg-indigo-700"
        }`}
        onPress={handleValidate}
        disabled={isValidating || !code.trim()}
      >
        {isValidating ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text className="text-white font-bold">
            Verify Invite Code
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
}
