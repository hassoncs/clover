import { View, Text, Pressable, TextInput, StyleSheet, Modal, ScrollView, ActivityIndicator } from 'react-native';
import { useState } from 'react';

interface AssetPackInfo {
  id: string;
  gameId: string;
  name: string;
  description?: string | null;
  promptDefaults?: {
    themePrompt?: string;
    styleOverride?: string;
    modelId?: string;
    negativePrompt?: string;
  };
  createdAt: number;
  deletedAt?: number | null;
}

interface AssetPackSelectorProps {
  visible: boolean;
  onClose: () => void;
  packs: AssetPackInfo[];
  selectedPackId?: string;
  totalTemplates: number;
  onSelectPack: (packId: string) => void;
  onCreatePack: (name: string, style?: 'pixel' | 'cartoon' | '3d' | 'flat') => void;
  isCreating?: boolean;
}

const STYLE_OPTIONS: { id: 'pixel' | 'cartoon' | '3d' | 'flat'; label: string; emoji: string }[] = [
  { id: 'pixel', label: 'Pixel Art', emoji: '🎮' },
  { id: 'cartoon', label: 'Cartoon', emoji: '🎨' },
  { id: '3d', label: '3D Render', emoji: '🧊' },
  { id: 'flat', label: 'Flat Design', emoji: '📐' },
];

export function AssetPackSelector({
  visible,
  onClose,
  packs,
  selectedPackId,
  totalTemplates,
  onSelectPack,
  onCreatePack,
  isCreating = false,
}: AssetPackSelectorProps) {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newPackName, setNewPackName] = useState('');
  const [newPackStyle, setNewPackStyle] = useState<'pixel' | 'cartoon' | '3d' | 'flat'>('pixel');

  const handleCreatePack = () => {
    if (!newPackName.trim()) return;
    onCreatePack(newPackName.trim(), newPackStyle);
    setNewPackName('');
    setShowCreateForm(false);
  };

  const getStyleEmoji = (style?: string) => {
    const option = STYLE_OPTIONS.find(s => s.id === style);
    return option?.emoji ?? '🎨';
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          
          <View style={styles.header}>
            <Text style={styles.title}>Asset Packs</Text>
            <Pressable style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeButtonText}>✕</Text>
            </Pressable>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {packs.length === 0 && !showCreateForm && (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateEmoji}>📦</Text>
                <Text style={styles.emptyStateText}>No asset packs yet</Text>
                <Text style={styles.emptyStateSubtext}>
                  Create a pack to start generating assets for your game
                </Text>
              </View>
            )}

            {packs.map(pack => (
              <Pressable
                key={pack.id}
                style={[
                  styles.packCard,
                  selectedPackId === pack.id && styles.packCardSelected,
                ]}
                onPress={() => {
                  onSelectPack(pack.id);
                  onClose();
                }}
              >
                <View style={styles.packIcon}>
                  <Text style={styles.packIconText}>{getStyleEmoji(pack.promptDefaults?.styleOverride)}</Text>
                </View>
                <View style={styles.packInfo}>
                  <Text style={styles.packName}>{pack.name}</Text>
                  {pack.description && (
                    <Text style={styles.packDescription} numberOfLines={1}>
                      {pack.description}
                    </Text>
                  )}
                  <Text style={styles.packDate}>
                    Created {new Date(pack.createdAt).toLocaleDateString()}
                  </Text>
                </View>
                {selectedPackId === pack.id && (
                  <View style={styles.selectedBadge}>
                    <Text style={styles.selectedBadgeText}>✓</Text>
                  </View>
                )}
              </Pressable>
            ))}

            {showCreateForm ? (
              <View style={styles.createForm}>
                <Text style={styles.createFormTitle}>New Asset Pack</Text>
                
                <Text style={styles.inputLabel}>Name</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g., Pixel Art Style"
                  placeholderTextColor="#6B7280"
                  value={newPackName}
                  onChangeText={setNewPackName}
                  autoFocus
                />

                <Text style={styles.inputLabel}>Style</Text>
                <View style={styles.styleGrid}>
                  {STYLE_OPTIONS.map(style => (
                    <Pressable
                      key={style.id}
                      style={styles.styleOption}
                      onPress={() => setNewPackStyle(style.id)}
                    >
                      <View style={[
                        styles.styleOptionInner,
                        newPackStyle === style.id && styles.styleOptionInnerSelected,
                      ]}>
                        <Text style={styles.styleEmoji}>{style.emoji}</Text>
                        <Text style={[
                          styles.styleLabel,
                          newPackStyle === style.id && styles.styleLabelSelected,
                        ]}>
                          {style.label}
                        </Text>
                      </View>
                    </Pressable>
                  ))}
                </View>

                <View style={styles.createFormActions}>
                  <Pressable
                    style={styles.cancelButton}
                    onPress={() => {
                      setShowCreateForm(false);
                      setNewPackName('');
                    }}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </Pressable>
                  <Pressable
                    style={[
                      styles.createButton,
                      (!newPackName.trim() || isCreating) && styles.createButtonDisabled,
                    ]}
                    onPress={handleCreatePack}
                    disabled={!newPackName.trim() || isCreating}
                  >
                    {isCreating ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.createButtonText}>Create Pack</Text>
                    )}
                  </Pressable>
                </View>
              </View>
            ) : (
              <Pressable
                style={styles.addPackButton}
                onPress={() => setShowCreateForm(true)}
              >
                <Text style={styles.addPackButtonIcon}>+</Text>
                <Text style={styles.addPackButtonText}>Create New Pack</Text>
              </Pressable>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  sheet: {
    backgroundColor: '#1F2937',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingBottom: 34,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#6B7280',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#374151',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    color: '#9CA3AF',
    fontSize: 16,
  },
  content: {
    padding: 20,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyStateText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    color: '#9CA3AF',
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  packCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#374151',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  packCardSelected: {
    borderColor: '#4F46E5',
    backgroundColor: '#3730A3',
  },
  packIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#1F2937',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  packIconText: {
    fontSize: 24,
  },
  packInfo: {
    flex: 1,
  },
  packName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  packDescription: {
    color: '#9CA3AF',
    fontSize: 13,
    marginBottom: 4,
  },
  packDate: {
    color: '#6B7280',
    fontSize: 11,
  },
  selectedBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#4F46E5',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  selectedBadgeText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  addPackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#374151',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#4B5563',
    borderStyle: 'dashed',
  },
  addPackButtonIcon: {
    color: '#9CA3AF',
    fontSize: 20,
    marginRight: 8,
  },
  addPackButtonText: {
    color: '#9CA3AF',
    fontSize: 14,
    fontWeight: '500',
  },
  createForm: {
    backgroundColor: '#374151',
    borderRadius: 12,
    padding: 16,
  },
  createFormTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
  inputLabel: {
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  textInput: {
    backgroundColor: '#1F2937',
    borderRadius: 8,
    padding: 12,
    color: '#FFFFFF',
    fontSize: 14,
    marginBottom: 16,
  },
  styleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
    marginBottom: 16,
  },
  styleOption: {
    width: '50%',
    padding: 4,
  },
  styleOptionInner: {
    backgroundColor: '#1F2937',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  styleOptionInnerSelected: {
    borderColor: '#4F46E5',
    backgroundColor: '#312E81',
  },
  styleEmoji: {
    fontSize: 24,
    marginBottom: 4,
  },
  styleLabel: {
    color: '#9CA3AF',
    fontSize: 12,
  },
  styleLabelSelected: {
    color: '#FFFFFF',
  },
  createFormActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  cancelButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  cancelButtonText: {
    color: '#9CA3AF',
    fontSize: 14,
    fontWeight: '500',
  },
  createButton: {
    backgroundColor: '#4F46E5',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
  },
  createButtonDisabled: {
    backgroundColor: '#6366F1',
    opacity: 0.5,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
