import React, { useEffect, useState, useRef } from 'react';
import { StyleSheet } from 'react-native';
import {
  Canvas,
  Circle,
  Rect,
  Fill,
  Group,
  vec,
} from '@shopify/react-native-skia';
import type { GalleryItem } from '@slopcade/shared';

type BehaviorPreviewProps = {
  item: GalleryItem;
  params: Record<string, unknown>;
  width: number;
  height: number;
};

type EntityState = {
  x: number;
  y: number;
  rotation: number;
  vx: number;
  vy: number;
};

export default function BehaviorPreview({ item, params, width, height }: BehaviorPreviewProps) {
  const behaviorType = item.id.replace('behavior-', '');
  const [entity, setEntity] = useState<EntityState>({
    x: width / 2,
    y: height / 2,
    rotation: 0,
    vx: 0,
    vy: 0,
  });
  const lastTimeRef = useRef<number>(Date.now());

  useEffect(() => {
    setEntity({
      x: width / 2,
      y: height / 2,
      rotation: 0,
      vx: 0,
      vy: 0,
    });
  }, [width, height]);

  useEffect(() => {
    let animationFrameId: number;

    const animate = () => {
      const now = Date.now();
      const dt = Math.min((now - lastTimeRef.current) / 1000, 0.05);
      lastTimeRef.current = now;

      setEntity(prev => {
        const next = { ...prev };
        const speed = (params.speed as number) ?? 100;

        switch (behaviorType) {
          case 'move': {
            const direction = params.direction as string ?? 'right';
            switch (direction) {
              case 'right': next.x += speed * dt; break;
              case 'left': next.x -= speed * dt; break;
              case 'up': next.y -= speed * dt; break;
              case 'down': next.y += speed * dt; break;
            }
            if (next.x > width + 20) next.x = -20;
            if (next.x < -20) next.x = width + 20;
            if (next.y > height + 20) next.y = -20;
            if (next.y < -20) next.y = height + 20;
            break;
          }
          case 'rotate': {
            const rotSpeed = (params.speed as number) ?? 90;
            const dir = params.direction === 'counterclockwise' ? -1 : 1;
            next.rotation += rotSpeed * dt * dir;
            break;
          }
          case 'oscillate': {
            const amplitude = (params.amplitude as number) ?? 50;
            const frequency = (params.frequency as number) ?? 1;
            const axis = params.axis as string ?? 'x';
            const time = now / 1000;
            if (axis === 'x' || axis === 'both') {
              next.x = width / 2 + Math.sin(time * frequency * Math.PI * 2) * amplitude;
            }
            if (axis === 'y' || axis === 'both') {
              next.y = height / 2 + Math.cos(time * frequency * Math.PI * 2) * amplitude;
            }
            break;
          }
          case 'bounce': {
            const minX = (params.minX as number) ?? 30;
            const maxX = (params.maxX as number) ?? width - 30;
            const minY = (params.minY as number) ?? 30;
            const maxY = (params.maxY as number) ?? height - 30;
            
            if (prev.vx === 0 && prev.vy === 0) {
              next.vx = speed;
              next.vy = speed * 0.7;
            }
            
            next.x += next.vx * dt;
            next.y += next.vy * dt;
            
            if (next.x < minX || next.x > maxX) {
              next.vx *= -1;
              next.x = Math.max(minX, Math.min(maxX, next.x));
            }
            if (next.y < minY || next.y > maxY) {
              next.vy *= -1;
              next.y = Math.max(minY, Math.min(maxY, next.y));
            }
            break;
          }
          case 'follow':
          case 'rotate_toward': {
            const targetX = width * 0.75;
            const targetY = height * 0.25;
            const dx = targetX - prev.x;
            const dy = targetY - prev.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (behaviorType === 'follow' && dist > 5) {
              next.x += (dx / dist) * speed * dt;
              next.y += (dy / dist) * speed * dt;
            }
            if (behaviorType === 'rotate_toward') {
              next.rotation = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
            }
            break;
          }
          case 'gravity_zone':
          case 'magnetic': {
            next.rotation += 30 * dt;
            break;
          }
          default:
            break;
        }

        return next;
      });

      animationFrameId = requestAnimationFrame(animate);
    };

    animationFrameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrameId);
  }, [behaviorType, params, width, height]);

  const renderTarget = () => {
    if (behaviorType === 'follow' || behaviorType === 'rotate_toward') {
      return (
        <Circle
          cx={width * 0.75}
          cy={height * 0.25}
          r={15}
          color="#ff6b6b"
          opacity={0.8}
        />
      );
    }
    return null;
  };

  const renderEffectArea = () => {
    if (behaviorType === 'gravity_zone' || behaviorType === 'magnetic') {
      const radius = (params.radius as number) ?? 100;
      return (
        <Circle
          cx={entity.x}
          cy={entity.y}
          r={radius}
          color={behaviorType === 'magnetic' ? '#4ecdc4' : '#ffe66d'}
          opacity={0.15}
        />
      );
    }
    return null;
  };

  return (
    <Canvas style={[styles.canvas, { width, height }]}>
      <Fill color="#1a1a2e" />
      {renderEffectArea()}
      {renderTarget()}
      <Group transform={[{ rotate: entity.rotation * (Math.PI / 180) }]} origin={vec(entity.x, entity.y)}>
        <Rect
          x={entity.x - 20}
          y={entity.y - 20}
          width={40}
          height={40}
          color="#4ecdc4"
        />
      </Group>
    </Canvas>
  );
}

const styles = StyleSheet.create({
  canvas: {
    borderRadius: 12,
  },
});
