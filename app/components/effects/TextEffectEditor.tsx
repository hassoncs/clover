import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import type { EffectGraphSpec, ParamValue } from '@slopcade/shared';
import {
  detectDeviceTier,
  getMobileEffectLimits,
  TEXT_EFFECT_PRESETS,
  type DeviceTier,
} from '@slopcade/shared/effects/text';
import { EffectTuningPanel } from './EffectTuningPanel';

interface TextEffectEditorProps {
  initialText?: string;
  onApply: (spec: EffectGraphSpec) => void;
  onPreview?: (spec: EffectGraphSpec) => void;
}

interface GeneratedEffect {
  spec: EffectGraphSpec;
  tier: DeviceTier;
}

export function TextEffectEditor({
  initialText = 'Hello World',
  onApply,
  onPreview,
}: TextEffectEditorProps) {
  const [text, setText] = useState(initialText);
  const [description, setDescription] = useState('');
  const [selectedTier, setSelectedTier] = useState<DeviceTier>(detectDeviceTier());
  const [generatedEffect, setGeneratedEffect] = useState<GeneratedEffect | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const limits = useMemo(() => getMobileEffectLimits(selectedTier), [selectedTier]);

  const handleGenerate = useCallback(async () => {
    if (!description.trim()) return;

    setIsGenerating(true);
    try {
      const spec = await generateTextEffect(description, text, selectedTier);
      setGeneratedEffect({ spec, tier: selectedTier });
      onPreview?.(spec);
    } catch (error) {
      console.error('Failed to generate text effect:', error);
    } finally {
      setIsGenerating(false);
    }
  }, [description, text, selectedTier, onPreview]);

  const handlePresetSelect = useCallback(
    async (presetKey: keyof typeof TEXT_EFFECT_PRESETS) => {
      const preset = TEXT_EFFECT_PRESETS[presetKey];
      setIsGenerating(true);
      try {
        const spec = await generatePresetEffect(presetKey, text, selectedTier);
        setGeneratedEffect({ spec, tier: selectedTier });
        onPreview?.(spec);
      } catch (error) {
        console.error('Failed to apply preset:', error);
      } finally {
        setIsGenerating(false);
      }
    },
    [text, selectedTier, onPreview]
  );

  const handleParamChange = useCallback(
    (nodeId: string, key: string, value: ParamValue) => {
      if (!generatedEffect) return;

      const updatedSpec: EffectGraphSpec = {
        ...generatedEffect.spec,
        nodes: generatedEffect.spec.nodes.map((node) =>
          node.id === nodeId
            ? { ...node, params: { ...node.params, [key]: value } }
            : node
        ),
      };

      setGeneratedEffect({ ...generatedEffect, spec: updatedSpec });
      onPreview?.(updatedSpec);
    },
    [generatedEffect, onPreview]
  );

  return (
    <ScrollView className="flex-1 bg-gray-900">
      <View className="p-4">
        <Text className="text-white text-xl font-bold mb-4">Text Effect Editor</Text>

        <View className="mb-4">
          <Text className="text-gray-400 text-sm mb-2">Text Content</Text>
          <TextInput
            value={text}
            onChangeText={setText}
            className="bg-gray-800 text-white p-3 rounded-lg"
            placeholder="Enter text..."
            placeholderTextColor="#666"
          />
        </View>

        <View className="mb-4">
          <Text className="text-gray-400 text-sm mb-2">Device Tier</Text>
          <View className="flex-row gap-2">
            {(['low', 'mid', 'high'] as DeviceTier[]).map((tier) => (
              <TouchableOpacity
                key={tier}
                onPress={() => setSelectedTier(tier)}
                className={`px-4 py-2 rounded-lg ${
                  selectedTier === tier ? 'bg-purple-600' : 'bg-gray-800'
                }`}
              >
                <Text className={`capitalize ${selectedTier === tier ? 'text-white' : 'text-gray-400'}`}>
                  {tier}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text className="text-gray-500 text-xs mt-2">
            Max {limits.maxEffectsPerText} effects, {limits.maxSamples} samples
            {limits.enableBlur ? ', blur enabled' : ', no blur'}
          </Text>
        </View>

        <View className="mb-4">
          <Text className="text-gray-400 text-sm mb-2">Presets</Text>
          <View className="flex-row flex-wrap gap-2">
            {Object.entries(TEXT_EFFECT_PRESETS).map(([key, preset]) => (
              <TouchableOpacity
                key={key}
                onPress={() => handlePresetSelect(key as keyof typeof TEXT_EFFECT_PRESETS)}
                className="bg-gray-800 px-3 py-2 rounded-lg"
              >
                <Text className="text-white text-sm">{preset.name}</Text>
                <Text className="text-gray-500 text-xs">{preset.tier}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View className="mb-4">
          <Text className="text-gray-400 text-sm mb-2">AI Description</Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            className="bg-gray-800 text-white p-3 rounded-lg h-20"
            placeholder="Describe the effect (e.g., 'Neon sign with cyan glow')..."
            placeholderTextColor="#666"
            multiline
          />
          <TouchableOpacity
            onPress={handleGenerate}
            disabled={isGenerating || !description.trim()}
            className={`mt-2 p-3 rounded-lg ${
              isGenerating || !description.trim() ? 'bg-gray-700' : 'bg-purple-600'
            }`}
          >
            {isGenerating ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white text-center font-semibold">Generate Effect</Text>
            )}
          </TouchableOpacity>
        </View>

        {generatedEffect && (
          <View className="mt-4">
            <Text className="text-white text-lg font-semibold mb-2">Effect Parameters</Text>
            <EffectTuningPanel
              spec={generatedEffect.spec}
              onParamChange={handleParamChange}
            />
            <TouchableOpacity
              onPress={() => onApply(generatedEffect.spec)}
              className="mt-4 bg-green-600 p-3 rounded-lg"
            >
              <Text className="text-white text-center font-semibold">Apply to Game</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

async function generateTextEffect(
  description: string,
  text: string,
  tier: DeviceTier
): Promise<EffectGraphSpec> {
  const response = await fetch('/api/ai/generate-text-effect', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ description, text, tier }),
  });

  if (!response.ok) {
    throw new Error('Failed to generate text effect');
  }

  return response.json();
}

async function generatePresetEffect(
  preset: keyof typeof TEXT_EFFECT_PRESETS,
  text: string,
  tier: DeviceTier
): Promise<EffectGraphSpec> {
  const response = await fetch('/api/ai/generate-text-preset', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ preset, text, tier }),
  });

  if (!response.ok) {
    throw new Error('Failed to generate preset effect');
  }

  return response.json();
}
