import { useState, useEffect } from 'react';
import { View, Text, TextInput, Pressable, Modal, ActivityIndicator, ScrollView } from 'react-native';
import { trpc } from '@/lib/trpc/client';

interface ThemeEditorModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: () => void;
  editingTheme?: {
    id: string;
    name: string;
    promptModifier: string;
  } | null;
}

export function ThemeEditorModal({
  visible,
  onClose,
  onSave,
  editingTheme,
}: ThemeEditorModalProps) {
  const [name, setName] = useState('');
  const [promptModifier, setPromptModifier] = useState('');
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditing = !!editingTheme;

  useEffect(() => {
    if (visible) {
      if (editingTheme) {
        setName(editingTheme.name);
        setPromptModifier(editingTheme.promptModifier);
      } else {
        setName('');
        setPromptModifier('');
      }
      setError(null);
    }
  }, [editingTheme, visible]);

  const handleEnhance = async () => {
    if (!promptModifier.trim()) {
      setError('Enter a prompt to enhance');
      return;
    }
    
    setIsEnhancing(true);
    setError(null);
    try {
      const result = await trpc.assetSystem.themes.enhancePrompt.mutate({
        prompt: promptModifier,
        name: name || undefined,
      });
      setPromptModifier(result.enhancedPrompt);
    } catch (err: any) {
      setError(err.message || 'Failed to enhance prompt');
    } finally {
      setIsEnhancing(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Name is required');
      return;
    }
    if (!promptModifier.trim()) {
      setError('Prompt is required');
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      if (isEditing) {
        await trpc.assetSystem.themes.update.mutate({
          id: editingTheme!.id,
          name: name.trim(),
          promptModifier: promptModifier.trim(),
        });
      } else {
        await trpc.assetSystem.themes.create.mutate({
          name: name.trim(),
          promptModifier: promptModifier.trim(),
        });
      }
      onSave();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save theme');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-gray-900">
        <View className="flex-row items-center justify-between p-4 border-b border-gray-800">
          <Pressable 
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Cancel"
          >
            <Text className="text-gray-400 text-lg">Cancel</Text>
          </Pressable>
          <Text className="text-white text-lg font-semibold">
            {isEditing ? 'Edit Theme' : 'New Theme'}
          </Text>
          <Pressable 
            onPress={handleSave} 
            disabled={isSaving}
            accessibilityRole="button"
            accessibilityLabel="Save theme"
            accessibilityState={{ disabled: isSaving }}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color="#818CF8" />
            ) : (
              <Text className="text-indigo-400 text-lg font-semibold">Save</Text>
            )}
          </Pressable>
        </View>

        <ScrollView className="flex-1 p-4">
          {error && (
            <View className="bg-red-900/50 p-3 rounded-lg mb-4">
              <Text className="text-red-300">{error}</Text>
            </View>
          )}

          <View className="mb-4">
            <Text className="text-gray-400 text-sm mb-2">Name</Text>
            <TextInput
              className="bg-gray-800 text-white p-3 rounded-lg border border-gray-700"
              placeholder="e.g., Medieval Fantasy"
              placeholderTextColor="#6B7280"
              value={name}
              onChangeText={setName}
              accessibilityLabel="Theme name"
            />
          </View>

          <View className="mb-4">
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-gray-400 text-sm">Prompt</Text>
              <Pressable 
                onPress={handleEnhance} 
                disabled={isEnhancing}
                className="flex-row items-center"
                accessibilityRole="button"
                accessibilityLabel="Enhance prompt with AI"
                accessibilityState={{ disabled: isEnhancing }}
              >
                {isEnhancing ? (
                  <ActivityIndicator size="small" color="#818CF8" />
                ) : (
                  <Text className="text-indigo-400 text-sm">✨ Enhance with AI</Text>
                )}
              </Pressable>
            </View>
            <TextInput
              className="bg-gray-800 text-white p-3 rounded-lg border border-gray-700 min-h-[120px]"
              placeholder="e.g., dark fantasy with stone textures and gothic architecture"
              placeholderTextColor="#6B7280"
              value={promptModifier}
              onChangeText={setPromptModifier}
              multiline
              textAlignVertical="top"
              accessibilityLabel="Theme prompt"
            />
          </View>

        </ScrollView>
      </View>
    </Modal>
  );
}
