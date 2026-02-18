import { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Text as SvgText } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';

const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);

interface ShimmerTextProps {
  text: string;
  fontSize?: number;
  baseColor?: string;
  highlightColor?: string;
  duration?: number;
}

export function ShimmerText({
  text,
  fontSize = 13,
  baseColor = '#71717A',
  highlightColor = '#A1A1AA',
  duration = 2500,
}: ShimmerTextProps) {
  const offset = useSharedValue(0);

  useEffect(() => {
    offset.value = withRepeat(
      withTiming(1, { duration, easing: Easing.linear }),
      -1,
      false,
    );
  }, [offset, duration]);

  const animatedProps = useAnimatedProps(() => {
    const progress = offset.value;
    return {
      x1: String(1.5 - progress * 2),
      x2: String(2.0 - progress * 2),
    };
  });

  const estimatedWidth = text.length * fontSize * 0.65;
  const svgHeight = fontSize * 1.5;

  return (
    <View style={styles.container}>
      <Svg width={estimatedWidth} height={svgHeight}>
        <Defs>
          <AnimatedLinearGradient
            id="shimmerGrad"
            x1="1"
            y1="0"
            x2="1.5"
            y2="0"
            animatedProps={animatedProps}
          >
            <Stop offset="0" stopColor={baseColor} />
            <Stop offset="0.35" stopColor={baseColor} />
            <Stop offset="0.45" stopColor={highlightColor} />
            <Stop offset="0.55" stopColor={highlightColor} />
            <Stop offset="0.65" stopColor={baseColor} />
            <Stop offset="1" stopColor={baseColor} />
          </AnimatedLinearGradient>
        </Defs>
        <SvgText
          fill="url(#shimmerGrad)"
          fontSize={fontSize}
          fontWeight="600"
          x="0"
          y={fontSize}
        >
          {text}
        </SvgText>
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
