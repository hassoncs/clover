import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Modal } from "react-native";
import { trpcReact } from "@/lib/trpc/react";

interface SignupCodeGateProps {
  visible: boolean;
  onDismiss: () => void;
  onSuccess: () => void;
}

export function SignupCodeGate({ visible, onDismiss, onSuccess }: SignupCodeGateProps) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  const utils = trpcReact.useUtils();

  const redeemMutation = trpcReact.economy.redeemSignupCode.useMutation({
    onSuccess: async (data) => {
      await utils.economy.getBalance.invalidate();
      await utils.economy.hasRedeemedSignupCode.invalidate();
      onSuccess();
    },
    onError: (err) => {
      setError(err.message);
      setIsValidating(false);
    },
  });

  const validateQuery = trpcReact.economy.validateSignupCode.useQuery(
    { code: code.trim() },
    { 
      enabled: false,
      retry: false 
    }
  );

  const handleSubmit = async () => {
    if (!code.trim()) return;
    
    setError(null);
    setIsValidating(true);

    try {
      // First validate
      const validation = await validateQuery.refetch();
      
      if (validation.data?.valid) {
        // If valid, redeem
        redeemMutation.mutate({ code: code.trim() });
      } else {
        // Type narrowing: if valid is false, error exists
        const errorMsg = !validation.data?.valid && 'error' in (validation.data || {}) 
          ? (validation.data as { error: string }).error 
          : "Invalid code";
        setError(errorMsg);
        setIsValidating(false);
      }
    } catch (err) {
      setError("Failed to validate code");
      setIsValidating(false);
    }
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <View className="flex-1 justify-center items-center bg-black/80 px-4">
        <View className="w-full max-w-sm bg-gray-900 border border-gray-700 rounded-2xl p-6 shadow-xl">
          <Text className="text-2xl font-bold text-white text-center mb-2">
            Have a Signup Code?
          </Text>
          
          <Text className="text-gray-400 text-center mb-6">
            Enter your code to unlock 1,000 Sparks ($1.00) for generating game assets.
          </Text>

          <View className="mb-4">
            <TextInput
              className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-lg text-center font-bold tracking-widest"
              placeholder="ENTER CODE"
              placeholderTextColor="#666"
              value={code}
              onChangeText={(text) => {
                setCode(text.toUpperCase());
                setError(null);
              }}
              autoCapitalize="characters"
              autoCorrect={false}
              editable={!isValidating && !redeemMutation.isPending}
            />
            {error && (
              <Text className="text-red-400 text-center mt-2 text-sm">
                {error}
              </Text>
            )}
          </View>

          <TouchableOpacity
            className={`w-full py-4 rounded-xl items-center mb-3 ${
              isValidating || redeemMutation.isPending || !code.trim()
                ? "bg-gray-700"
                : "bg-green-600 active:bg-green-700"
            }`}
            onPress={handleSubmit}
            disabled={isValidating || redeemMutation.isPending || !code.trim()}
          >
            {isValidating || redeemMutation.isPending ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white font-bold text-lg">
                Redeem & Start
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            className="py-2"
            onPress={onDismiss}
            disabled={isValidating || redeemMutation.isPending}
          >
            <Text className="text-gray-500 text-center font-medium">
              I don't have a code (Skip)
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
