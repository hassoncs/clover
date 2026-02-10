import { useMemo } from 'react';
import { View, Text, Pressable, Image, StyleSheet } from 'react-native';
import type {
  OverlayConfig,
  OverlayElement,
  OverlayAnchor,
  OverlayStyle,
  OverlayTheme,
  TextOverlayElement,
  BarOverlayElement,
  CounterOverlayElement,
  ButtonOverlayElement,
  ImageOverlayElement,
  ContainerOverlayElement,
  SpacerOverlayElement,
} from '@slopcade/shared';
import {
  buildBindingContext,
  evaluateCondition,
  resolveBinding,
} from './BindingEvaluator';
import type { BindingContext } from './BindingEvaluator';

const DEFAULT_THEME = {
  textColor: '#FFFFFF',
  fontSize: 16,
  primaryColor: '#4CAF50',
  backgroundColor: 'rgba(0,0,0,0.6)',
};

export interface OverlayRendererProps {
  config: OverlayConfig;
  gameState: { time: number; state: string; variables: Record<string, number | string | boolean> };
  viewportRect: { x: number; y: number; width: number; height: number };
  getEntityCountByTag: (tag: string) => number;
  onButtonPress?: (eventName: string, eventData?: Record<string, unknown>) => void;
}

export function OverlayRenderer({
  config,
  gameState,
  viewportRect,
  getEntityCountByTag,
  onButtonPress,
}: OverlayRendererProps) {
  const ctx = useMemo(
    () => buildBindingContext(gameState, getEntityCountByTag),
    [gameState, getEntityCountByTag],
  );

  const theme = useMemo(() => ({
    ...DEFAULT_THEME,
    ...config.theme,
  }), [config.theme]);

  if (viewportRect.width === 0 || viewportRect.height === 0) return null;

  return (
    <View
      style={[
        styles.overlay,
        {
          left: viewportRect.x,
          top: viewportRect.y,
          width: viewportRect.width,
          height: viewportRect.height,
        },
      ]}
      pointerEvents="box-none"
    >
      {config.elements.map((el, index) => (
        <AnchoredElement
          key={el.id}
          element={el}
          ctx={ctx}
          theme={theme}
          zIndex={index}
          onButtonPress={onButtonPress}
        />
      ))}
    </View>
  );
}

function AnchoredElement({
  element,
  ctx,
  theme,
  zIndex,
  onButtonPress,
}: {
  element: OverlayElement;
  ctx: BindingContext;
  theme: Required<Pick<OverlayTheme, 'textColor' | 'fontSize' | 'primaryColor' | 'backgroundColor'>>;
  zIndex: number;
  onButtonPress?: (eventName: string, eventData?: Record<string, unknown>) => void;
}) {
  if (element.visible === false) return null;
  if (element.visibleWhen && !evaluateCondition(element.visibleWhen, ctx)) return null;

  const anchor = element.anchor ?? 'top-left';
  const offsetX = element.offset?.x ?? 0;
  const offsetY = element.offset?.y ?? 0;
  const anchorStyle = getAnchorStyle(anchor, offsetX, offsetY);
  const isInteractive = element.type === 'button';

  return (
    <View
      style={[styles.anchoredWrapper, anchorStyle, { zIndex }]}
      pointerEvents={isInteractive ? 'auto' : 'none'}
    >
      <ElementRenderer element={element} ctx={ctx} theme={theme} onButtonPress={onButtonPress} />
    </View>
  );
}

function getAnchorStyle(
  anchor: OverlayAnchor,
  offsetX: number,
  offsetY: number,
): Record<string, unknown> {
  switch (anchor) {
    case 'top-left':
      return { top: offsetY, left: offsetX };
    case 'top-center':
      return { top: offsetY, left: '50%', transform: [{ translateX: '-50%' }] };
    case 'top-right':
      return { top: offsetY, right: offsetX };
    case 'center-left':
      return { top: '50%', left: offsetX, transform: [{ translateY: '-50%' }] };
    case 'center':
      return { top: '50%', left: '50%', transform: [{ translateX: '-50%' }, { translateY: '-50%' }] };
    case 'center-right':
      return { top: '50%', right: offsetX, transform: [{ translateY: '-50%' }] };
    case 'bottom-left':
      return { bottom: offsetY, left: offsetX };
    case 'bottom-center':
      return { bottom: offsetY, left: '50%', transform: [{ translateX: '-50%' }] };
    case 'bottom-right':
      return { bottom: offsetY, right: offsetX };
    default:
      return { top: offsetY, left: offsetX };
  }
}

function applyOverlayStyle(style?: OverlayStyle): Record<string, unknown> | undefined {
  if (!style) return undefined;
  const result: Record<string, unknown> = {};
  if (style.backgroundColor) result.backgroundColor = style.backgroundColor;
  if (style.borderRadius != null) result.borderRadius = style.borderRadius;
  if (style.borderColor) result.borderColor = style.borderColor;
  if (style.borderWidth != null) result.borderWidth = style.borderWidth;
  if (style.padding != null) result.padding = style.padding;
  if (style.paddingHorizontal != null) result.paddingHorizontal = style.paddingHorizontal;
  if (style.paddingVertical != null) result.paddingVertical = style.paddingVertical;
  if (style.opacity != null) result.opacity = style.opacity;
  if (style.shadow) {
    result.shadowColor = '#000';
    result.shadowOffset = { width: 0, height: 2 };
    result.shadowOpacity = 0.5;
    result.shadowRadius = 4;
    result.elevation = 4;
  }
  return result;
}

function ElementRenderer({
  element,
  ctx,
  theme,
  onButtonPress,
}: {
  element: OverlayElement;
  ctx: BindingContext;
  theme: Required<Pick<OverlayTheme, 'textColor' | 'fontSize' | 'primaryColor' | 'backgroundColor'>>;
  onButtonPress?: (eventName: string, eventData?: Record<string, unknown>) => void;
}) {
  switch (element.type) {
    case 'text':
      return <TextElement element={element} ctx={ctx} theme={theme} />;
    case 'bar':
      return <BarElement element={element} ctx={ctx} theme={theme} />;
    case 'counter':
      return <CounterElement element={element} ctx={ctx} theme={theme} />;
    case 'button':
      return <ButtonElement element={element} ctx={ctx} theme={theme} onButtonPress={onButtonPress} />;
    case 'image':
      return <ImageElement element={element} ctx={ctx} />;
    case 'container':
      return <ContainerElement element={element} ctx={ctx} theme={theme} onButtonPress={onButtonPress} />;
    case 'spacer':
      return <SpacerElement element={element} />;
    default:
      return null;
  }
}

function TextElement({ 
  element, 
  ctx, 
  theme 
}: { 
  element: TextOverlayElement; 
  ctx: BindingContext;
  theme: Required<Pick<OverlayTheme, 'textColor' | 'fontSize' | 'primaryColor' | 'backgroundColor'>>;
}) {
  const text = element.bindings?.text
    ? String(resolveBinding('text', element.bindings.text, ctx))
    : element.text ?? '';

  return (
    <Text
      style={[
        {
          fontSize: element.fontSize ?? theme.fontSize,
          color: element.color ?? theme.textColor,
          fontWeight: element.fontWeight ?? 'normal',
          fontFamily: element.fontFamily,
          textAlign: element.align ?? 'left',
          textShadowColor: 'rgba(0,0,0,0.75)',
          textShadowOffset: { width: 1, height: 1 },
          textShadowRadius: 2,
        },
        element.maxWidth ? { maxWidth: element.maxWidth } : undefined,
        applyOverlayStyle(element.style),
      ]}
      numberOfLines={element.maxWidth ? 1 : undefined}
      ellipsizeMode={element.maxWidth ? 'tail' : undefined}
    >
      {text}
    </Text>
  );
}

function BarElement({ 
  element, 
  ctx, 
  theme 
}: { 
  element: BarOverlayElement; 
  ctx: BindingContext;
  theme: Required<Pick<OverlayTheme, 'textColor' | 'fontSize' | 'primaryColor' | 'backgroundColor'>>;
}) {
  const value = element.bindings?.value
    ? Number(resolveBinding('value', element.bindings.value, ctx)) || 0
    : 0;
  const max = element.bindings?.max
    ? Number(resolveBinding('max', element.bindings.max, ctx)) || 100
    : 100;
  const fraction = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0;

  const barWidth = element.width ?? 100;
  const barHeight = element.height ?? 12;
  const fillColor = element.color ?? theme.primaryColor;
  const trackColor = element.backgroundColor ?? 'rgba(0,0,0,0.5)';
  const radius = element.borderRadius ?? 0;

  return (
    <View
      style={[
        {
          width: barWidth,
          height: barHeight,
          backgroundColor: trackColor,
          borderRadius: radius,
          overflow: 'hidden',
        },
        element.borderColor ? { borderColor: element.borderColor, borderWidth: 1 } : undefined,
        applyOverlayStyle(element.style),
      ]}
    >
      <View
        style={{
          width: `${fraction * 100}%`,
          height: '100%',
          backgroundColor: fillColor,
          borderRadius: radius,
        }}
      />
      {element.showLabel && (
        <Text
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            textAlign: 'center',
            textAlignVertical: 'center',
            fontSize: Math.max(8, barHeight - 4),
            color: '#FFFFFF',
            fontWeight: 'bold',
          }}
        >
          {(element.labelFormat ?? '{value}/{max}')
            .replace('{value}', String(Math.round(value)))
            .replace('{max}', String(Math.round(max)))
            .replace('{percent}', String(Math.round(fraction * 100)))}
        </Text>
      )}
    </View>
  );
}

function CounterElement({ 
  element, 
  ctx, 
  theme 
}: { 
  element: CounterOverlayElement; 
  ctx: BindingContext;
  theme: Required<Pick<OverlayTheme, 'textColor' | 'fontSize' | 'primaryColor' | 'backgroundColor'>>;
}) {
  const value = element.bindings?.value
    ? resolveBinding('value', element.bindings.value, ctx)
    : 0;
  const iconSize = element.iconSize ?? 20;
  const fontSize = element.fontSize ?? (theme.fontSize + 4);
  const color = element.color ?? theme.textColor;
  const gap = element.gap ?? 6;
  const direction = element.direction ?? 'icon-left';

  const isVertical = direction === 'icon-top';
  const isIconRight = direction === 'icon-right';

  const iconNode = element.iconEmoji ? (
    <Text style={{ fontSize: iconSize }}>{element.iconEmoji}</Text>
  ) : element.icon ? (
    <Image source={{ uri: element.icon }} style={{ width: iconSize, height: iconSize }} />
  ) : null;

  const valueNode = (
    <Text
      style={{
        fontSize,
        color,
        fontWeight: 'bold',
        textShadowColor: 'rgba(0,0,0,0.75)',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 2,
      }}
    >
      {String(value)}
    </Text>
  );

  return (
    <View
      style={[
        {
          flexDirection: isVertical ? 'column' : 'row',
          alignItems: 'center',
          gap,
        },
        applyOverlayStyle(element.style),
      ]}
    >
      {isIconRight ? (
        <>
          {valueNode}
          {iconNode}
        </>
      ) : (
        <>
          {iconNode}
          {valueNode}
        </>
      )}
    </View>
  );
}

function ButtonElement({
  element,
  ctx,
  theme,
  onButtonPress,
}: {
  element: ButtonOverlayElement;
  ctx: BindingContext;
  theme: Required<Pick<OverlayTheme, 'textColor' | 'fontSize' | 'primaryColor' | 'backgroundColor'>>;
  onButtonPress?: (eventName: string, eventData?: Record<string, unknown>) => void;
}) {
  const isDisabled =
    element.disabled ||
    (element.disabledWhen ? evaluateCondition(element.disabledWhen, ctx) : false);

  return (
    <Pressable
      onPress={() => {
        if (!isDisabled && onButtonPress) {
          onButtonPress(element.eventName, {
            ...element.eventData,
            __source: 'overlay',
            __elementId: element.id,
          });
        }
      }}
      disabled={isDisabled}
      style={[
        {
          backgroundColor: element.color ?? theme.primaryColor,
          paddingHorizontal: 16,
          paddingVertical: 10,
          borderRadius: 8,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: isDisabled ? 0.5 : 1,
        },
        element.width ? { width: element.width } : undefined,
        element.height ? { height: element.height } : undefined,
        applyOverlayStyle(element.style),
      ]}
    >
      <Text
        style={{
          color: element.textColor ?? '#FFFFFF',
          fontSize: element.fontSize ?? theme.fontSize,
          fontWeight: 'bold',
        }}
      >
        {element.label}
      </Text>
    </Pressable>
  );
}

function ImageElement({ element, ctx: _ctx }: { element: ImageOverlayElement; ctx: BindingContext }) {
  const uri = element.url ?? element.assetRef;
  if (!uri) return null;

  return (
    <Image
      source={{ uri }}
      style={[
        {
          width: element.width ?? 32,
          height: element.height ?? 32,
        },
        element.tint ? { tintColor: element.tint } : undefined,
        applyOverlayStyle(element.style),
      ]}
      resizeMode="contain"
    />
  );
}

function ContainerElement({
  element,
  ctx,
  theme,
  onButtonPress,
}: {
  element: ContainerOverlayElement;
  ctx: BindingContext;
  theme: Required<Pick<OverlayTheme, 'textColor' | 'fontSize' | 'primaryColor' | 'backgroundColor'>>;
  onButtonPress?: (eventName: string, eventData?: Record<string, unknown>) => void;
}) {
  const direction = element.direction ?? 'horizontal';
  const gap = element.gap ?? 0;

  return (
    <View
      style={[
        {
          flexDirection: direction === 'horizontal' ? 'row' : 'column',
          alignItems: direction === 'horizontal' ? 'center' : 'flex-start',
          gap,
        },
        applyOverlayStyle(element.style),
      ]}
      pointerEvents="box-none"
    >
      {element.children.map((child) => {
        if (child.visible === false) return null;
        if (child.visibleWhen && !evaluateCondition(child.visibleWhen, ctx)) return null;

        return (
          <View
            key={child.id}
            pointerEvents={child.type === 'button' ? 'auto' : 'none'}
          >
            <ElementRenderer element={child} ctx={ctx} theme={theme} onButtonPress={onButtonPress} />
          </View>
        );
      })}
    </View>
  );
}

function SpacerElement({ element }: { element: SpacerOverlayElement }) {
  return (
    <View
      style={{
        width: element.width ?? 0,
        height: element.height ?? 0,
      }}
    />
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
  },
  anchoredWrapper: {
    position: 'absolute',
  },
});
