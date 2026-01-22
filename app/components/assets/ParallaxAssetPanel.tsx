import { View, Text, Pressable, Switch, Image, ScrollView, ActivityIndicator } from 'react-native';
import type { ParallaxConfig } from '@slopcade/shared';

type ParallaxDepth = 'sky' | 'far' | 'mid' | 'near';

interface Props {
  parallaxConfig: ParallaxConfig | undefined;
  onToggleEnabled: (enabled: boolean) => void;
  onGenerateLayer: (depth: ParallaxDepth) => void;
  onGenerateAllLayers: () => void;
  onLayerVisibilityChange: (depth: ParallaxDepth, visible: boolean) => void;
  generatingLayer?: ParallaxDepth | 'all';
  selectedStyle: string;
}

const DEPTH_INFO: Record<ParallaxDepth, { label: string; parallaxFactor: number; color: string }> = {
  sky: { label: 'Sky (Back)', parallaxFactor: 0.1, color: '#1e3a5f' },
  far: { label: 'Far Distance', parallaxFactor: 0.3, color: '#2d4a6f' },
  mid: { label: 'Mid Distance', parallaxFactor: 0.6, color: '#3d5a7f' },
  near: { label: 'Near (Front)', parallaxFactor: 0.9, color: '#4d6a8f' },
};

export function ParallaxAssetPanel({ 
  parallaxConfig, 
  onToggleEnabled, 
  onGenerateLayer,
  onGenerateAllLayers,
  onLayerVisibilityChange,
  generatingLayer,
  selectedStyle,
}: Props) {
  const layers = parallaxConfig?.layers || [];
  const isEnabled = parallaxConfig?.enabled ?? false;
  const isGeneratingAny = !!generatingLayer;
  
  return (
    <View className="mt-4 p-3 bg-gray-750 rounded-lg">
      <View className="flex-row justify-between items-center mb-3">
        <Text className="text-white font-bold">Parallax Background</Text>
        <Switch 
          value={isEnabled}
          onValueChange={onToggleEnabled}
          trackColor={{ false: '#374151', true: '#6366f1' }}
          thumbColor={isEnabled ? '#fff' : '#9ca3af'}
        />
      </View>
      
      {isEnabled && (
        <>
          <Pressable
            className={`py-3 rounded-lg items-center mb-3 ${isGeneratingAny ? 'bg-gray-600' : 'bg-purple-600'}`}
            onPress={onGenerateAllLayers}
            disabled={isGeneratingAny}
          >
            {generatingLayer === 'all' ? (
              <View className="flex-row items-center">
                <ActivityIndicator color="white" size="small" />
                <Text className="text-white font-semibold ml-2">Generating All...</Text>
              </View>
            ) : (
              <Text className="text-white font-semibold">Generate All Layers ({selectedStyle})</Text>
            )}
          </Pressable>
          
          <ScrollView className="max-h-48">
            {(['sky', 'far', 'mid', 'near'] as ParallaxDepth[]).map(depth => {
              const layer = layers.find(l => l.depth === depth);
              const info = DEPTH_INFO[depth];
              const isGeneratingThis = generatingLayer === depth;
              
              return (
                <View 
                  key={depth} 
                  className="flex-row items-center p-2 bg-gray-700 rounded-lg mb-2"
                >
                  {layer?.imageUrl ? (
                    <Image 
                      source={{ uri: layer.imageUrl }} 
                      className="w-16 h-10 rounded"
                      resizeMode="cover"
                    />
                  ) : (
                    <View 
                      className="w-16 h-10 rounded items-center justify-center"
                      style={{ backgroundColor: info.color }}
                    >
                      <Text className="text-gray-300 text-xs">Empty</Text>
                    </View>
                  )}
                  
                  <View className="flex-1 ml-3">
                    <Text className="text-white font-medium text-sm">{info.label}</Text>
                    <Text className="text-gray-400 text-xs">
                      Parallax: {(info.parallaxFactor * 100).toFixed(0)}%
                    </Text>
                  </View>
                  
                  <Pressable
                    className={`p-2 rounded mr-2 ${isGeneratingThis || isGeneratingAny ? 'bg-gray-600' : 'bg-indigo-600'}`}
                    onPress={() => onGenerateLayer(depth)}
                    disabled={isGeneratingAny}
                  >
                    {isGeneratingThis ? (
                      <ActivityIndicator color="white" size="small" />
                    ) : (
                      <Text className="text-white text-xs">Gen</Text>
                    )}
                  </Pressable>
                  
                  <Switch
                    value={layer?.visible ?? false}
                    onValueChange={(v) => onLayerVisibilityChange(depth, v)}
                    trackColor={{ false: '#374151', true: '#22c55e' }}
                    thumbColor={layer?.visible ? '#fff' : '#9ca3af'}
                  />
                </View>
              );
            })}
          </ScrollView>
          
          <Text className="text-gray-500 text-xs mt-2 text-center">
            Tip: Generate layers from back (Sky) to front (Near) for best results
          </Text>
        </>
      )}
    </View>
  );
}
