import { useState, useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { AlignmentPreviewCanvas } from './AlignmentPreviewCanvas';
import type { PhysicsComponent, AssetPlacement } from '@slopcade/shared';

interface AssetAlignmentEditorProps {
  visible: boolean;
  onClose: () => void;
  templateId: string;
  physics?: PhysicsComponent;
  imageUrl?: string;
  initialPlacement?: AssetPlacement;
  onSave: (placement: AssetPlacement) => void;
}

const DEFAULT_PLACEMENT: AssetPlacement = {
  scale: 1,
  offsetX: 0,
  offsetY: 0,
};

export function AssetAlignmentEditor({
  visible,
  onClose,
  templateId,
  physics,
  imageUrl,
  initialPlacement,
  onSave,
}: AssetAlignmentEditorProps) {
  const { width: windowWidth } = useWindowDimensions();
  const canvasSize = Math.min(windowWidth - 48, 320);

  const [placement, setPlacement] = useState<AssetPlacement>(
    initialPlacement ?? DEFAULT_PLACEMENT
  );
  const [showPhysicsOutline, setShowPhysicsOutline] = useState(true);

  const handleScaleChange = useCallback((value: number) => {
    setPlacement(prev => ({ ...prev, scale: value }));
  }, []);

  const handleOffsetXChange = useCallback((value: number) => {
    setPlacement(prev => ({ ...prev, offsetX: value }));
  }, []);

  const handleOffsetYChange = useCallback((value: number) => {
    setPlacement(prev => ({ ...prev, offsetY: value }));
  }, []);

  const handleReset = useCallback(() => {
    setPlacement(DEFAULT_PLACEMENT);
  }, []);

  const handleSave = useCallback(() => {
    onSave(placement);
    onClose();
  }, [placement, onSave, onClose]);

  const offsetRange = canvasSize * 0.3;

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
            <View>
              <Text style={styles.title}>Align Asset</Text>
              <Text style={styles.subtitle}>{templateId}</Text>
            </View>
            <Pressable style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeButtonText}>✕</Text>
            </Pressable>
          </View>

          <View style={styles.canvasContainer}>
            <AlignmentPreviewCanvas
              size={canvasSize}
              physics={physics}
              imageUrl={imageUrl}
              scale={placement.scale}
              offsetX={placement.offsetX}
              offsetY={placement.offsetY}
              showPhysicsOutline={showPhysicsOutline}
            />
          </View>

          <View style={styles.controls}>
            <View style={styles.controlRow}>
              <Text style={styles.controlLabel}>Scale</Text>
              <Text style={styles.controlValue}>{placement.scale.toFixed(2)}x</Text>
            </View>
            <Slider
              style={styles.slider}
              minimumValue={0.5}
              maximumValue={2.0}
              step={0.05}
              value={placement.scale}
              onValueChange={handleScaleChange}
              minimumTrackTintColor="#4F46E5"
              maximumTrackTintColor="#374151"
              thumbTintColor="#6366F1"
            />

            <View style={styles.controlRow}>
              <Text style={styles.controlLabel}>Offset X</Text>
              <Text style={styles.controlValue}>{placement.offsetX.toFixed(0)}px</Text>
            </View>
            <Slider
              style={styles.slider}
              minimumValue={-offsetRange}
              maximumValue={offsetRange}
              step={1}
              value={placement.offsetX}
              onValueChange={handleOffsetXChange}
              minimumTrackTintColor="#4F46E5"
              maximumTrackTintColor="#374151"
              thumbTintColor="#6366F1"
            />

            <View style={styles.controlRow}>
              <Text style={styles.controlLabel}>Offset Y</Text>
              <Text style={styles.controlValue}>{placement.offsetY.toFixed(0)}px</Text>
            </View>
            <Slider
              style={styles.slider}
              minimumValue={-offsetRange}
              maximumValue={offsetRange}
              step={1}
              value={placement.offsetY}
              onValueChange={handleOffsetYChange}
              minimumTrackTintColor="#4F46E5"
              maximumTrackTintColor="#374151"
              thumbTintColor="#6366F1"
            />

            <Pressable
              style={styles.toggleRow}
              onPress={() => setShowPhysicsOutline(prev => !prev)}
            >
              <Text style={styles.toggleLabel}>Show Physics Outline</Text>
              <View style={[styles.toggle, showPhysicsOutline && styles.toggleActive]}>
                <View style={[styles.toggleThumb, showPhysicsOutline && styles.toggleThumbActive]} />
              </View>
            </Pressable>
          </View>

          <View style={styles.actions}>
            <Pressable style={styles.resetButton} onPress={handleReset}>
              <Text style={styles.resetButtonText}>Reset</Text>
            </Pressable>
            <Pressable style={styles.saveButton} onPress={handleSave}>
              <Text style={styles.saveButtonText}>Save Alignment</Text>
            </Pressable>
          </View>
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
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  sheet: {
    backgroundColor: '#1F2937',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
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
    alignItems: 'flex-start',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  subtitle: {
    color: '#9CA3AF',
    fontSize: 13,
    marginTop: 2,
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
  canvasContainer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  controls: {
    paddingHorizontal: 24,
  },
  controlRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  controlLabel: {
    color: '#D1D5DB',
    fontSize: 14,
    fontWeight: '500',
  },
  controlValue: {
    color: '#9CA3AF',
    fontSize: 13,
    fontFamily: 'monospace',
  },
  slider: {
    width: '100%',
    height: 40,
    marginBottom: 12,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 8,
  },
  toggleLabel: {
    color: '#D1D5DB',
    fontSize: 14,
  },
  toggle: {
    width: 48,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#374151',
    padding: 2,
    justifyContent: 'center',
  },
  toggleActive: {
    backgroundColor: '#4F46E5',
  },
  toggleThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#9CA3AF',
  },
  toggleThumbActive: {
    backgroundColor: '#FFFFFF',
    alignSelf: 'flex-end',
  },
  actions: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingTop: 20,
    gap: 12,
  },
  resetButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: '#374151',
    alignItems: 'center',
  },
  resetButtonText: {
    color: '#D1D5DB',
    fontSize: 14,
    fontWeight: '600',
  },
  saveButton: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: '#4F46E5',
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
