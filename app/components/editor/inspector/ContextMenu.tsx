import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, Modal } from 'react-native';
import { useInspector } from './InspectorProvider';

interface ContextMenuItem {
  id: string;
  label: string;
  icon?: string;
  children?: ContextMenuItem[];
  onPress?: () => void;
  disabled?: boolean;
}

interface ContextMenuState {
  visible: boolean;
  position: { x: number; y: number };
  worldPosition: { x: number; y: number };
  entities: Array<{
    id: string;
    name: string;
    template: string;
    zIndex: number;
    depth: number;
  }>;
}

export function useContextMenu() {
  const [state, setState] = useState<ContextMenuState>({
    visible: false,
    position: { x: 0, y: 0 },
    worldPosition: { x: 0, y: 0 },
    entities: [],
  });

  const show = useCallback((position: { x: number; y: number }, worldPosition: { x: number; y: number }, entities: ContextMenuState['entities']) => {
    setState({
      visible: true,
      position,
      worldPosition,
      entities,
    });
  }, []);

  const hide = useCallback(() => {
    setState((prev) => ({ ...prev, visible: false }));
  }, []);

  return {
    ...state,
    show,
    hide,
  };
}

interface ContextMenuProps {
  visible: boolean;
  position: { x: number; y: number };
  worldPosition: { x: number; y: number };
  entities: Array<{
    id: string;
    name: string;
    template: string;
    zIndex: number;
    depth: number;
  }>;
  onSelectEntity: (entityId: string) => void;
  onClose: () => void;
  onCopyPosition?: (position: { x: number; y: number }) => void;
  onFocusCamera?: (position: { x: number; y: number }) => void;
}

export function ContextMenu({
  visible,
  position,
  worldPosition,
  entities,
  onSelectEntity,
  onClose,
  onCopyPosition,
  onFocusCamera,
}: ContextMenuProps) {
  const { selectEntity } = useInspector();

  if (!visible) return null;

  const handleSelectEntity = (entityId: string) => {
    selectEntity(entityId);
    onSelectEntity(entityId);
    onClose();
  };

  const handleCopyPosition = () => {
    onCopyPosition?.(worldPosition);
    onClose();
  };

  const handleFocusCamera = () => {
    onFocusCamera?.(worldPosition);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <View
          style={[
            styles.menu,
            {
              left: Math.min(position.x, 400),
              top: Math.min(position.y, 500),
            },
          ]}
        >
          <View style={styles.header}>
            <Text style={styles.headerText}>
              Entities at ({worldPosition.x.toFixed(1)}, {worldPosition.y.toFixed(1)})
            </Text>
          </View>

          <View style={styles.entityList}>
            {entities.length === 0 ? (
              <Text style={styles.emptyText}>No entities at this point</Text>
            ) : (
              entities.map((entity) => (
                <Pressable
                  key={entity.id}
                  style={[
                    styles.entityItem,
                    { paddingLeft: 12 + entity.depth * 16 },
                  ]}
                  onPress={() => handleSelectEntity(entity.id)}
                >
                  <Text style={styles.entityIcon}>
                    {entity.depth === 0 ? '👆' : '└─'}
                  </Text>
                  <View style={styles.entityInfo}>
                    <Text style={styles.entityName}>{entity.name}</Text>
                    <Text style={styles.entityTemplate}>{entity.template}</Text>
                  </View>
                </Pressable>
              ))
            )}
          </View>

          <View style={styles.divider} />

          <View style={styles.actions}>
            <Pressable style={styles.actionItem} onPress={handleCopyPosition}>
              <Text style={styles.actionIcon}>📋</Text>
              <Text style={styles.actionText}>Copy Position</Text>
            </Pressable>
            <Pressable style={styles.actionItem} onPress={handleFocusCamera}>
              <Text style={styles.actionIcon}>🎯</Text>
              <Text style={styles.actionText}>Focus Camera</Text>
            </Pressable>
          </View>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  menu: {
    position: 'absolute',
    backgroundColor: '#1F2937',
    borderRadius: 8,
    minWidth: 280,
    maxWidth: 320,
    maxHeight: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  header: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  headerText: {
    color: '#9CA3AF',
    fontSize: 12,
  },
  entityList: {
    maxHeight: 200,
  },
  emptyText: {
    color: '#6B7280',
    fontSize: 14,
    padding: 16,
    textAlign: 'center',
  },
  entityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingRight: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  entityIcon: {
    marginRight: 8,
    fontSize: 12,
  },
  entityInfo: {
    flex: 1,
  },
  entityName: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  entityTemplate: {
    color: '#6B7280',
    fontSize: 11,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: '#374151',
  },
  actions: {
    padding: 8,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 4,
  },
  actionIcon: {
    marginRight: 12,
    fontSize: 16,
  },
  actionText: {
    color: '#D1D5DB',
    fontSize: 14,
  },
});
