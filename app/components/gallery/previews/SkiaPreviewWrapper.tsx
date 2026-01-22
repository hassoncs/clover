import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import type { GalleryItem } from '@slopcade/shared';
import { WithSkia } from '@/components/WithSkia';

type PreviewProps = {
  item: GalleryItem;
  params: Record<string, unknown>;
  width: number;
  height: number;
};

type SkiaPreviewWrapperProps = PreviewProps & {
  previewType: 'effect' | 'particle' | 'physics';
};

const LoadingFallback = () => (
  <View className="flex-1 justify-center items-center bg-slate-900">
    <ActivityIndicator size="large" color="#4ecdc4" />
  </View>
);

export function SkiaPreviewWrapper({
  item,
  params,
  width,
  height,
  previewType,
}: SkiaPreviewWrapperProps) {
  return (
    <WithSkia
      getComponent={() => {
        const importPromise = 
          previewType === 'effect' ? import('./EffectPreview') :
          previewType === 'particle' ? import('./ParticlePreview') :
          import('./PhysicsPreview');
        
        return importPromise.then((mod) => ({
          default: () => (
            <mod.default
              item={item}
              params={params}
              width={width}
              height={height}
            />
          ),
        }));
      }}
      fallback={<LoadingFallback />}
    />
  );
}


