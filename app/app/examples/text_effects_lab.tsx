import { useState, useCallback } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, ScrollView } from 'react-native';
import { GameRuntimeGodot } from '@/lib/game-engine/GameRuntime.godot';
import type { GameDefinition, EffectGraphSpec } from '@slopcade/shared';
import type { ExampleMeta } from '@/lib/registry/types';
import { TextEffectEditor } from '@/components/effects/TextEffectEditor';
import { TEXT_EFFECT_PRESETS, detectDeviceTier } from '@slopcade/shared/effects/text';

export const metadata: ExampleMeta = {
  title: 'Text Effects Lab',
  description: 'Experiment with dynamic text effects, fonts, and shaders',
};

const BUBBLE_FONT = 'https://github.com/google/fonts/raw/main/ofl/modak/Modak-Regular.ttf';
const PIXEL_FONT = 'https://github.com/google/fonts/raw/main/ofl/pressstart2p/PressStart2P-Regular.ttf';
const RETRO_FONT = 'https://github.com/google/fonts/raw/main/ofl/vt323/VT323-Regular.ttf';

const FONT_OPTIONS = [
  { name: 'Default', url: '' },
  { name: 'Bubble (Modak)', url: BUBBLE_FONT },
  { name: 'Pixel (PressStart2P)', url: PIXEL_FONT },
  { name: 'Retro (VT323)', url: RETRO_FONT },
];

export default function TextEffectsLab() {
  const [selectedFont, setSelectedFont] = useState(FONT_OPTIONS[0]);
  const [textEffectSpec, setTextEffectSpec] = useState<EffectGraphSpec | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const deviceTier = detectDeviceTier();

  const createGameDefinition = useCallback(
    (_effectSpec?: EffectGraphSpec | null): GameDefinition => {
      const baseGame: GameDefinition = {
        metadata: {
          id: 'text-effects-lab',
          title: 'Text Effects Lab',
          description: 'Dynamic text rendering with shader effects',
          version: '1.0.0',
        },
        world: {
          bounds: { width: 10, height: 10 },
          gravity: { x: 0, y: 0 },
          pixelsPerMeter: 50,
        },
        templates: {
          text: {
            id: 'text',
            visual: { type: 'rect', width: 0, height: 0, color: '#FFFFFF' },
          },
        },
        entities: [
          {
            id: 'title',
            name: 'Title',
            template: 'text',
            transform: { x: 0, y: 3, angle: 0, scaleX: 1, scaleY: 1 },
            visual: {
              type: 'rect',
              width: 0,
              height: 0,
              text: 'TEXT FX',
              fontSize: 80,
              color: '#FFD700',
              fontUrl: selectedFont.url,
            } as any,
          },
          {
            id: 'subtitle',
            name: 'Subtitle',
            template: 'text',
            transform: { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
            visual: {
              type: 'rect',
              width: 0,
              height: 0,
              text: 'Dynamic Font Loading + Shaders',
              fontSize: 24,
              color: '#FFFFFF',
              fontUrl: selectedFont.url,
            } as any,
          },
          {
            id: 'tier-indicator',
            name: 'Tier',
            template: 'text',
            transform: { x: 0, y: -3, angle: 0, scaleX: 1, scaleY: 1 },
            visual: {
              type: 'rect',
              width: 0,
              height: 0,
              text: `Device Tier: ${deviceTier.toUpperCase()}`,
              fontSize: 18,
              color: '#00FF00',
              fontUrl: selectedFont.url,
            } as any,
          },
        ],

      };

      return baseGame;
    },
    [selectedFont, deviceTier]
  );

  const [game, setGame] = useState<GameDefinition>(() => createGameDefinition());

  const handleApplyEffect = useCallback(
    (spec: EffectGraphSpec) => {
      setTextEffectSpec(spec);
      setGame(createGameDefinition(spec));
      setShowEditor(false);
    },
    [createGameDefinition]
  );

  const handleQuickPreset = useCallback(
    (presetKey: keyof typeof TEXT_EFFECT_PRESETS) => {
      const preset = TEXT_EFFECT_PRESETS[presetKey];
      const mockSpec: EffectGraphSpec = {
        id: `preset-${presetKey}`,
        version: '1.0.0',
        engineApiVersion: '1.0.0',
        scope: 'entity',
        nodes: [
          {
            id: 'textGen',
            type: preset.tier === 'msdf' ? 'msdfTextGenerator' : 'subViewportTextGenerator',
            family: 'generator',
            inputSlots: [],
            params: {
              fontUrl: selectedFont.url,
              ...(preset.params.sdfEffects ?? {}),
            },
            outputTarget: {
              bufferId: 'final',
              format: 'rgba8',
              resolution: 'full',
            },
            flags: { stateful: false, fusible: 'never' },
          },
        ],
        connections: [],
        feedbackEdges: [],
        lifecycle: { autoStart: true, stopMode: 'freeze' },
      };
      handleApplyEffect(mockSpec);
    },
    [selectedFont.url, handleApplyEffect]
  );

  if (showEditor) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setShowEditor(false)} style={styles.backButton}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
        </View>
        <TextEffectEditor
          initialText="TEXT FX"
          onApply={handleApplyEffect}
          onPreview={(spec) => setGame(createGameDefinition(spec))}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.game}>
        <GameRuntimeGodot definition={game} />
      </View>

      <ScrollView style={styles.controls}>
        <Text style={styles.label}>Select Font:</Text>
        <View style={styles.buttonRow}>
          {FONT_OPTIONS.map((font) => (
            <TouchableOpacity
              key={font.name}
              style={[
                styles.button,
                selectedFont.name === font.name && styles.buttonActive,
              ]}
              onPress={() => setSelectedFont(font)}
            >
              <Text style={styles.buttonText}>{font.name}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Quick Presets:</Text>
        <View style={styles.buttonRow}>
          {Object.entries(TEXT_EFFECT_PRESETS).map(([key, preset]) => (
            <TouchableOpacity
              key={key}
              style={styles.presetButton}
              onPress={() => handleQuickPreset(key as keyof typeof TEXT_EFFECT_PRESETS)}
            >
              <Text style={styles.presetButtonText}>{preset.name}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={styles.aiButton}
          onPress={() => setShowEditor(true)}
        >
          <Text style={styles.aiButtonText}>🎨 Open AI Effect Editor</Text>
        </TouchableOpacity>

        {textEffectSpec && (
          <View style={styles.effectInfo}>
            <Text style={styles.effectInfoText}>
              Active Effect: {textEffectSpec.id}
            </Text>
            <Text style={styles.effectInfoSubtext}>
              Nodes: {textEffectSpec.nodes.length} | Tier: {deviceTier}
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    padding: 16,
    backgroundColor: '#111',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  backButton: {
    alignSelf: 'flex-start',
  },
  backButtonText: {
    color: '#FFD700',
    fontSize: 16,
    fontWeight: '600',
  },
  game: {
    flex: 1,
  },
  controls: {
    padding: 20,
    backgroundColor: '#111',
    borderTopWidth: 1,
    borderTopColor: '#333',
    maxHeight: 300,
  },
  label: {
    color: '#fff',
    marginBottom: 10,
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
    flexWrap: 'wrap',
  },
  button: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#333',
  },
  buttonActive: {
    backgroundColor: '#FFD700',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
  },
  presetButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#4a4a4a',
  },
  presetButtonText: {
    color: '#FFD700',
    fontWeight: '600',
    fontSize: 12,
  },
  aiButton: {
    backgroundColor: '#6200ee',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  aiButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  effectInfo: {
    marginTop: 20,
    padding: 12,
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#00FF00',
  },
  effectInfoText: {
    color: '#fff',
    fontWeight: '600',
  },
  effectInfoSubtext: {
    color: '#888',
    fontSize: 12,
    marginTop: 4,
  },
});
