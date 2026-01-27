import { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Pressable,
  Image,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { PreloadProgress } from '@/lib/assets';
import type { LoadingScreenConfig } from '@slopcade/shared';

interface AssetLoadingScreenProps {
  gameTitle: string;
  progress: PreloadProgress;
  config?: LoadingScreenConfig;
  titleHeroImageUrl?: string;
  onSkip?: () => void;
  allowSkipAfterPercent?: number;
}

export function AssetLoadingScreen({
  gameTitle,
  progress,
  config,
  titleHeroImageUrl,
  onSkip,
  allowSkipAfterPercent = 30,
}: AssetLoadingScreenProps) {
  const progressAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: progress.percent,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [progress.percent, progressAnim]);

  const backgroundColor = config?.backgroundColor ?? '#111827';
  const progressBarColor = config?.progressBarColor ?? '#4F46E5';
  const textColor = config?.textColor ?? '#FFFFFF';
  const canSkip = onSkip && progress.percent >= allowSkipAfterPercent;

  const phaseLabel = progress.phase === 'images' 
    ? 'Loading images...' 
    : progress.phase === 'sounds' 
      ? 'Loading sounds...' 
      : 'Finalizing...';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor }]}>
      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        {config?.backgroundImageUrl && (
          <Image
            source={{ uri: config.backgroundImageUrl }}
            style={styles.backgroundImage}
            resizeMode="cover"
          />
        )}

        <View style={styles.heroContainer}>
          {titleHeroImageUrl ? (
            <Image
              source={{ uri: titleHeroImageUrl }}
              style={styles.heroImage}
              resizeMode="contain"
            />
          ) : (
            <View style={styles.heroPlaceholder}>
              <Text style={styles.heroText}>GAME</Text>
            </View>
          )}
        </View>

        <Text style={[styles.title, { color: textColor }]}>{gameTitle}</Text>

        <View style={styles.progressSection}>
          {config?.progressBarImageUrl ? (
            <View style={styles.customProgressContainer}>
              <Image
                source={{ uri: config.progressBarImageUrl }}
                style={styles.progressBarImage}
                resizeMode="stretch"
              />
              <Animated.View
                style={[
                  styles.customProgressFill,
                  {
                    width: progressAnim.interpolate({
                      inputRange: [0, 100],
                      outputRange: ['0%', '100%'],
                    }),
                  },
                ]}
              >
                {config.progressBarFillImageUrl && (
                  <Image
                    source={{ uri: config.progressBarFillImageUrl }}
                    style={styles.progressBarFillImage}
                    resizeMode="stretch"
                  />
                )}
              </Animated.View>
            </View>
          ) : (
            <View style={styles.progressBarContainer}>
              <View style={styles.progressBarBackground}>
                <Animated.View
                  style={[
                    styles.progressBarFill,
                    {
                      backgroundColor: progressBarColor,
                      width: progressAnim.interpolate({
                        inputRange: [0, 100],
                        outputRange: ['0%', '100%'],
                      }),
                    },
                  ]}
                />
              </View>
              <Text style={[styles.progressPercent, { color: textColor }]}>
                {Math.round(progress.percent)}%
              </Text>
            </View>
          )}

          <View style={styles.statusRow}>
            <ActivityIndicator size="small" color={progressBarColor} />
            <Text style={[styles.statusText, { color: textColor }]}>
              {progress.currentAsset ? `${phaseLabel} ${progress.currentAsset}` : phaseLabel}
            </Text>
          </View>

          <Text style={[styles.countText, { color: textColor }]}>
            {progress.loaded}/{progress.total} assets
          </Text>
        </View>

        {canSkip && (
          <Pressable style={styles.skipButton} onPress={onSkip}>
            <Text style={styles.skipButtonText}>Skip</Text>
          </Pressable>
        )}

        {progress.failedAssets.length > 0 && (
          <View style={styles.warningContainer}>
            <Text style={styles.warningText}>
              {progress.failedAssets.length} asset{progress.failedAssets.length !== 1 ? 's' : ''} failed to load
            </Text>
          </View>
        )}
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  backgroundImage: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.3,
  },
  heroContainer: {
    marginBottom: 24,
  },
  heroImage: {
    width: 200,
    height: 120,
    borderRadius: 12,
  },
  heroPlaceholder: {
    width: 120,
    height: 120,
    backgroundColor: 'rgba(79, 70, 229, 0.2)',
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'rgba(255, 255, 255, 0.8)',
    letterSpacing: 2,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 32,
    textAlign: 'center',
  },
  progressSection: {
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
  },
  progressBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: 16,
  },
  progressBarBackground: {
    flex: 1,
    height: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 6,
    overflow: 'hidden',
    marginRight: 12,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 6,
  },
  progressPercent: {
    fontSize: 14,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
    minWidth: 45,
    textAlign: 'right',
  },
  customProgressContainer: {
    width: '100%',
    height: 24,
    marginBottom: 16,
    position: 'relative',
  },
  progressBarImage: {
    width: '100%',
    height: '100%',
  },
  customProgressFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    height: '100%',
    overflow: 'hidden',
  },
  progressBarFillImage: {
    width: '100%',
    height: '100%',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusText: {
    fontSize: 14,
    marginLeft: 8,
    opacity: 0.8,
  },
  countText: {
    fontSize: 12,
    opacity: 0.6,
    fontVariant: ['tabular-nums'],
  },
  skipButton: {
    marginTop: 32,
    paddingVertical: 10,
    paddingHorizontal: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  skipButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  warningContainer: {
    marginTop: 16,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  warningText: {
    color: '#EF4444',
    fontSize: 12,
  },
});
