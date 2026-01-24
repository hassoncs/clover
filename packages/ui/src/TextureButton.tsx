import * as React from 'react';
import { Pressable, Image, View, type ImageSourcePropType, type ViewStyle, StyleSheet } from 'react-native';

export interface TextureButtonProps {
  normalImage: ImageSourcePropType;
  pressedImage: ImageSourcePropType;
  onPress?: () => void;
  onPressIn?: () => void;
  onPressOut?: () => void;
  width: number;
  height: number;
  disabled?: boolean;
  style?: ViewStyle;
  hitSlop?: number | { top?: number; right?: number; bottom?: number; left?: number };
}

export function TextureButton({
  normalImage,
  pressedImage,
  onPress,
  onPressIn,
  onPressOut,
  width,
  height,
  disabled = false,
  style,
  hitSlop,
}: TextureButtonProps) {
  const handlePressIn = React.useCallback(() => {
    onPressIn?.();
  }, [onPressIn]);

  const handlePressOut = React.useCallback(() => {
    onPressOut?.();
  }, [onPressOut]);

  const handlePress = React.useCallback(() => {
    onPress?.();
  }, [onPress]);

  const imageStyle = { width, height, opacity: disabled ? 0.5 : 1 };

  return (
    <Pressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      hitSlop={hitSlop}
      style={style}
    >
      {({ pressed }) => (
        <View style={{ width, height }}>
          <Image
            source={normalImage}
            style={[styles.image, imageStyle, { opacity: pressed ? 0 : (disabled ? 0.5 : 1) }]}
            resizeMode="contain"
          />
          <Image
            source={pressedImage}
            style={[styles.image, imageStyle, { opacity: pressed ? (disabled ? 0.5 : 1) : 0 }]}
            resizeMode="contain"
          />
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  image: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
});
