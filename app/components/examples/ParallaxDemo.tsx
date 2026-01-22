import { useCallback, useState, useRef, useEffect } from "react";
import { View, StyleSheet, Text, TouchableOpacity, Platform, Switch } from "react-native";
import { Canvas, useCanvasRef } from "@shopify/react-native-skia";
import { SortableList } from "@slopcade/ui";
import { Feather } from '@expo/vector-icons';
import { GestureHandlerRootView } from "react-native-gesture-handler";
import {
  ParallaxBackground,
  createParallaxConfig,
  type ParallaxBackgroundConfig,
  type ParallaxLayer,
  DEFAULT_PARALLAX_FACTORS,
} from "../../lib/game-engine/renderers/ParallaxBackground";
import PARALLAX_ASSETS from "../../assets/parallaxRegistry";
import { ViewportRoot, useViewport } from "../../lib/viewport";

const PIXELS_PER_METER = 50;

type ThemeId = "desert" | "forest" | "mountain-sky" | "ocean" | "cyberpunk" | "sunset";

interface Theme {
  id: ThemeId;
  name: string;
  color: string;
}

const THEMES: Theme[] = [
  { id: "desert", name: "Desert", color: "#d4a574" },
  { id: "forest", name: "Forest", color: "#228b22" },
  { id: "mountain-sky", name: "Mountain", color: "#4a90d9" },
  { id: "ocean", name: "Ocean", color: "#1e90ff" },
  { id: "cyberpunk", name: "Cyberpunk", color: "#ff00ff" },
  { id: "sunset", name: "Sunset", color: "#ff7e5f" },
];

const THEME_LAYERS: Record<ThemeId, Array<{ depth: ParallaxLayer['depth'], suffix: string }>> = {
  desert: [
    { depth: 'sky', suffix: '1' },
    { depth: 'far', suffix: '2' },
    { depth: 'mid', suffix: '3' },
    { depth: 'near', suffix: '4' },
  ],
  forest: [
    { depth: 'sky', suffix: '1' },
    { depth: 'far', suffix: '2' },
    { depth: 'mid', suffix: '3' },
    { depth: 'near', suffix: '4' },
  ],
  'mountain-sky': [
    { depth: 'sky', suffix: '1' },
    { depth: 'far', suffix: '2' },
    { depth: 'mid', suffix: '3' },
  ],
  ocean: [
    { depth: 'sky', suffix: '1' },
    { depth: 'far', suffix: '2' },
    { depth: 'mid', suffix: '3' },
  ],
  cyberpunk: [
    { depth: 'sky', suffix: '1' },
    { depth: 'far', suffix: '2' },
    { depth: 'mid', suffix: '3' },
    { depth: 'near', suffix: '4' },
  ],
  sunset: [
    { depth: 'sky', suffix: '1' },
    { depth: 'far', suffix: '2' },
    { depth: 'mid', suffix: '3' },
    { depth: 'near', suffix: '4' },
  ],
};

function getThemeConfig(themeId: ThemeId): ParallaxBackgroundConfig {
  const layerDefs = THEME_LAYERS[themeId] || [];
  
    const layers: ParallaxLayer[] = layerDefs.map((def, index) => ({
    imageUrl: PARALLAX_ASSETS[themeId]?.[def.depth],
    depth: def.depth,
    parallaxFactor: DEFAULT_PARALLAX_FACTORS[def.depth],
    zIndex: index,
  }));

  return { layers };
}

type EditableLayer = ParallaxLayer & { visible: boolean; id: string };

function ParallaxCanvas() {
  const canvasRef = useCanvasRef();
  const vp = useViewport();
  
  const [selectedTheme, setSelectedTheme] = useState<ThemeId>("forest");
  const [cameraX, setCameraX] = useState(0);
  const [cameraY, setCameraY] = useState(0);
  const [cameraZoom, setCameraZoom] = useState(1);
  const [isAutoScrolling, setIsAutoScrolling] = useState(true);
  
  const [layers, setLayers] = useState<EditableLayer[]>([]);
  
  const lastTouchRef = useRef<{ x: number; y: number } | null>(null);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    const config = getThemeConfig(selectedTheme);
    setLayers(config.layers.map((layer, index) => ({
      ...layer,
      visible: true,
      id: `${selectedTheme}-${layer.depth}-${index}`,
    })));
  }, [selectedTheme]);

  useEffect(() => {
    if (!isAutoScrolling) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      return;
    }

    let startTime: number | null = null;
    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = (timestamp - startTime) / 1000;
      
      // Gentle sinusoidal motion for demo
      setCameraX(Math.sin(elapsed * 0.5) * 5);
      setCameraY(Math.cos(elapsed * 0.3) * 2);
      
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isAutoScrolling]);

  const handleTouchStart = useCallback((event: any) => {
    const touch = event.nativeEvent;
    lastTouchRef.current = { x: touch.pageX, y: touch.pageY };
    setIsAutoScrolling(false);
  }, []);

  const handleTouchMove = useCallback((event: any) => {
    if (!lastTouchRef.current) return;
    
    const touch = event.nativeEvent;
    const deltaX = (touch.pageX - lastTouchRef.current.x) / PIXELS_PER_METER;
    const deltaY = (touch.pageY - lastTouchRef.current.y) / PIXELS_PER_METER;
    
    setCameraX(prev => prev - deltaX);
    setCameraY(prev => prev - deltaY);
    
    lastTouchRef.current = { x: touch.pageX, y: touch.pageY };
  }, []);

  const handleTouchEnd = useCallback(() => {
    lastTouchRef.current = null;
  }, []);

  const handleZoomIn = useCallback(() => {
    setCameraZoom(prev => Math.min(prev * 1.2, 3));
  }, []);

  const handleZoomOut = useCallback(() => {
    setCameraZoom(prev => Math.max(prev / 1.2, 0.5));
  }, []);

  const handleResetCamera = useCallback(() => {
    setCameraX(0);
    setCameraY(0);
    setCameraZoom(1);
    setIsAutoScrolling(true);
  }, []);

  const toggleLayer = useCallback((index: number) => {
    setLayers(prev => prev.map((l, i) => 
      i === index ? { ...l, visible: !l.visible } : l
    ));
  }, []);

  const updateParallaxFactor = useCallback((index: number, delta: number) => {
    setLayers(prev => prev.map((l, i) => 
      i === index ? { ...l, parallaxFactor: Math.max(0, Math.min(2, l.parallaxFactor + delta)) } : l
    ));
  }, []);


  const onReorder = useCallback((newLayers: EditableLayer[]) => {
    setLayers(newLayers.map((l, i) => ({
      ...l,
      zIndex: newLayers.length - 1 - i,
    })));
  }, []);

  const renderLayerItem = useCallback(({ item, index, drag, isActive }: { item: EditableLayer; index: number; drag: () => any; isActive: boolean }) => (
    <View style={[styles.compactLayerItem, isActive && styles.activeLayerItem]}>
      <View style={styles.compactLayerHeader}>
        <View {...(Platform.OS === 'web' ? drag() : {})} style={styles.dragHandle}>
          <Feather name="menu" size={16} color="#fff" />
        </View>
        <Switch 
          value={item.visible} 
          onValueChange={() => toggleLayer(index)}
          trackColor={{ false: "#767577", true: "#e94560" }}
          thumbColor={item.visible ? "#ffffff" : "#f4f3f4"}
          style={Platform.OS === 'web' ? { transform: 'scale(0.8)' } : { transform: [{ scaleX: 0.7 }, { scaleY: 0.7 }] }}
        />
        <Text style={styles.layerNameCompact} numberOfLines={1}>
          {item.depth}
        </Text>
      </View>
      
      {item.visible && (
        <View style={styles.compactSpeedRow}>
          <TouchableOpacity 
            style={styles.tinyButton} 
            onPress={() => updateParallaxFactor(index, -0.1)}
          >
            <Text style={styles.tinyButtonText}>-</Text>
          </TouchableOpacity>
          <Text style={styles.speedValue}>
            {(item.parallaxFactor * 10).toFixed(0)}
          </Text>
          <TouchableOpacity 
            style={styles.tinyButton} 
            onPress={() => updateParallaxFactor(index, 0.1)}
          >
            <Text style={styles.tinyButtonText}>+</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  ), [toggleLayer, updateParallaxFactor]);

  if (!vp.isReady) return null;

  const activeConfig: ParallaxBackgroundConfig = {
    layers: layers,
  };

  return (
    <GestureHandlerRootView style={styles.container}>
      {/* Theme Selector */}
      <View style={styles.themeSelector}>
        <Text style={styles.sectionTitle}>Theme</Text>
        <View style={styles.themeButtons}>
          {THEMES.map((theme) => (
            <TouchableOpacity
              key={theme.id}
              style={[
                styles.themeButton,
                { backgroundColor: theme.color },
                selectedTheme === theme.id && styles.themeButtonSelected,
              ]}
              onPress={() => setSelectedTheme(theme.id)}
            >
              <Text style={styles.themeButtonText}>{theme.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Canvas */}
      <View
        style={styles.canvasContainer}
        onStartShouldSetResponder={() => true}
        onResponderGrant={handleTouchStart}
        onResponderMove={handleTouchMove}
        onResponderRelease={handleTouchEnd}
        onResponderTerminate={handleTouchEnd}
      >
        <Canvas ref={canvasRef} style={styles.canvas}>
          <ParallaxBackground
            config={activeConfig}
            cameraX={cameraX}
            cameraY={cameraY}
            cameraZoom={cameraZoom}
            viewportWidth={vp.size.width}
            viewportHeight={vp.size.height}
            pixelsPerMeter={PIXELS_PER_METER}
          />
        </Canvas>

        <View style={styles.overlay}>
          <Text style={styles.overlayText}>
            Cam: ({cameraX.toFixed(1)}, {cameraY.toFixed(1)})
          </Text>
          <Text style={styles.overlayText}>
            Zoom: {cameraZoom.toFixed(1)}x
          </Text>
        </View>

                <View style={styles.floatingPanel} onStartShouldSetResponder={() => true}>
          <View style={styles.panelSection}>
            <Text style={styles.panelLabel}>Camera</Text>
            <View style={styles.compactRow}>
              <TouchableOpacity style={styles.iconButton} onPress={handleZoomOut}>
                <Text style={styles.iconButtonText}>-</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.iconButton} onPress={handleResetCamera}>
                <Text style={styles.iconButtonText}>R</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.iconButton} onPress={handleZoomIn}>
                <Text style={styles.iconButtonText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.panelDivider} />

          <View style={styles.panelList}>
            <Text style={styles.panelLabel}>Layers</Text>
            <SortableList
              data={layers}
              keyExtractor={(item) => item.id}
              onReorder={onReorder}
              renderItem={renderLayerItem}
              itemHeight={74}
            />
          </View>
        </View>
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1a1a2e",
  },
  themeSelector: {
    padding: 12,
    backgroundColor: "#16213e",
    borderBottomWidth: 1,
    borderBottomColor: "#0f3460",
    zIndex: 10,
  },
  sectionTitle: {
    color: "#e94560",
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 8,
  },
  themeButtons: {
    flexDirection: "row",
    gap: 8,
  },
  themeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "transparent",
  },
  themeButtonSelected: {
    borderColor: "#ffffff",
  },
  themeButtonText: {
    color: "#ffffff",
    fontWeight: "bold",
    fontSize: 12,
    textShadowColor: "rgba(0, 0, 0, 0.5)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  canvasContainer: {
    flex: 1,
    position: "relative",
    backgroundColor: "#000",
  },
  canvas: {
    flex: 1,
  },
  overlay: {
    position: "absolute",
    top: 12,
    left: 12,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    padding: 8,
    borderRadius: 8,
    pointerEvents: "none",
  },
  overlayText: {
    color: "#ffffff",
    fontSize: 12,
    fontFamily: Platform.OS === "web" ? "monospace" : undefined,
    opacity: 0.8,
  },
  
  floatingPanel: {
    position: "absolute",
    top: 12,
    right: 12,
    bottom: 12,
    width: 110,
    backgroundColor: "rgba(22, 33, 62, 0.8)",
    borderRadius: 12,
    padding: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  panelSection: {
    marginBottom: 8,
  },
  panelLabel: {
    color: "#e94560",
    fontSize: 10,
    fontWeight: "bold",
    marginBottom: 4,
    textAlign: "center",
    textTransform: "uppercase",
  },
  panelDivider: {
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    marginVertical: 8,
  },
  panelList: {
    flex: 1,
  },
  
  compactRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  iconButton: {
    width: 28,
    height: 28,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  iconButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
  },
  
  compactLayerItem: {
    marginBottom: 12,
    backgroundColor: "rgba(0, 0, 0, 0.2)",
    borderRadius: 8,
    padding: 6,
  },
  compactLayerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  layerNameCompact: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "600",
    flex: 1,
    textAlign: "right",
    textTransform: "capitalize",
  },
  compactSpeedRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(0,0,0,0.2)",
    borderRadius: 4,
    padding: 2,
  },
  tinyButton: {
    width: 20,
    height: 20,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderRadius: 4,
    justifyContent: "center",
    alignItems: "center",
  },
  tinyButtonText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
    marginTop: -2,
  },
  speedValue: {
    color: "#a0a0a0",
    fontSize: 10,
    fontFamily: Platform.OS === "web" ? "monospace" : undefined,
    width: 20,
    textAlign: "center",
  },
  dragHandle: {
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  activeLayerItem: {
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    borderColor: '#e94560',
    borderWidth: 1,
  },
  webLayerList: {
    flex: 1,
  },

});

export default function ParallaxDemo() {
  return (
    <ViewportRoot pixelsPerMeter={PIXELS_PER_METER}>
      <ParallaxCanvas />
    </ViewportRoot>
  );
}
