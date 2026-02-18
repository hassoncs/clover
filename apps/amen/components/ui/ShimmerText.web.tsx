import { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';

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
  const spanRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    const el = spanRef.current;
    if (!el) return;

    const keyframes = `
      @keyframes shimmer-sweep {
        0% { background-position: 100% 0; }
        100% { background-position: -100% 0; }
      }
    `;

    let styleEl: HTMLStyleElement | null = document.getElementById('shimmer-text-keyframes') as HTMLStyleElement;
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = 'shimmer-text-keyframes';
      styleEl.textContent = keyframes;
      document.head.appendChild(styleEl);
    }

    Object.assign(el.style, {
      fontSize: `${fontSize}px`,
      fontWeight: '600',
      color: baseColor,
      background: `linear-gradient(90deg, ${baseColor} 0%, ${baseColor} 35%, ${highlightColor} 45%, ${highlightColor} 55%, ${baseColor} 65%, ${baseColor} 100%)`,
      backgroundSize: '200% 100%',
      WebkitBackgroundClip: 'text',
      backgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      display: 'inline-block',
      animation: `shimmer-sweep ${duration}ms linear infinite`,
    });
  }, [baseColor, highlightColor, fontSize, duration]);

  return (
    <View style={styles.container}>
      <span ref={spanRef}>{text}</span>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
