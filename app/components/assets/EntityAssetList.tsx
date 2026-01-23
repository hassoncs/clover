import { View, Text, Image, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import type { GameDefinition, AssetPack, EntityTemplate } from '@slopcade/shared';
import { resolveAssetUrl } from '@/lib/config/env';

interface Props {
  gameDefinition: GameDefinition;
  activePack: AssetPack | null;
  onRegenerateAsset: (templateId: string) => void;
  onClearAsset: (templateId: string) => void;
  regeneratingTemplateId?: string;
}

export function EntityAssetList({ 
  gameDefinition, 
  activePack, 
  onRegenerateAsset, 
  onClearAsset,
  regeneratingTemplateId 
}: Props) {
  const templates = Object.entries(gameDefinition.templates || {}) as [string, EntityTemplate][];
  
  if (templates.length === 0) {
    return (
      <View className="p-4 bg-gray-700 rounded-lg">
        <Text className="text-gray-400 text-center">No templates in this game</Text>
      </View>
    );
  }

  return (
    <View>
      <Text className="text-gray-400 mb-2">Entity Assets</Text>
      <ScrollView className="max-h-48">
        {templates.map(([templateId, template]) => {
          const asset = activePack?.assets?.[templateId];
          const isRegenerating = regeneratingTemplateId === templateId;
          const spriteColor = template.sprite?.color || '#666';
          
          return (
            <View 
              key={templateId} 
              className="flex-row items-center p-2 bg-gray-700 rounded-lg mb-2"
            >
              {asset?.imageUrl ? (
                <Image 
                  source={{ uri: resolveAssetUrl(asset.imageUrl) }} 
                  className="w-12 h-12 rounded"
                  resizeMode="contain"
                />
              ) : (
                <View 
                  className="w-12 h-12 rounded items-center justify-center"
                  style={{ backgroundColor: spriteColor }}
                >
                  <Text className="text-white text-xs">Shape</Text>
                </View>
              )}
              
              <View className="flex-1 ml-3">
                <Text className="text-white font-medium">{templateId}</Text>
                <Text className="text-gray-400 text-xs">
                  {asset?.imageUrl ? 'Generated' : 'Using shape fallback'}
                </Text>
              </View>
              
              <Pressable 
                className={`p-2 rounded mr-2 ${isRegenerating ? 'bg-gray-600' : 'bg-indigo-600'}`}
                onPress={() => onRegenerateAsset(templateId)}
                disabled={isRegenerating}
              >
                {isRegenerating ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <Text className="text-white text-xs">Regen</Text>
                )}
              </Pressable>
              
              {asset?.imageUrl && (
                <Pressable 
                  className="p-2 bg-red-600 rounded"
                  onPress={() => onClearAsset(templateId)}
                >
                  <Text className="text-white text-xs">Clear</Text>
                </Pressable>
              )}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}
