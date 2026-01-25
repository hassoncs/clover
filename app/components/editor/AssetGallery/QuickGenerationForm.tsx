import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator } from 'react-native';

interface QuickGenerationFormProps {
  theme: string;
  onThemeChange: (theme: string) => void;
  style: 'pixel' | 'cartoon' | '3d' | 'flat';
  onStyleChange: (style: 'pixel' | 'cartoon' | '3d' | 'flat') => void;
  removeBackground: boolean;
  onRemoveBackgroundToggle: () => void;
  templateCount: number;
  isGenerating: boolean;
  isQuickCreating: boolean;
  progress: { completed: number; total: number };
  onGenerate: () => void;
}

const STYLE_OPTIONS = [
  { id: 'pixel' as const, label: 'Pixel', emoji: '🎮' },
  { id: 'cartoon' as const, label: 'Cartoon', emoji: '🎨' },
  { id: '3d' as const, label: '3D', emoji: '🧊' },
  { id: 'flat' as const, label: 'Flat', emoji: '📐' },
];

export function QuickGenerationForm({
  theme,
  onThemeChange,
  style,
  onStyleChange,
  removeBackground,
  onRemoveBackgroundToggle,
  templateCount,
  isGenerating,
  isQuickCreating,
  progress,
  onGenerate,
}: QuickGenerationFormProps) {
  const isBusy = isQuickCreating || isGenerating;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Generate All Assets</Text>
      <Text style={styles.subtitle}>
        Describe your game's visual theme and we'll generate sprites for all {templateCount} templates
      </Text>

      <TextInput
        style={styles.themeInput}
        placeholder="e.g., Dark fantasy medieval castle, spooky atmosphere..."
        placeholderTextColor="#6B7280"
        value={theme}
        onChangeText={onThemeChange}
        multiline
        numberOfLines={2}
        textAlignVertical="top"
      />

      <View style={styles.styleRow}>
        {STYLE_OPTIONS.map((option) => (
          <Pressable
            key={option.id}
            style={[
              styles.styleChip,
              style === option.id && styles.styleChipActive,
            ]}
            onPress={() => onStyleChange(option.id)}
          >
            <Text style={styles.styleChipEmoji}>{option.emoji}</Text>
            <Text style={[
              styles.styleChipText,
              style === option.id && styles.styleChipTextActive,
            ]}>
              {option.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <Pressable
        style={styles.bgRemoveToggle}
        onPress={onRemoveBackgroundToggle}
      >
        <View style={[styles.checkbox, removeBackground && styles.checkboxActive]}>
          {removeBackground && <Text style={styles.checkmark}>✓</Text>}
        </View>
        <Text style={styles.bgRemoveLabel}>Remove backgrounds (cleaner sprites)</Text>
      </Pressable>

      <Pressable
        style={[
          styles.quickGenerateButton,
          isBusy && styles.quickGenerateButtonDisabled,
        ]}
        onPress={onGenerate}
        disabled={isBusy}
      >
        {isBusy ? (
          <View style={styles.generateButtonContent}>
            <ActivityIndicator size="small" color="#FFFFFF" />
            <Text style={styles.quickGenerateButtonText}>
              {isGenerating ? `${progress.completed}/${progress.total} Generating...` : 'Creating...'}
            </Text>
          </View>
        ) : (
          <Text style={styles.quickGenerateButtonText}>
            Generate {templateCount} Assets
          </Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#374151',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    color: '#9CA3AF',
    fontSize: 14,
    marginBottom: 16,
    lineHeight: 20,
  },
  themeInput: {
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 14,
    color: '#FFFFFF',
    fontSize: 15,
    marginBottom: 16,
    minHeight: 60,
  },
  styleRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  styleChip: {
    flex: 1,
    backgroundColor: '#1F2937',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  styleChipActive: {
    borderColor: '#4F46E5',
    backgroundColor: '#312E81',
  },
  styleChipEmoji: {
    fontSize: 20,
    marginBottom: 4,
  },
  styleChipText: {
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '500',
  },
  styleChipTextActive: {
    color: '#FFFFFF',
  },
  bgRemoveToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingVertical: 8,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#6B7280',
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: {
    backgroundColor: '#4F46E5',
    borderColor: '#4F46E5',
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  bgRemoveLabel: {
    color: '#D1D5DB',
    fontSize: 14,
  },
  quickGenerateButton: {
    backgroundColor: '#4F46E5',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  quickGenerateButtonDisabled: {
    backgroundColor: '#6366F1',
    opacity: 0.7,
  },
  quickGenerateButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  generateButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});
