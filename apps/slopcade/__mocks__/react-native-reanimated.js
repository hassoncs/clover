// Vitest stub for react-native-reanimated
export const useSharedValue = (v) => ({ value: v });
export const useAnimatedStyle = (_fn) => ({});
export const withTiming = (v) => v;
export const withSpring = (v) => v;
export const withRepeat = (v) => v;
export const withDelay = (_, v) => v;
export const cancelAnimation = () => {};
export const runOnJS = (fn) => fn;
export const runOnUI = (fn) => fn;
export const interpolate = (v, _i, _o) => v;
export const Extrapolation = { CLAMP: 'clamp', EXTEND: 'extend', IDENTITY: 'identity' };
export const Easing = {
  linear: (t) => t,
  in: (fn) => fn,
  out: (fn) => fn,
  inOut: (fn) => fn,
  ease: (t) => t,
  bezier: () => (t) => t,
};
export const SharedValue = {};
export const Animated = {
  View: 'div',
  Text: 'span',
  ScrollView: 'div',
  FlatList: ({ data, renderItem }) => data?.map(renderItem) ?? null,
};
export const FlatList = ({ data, renderItem }) => data?.map(renderItem) ?? null;
export default {
  Value: class { constructor(_v) {} },
  View: 'div',
  Text: 'span',
};
