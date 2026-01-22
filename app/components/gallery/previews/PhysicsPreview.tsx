import { useEffect, useState, useRef } from 'react';
import {
  Canvas,
  Circle,
  Rect,
  Line,
  Fill,
  Group,
  vec,
  Path,
  Skia,
} from '@shopify/react-native-skia';
import type { GalleryItem } from '@slopcade/shared';

type PhysicsPreviewProps = {
  item: GalleryItem;
  params: Record<string, unknown>;
  width: number;
  height: number;
};

type BodyState = {
  x: number;
  y: number;
  rotation: number;
  vx: number;
  vy: number;
  vr: number;
};

export default function PhysicsPreview({ item, params, width, height }: PhysicsPreviewProps) {
  const physicsId = item.id.replace('physics-', '');
  const [body, setBody] = useState<BodyState>({
    x: width / 2,
    y: height * 0.3,
    rotation: 0,
    vx: 0,
    vy: 0,
    vr: 0,
  });
  const lastTimeRef = useRef<number>(Date.now());

  useEffect(() => {
    setBody({
      x: width / 2,
      y: height * 0.3,
      rotation: 0,
      vx: 50,
      vy: 0,
      vr: 0,
    });
  }, [width, height]);

  useEffect(() => {
    let animationFrameId: number;
    const gravity = 200;
    const groundY = height - 40;
    const restitution = (params.restitution as number) ?? 0.5;
    const friction = (params.friction as number) ?? 0.3;

    const animate = () => {
      const now = Date.now();
      const dt = Math.min((now - lastTimeRef.current) / 1000, 0.05);
      lastTimeRef.current = now;

      setBody(prev => {
        const next = { ...prev };

        if (physicsId === 'body-dynamic' || physicsId.startsWith('shape-') || physicsId.startsWith('force-')) {
          next.vy += gravity * dt;
          next.x += next.vx * dt;
          next.y += next.vy * dt;
          next.rotation += next.vr * dt;

          if (next.y > groundY - 25) {
            next.y = groundY - 25;
            next.vy *= -restitution;
            next.vx *= (1 - friction);
            if (Math.abs(next.vy) < 20) next.vy = 0;
          }

          if (next.x < 25) { next.x = 25; next.vx *= -restitution; }
          if (next.x > width - 25) { next.x = width - 25; next.vx *= -restitution; }
        }

        if (physicsId === 'body-kinematic') {
          next.x = width / 2 + Math.sin(now / 500) * 80;
          next.y = height / 2;
        }

        if (physicsId.startsWith('joint-')) {
          next.rotation = Math.sin(now / 300) * 45;
          next.x = width / 2;
          next.y = height / 2;
        }

        if (physicsId === 'force-torque') {
          const torque = (params.torque as number) ?? 100;
          next.vr = torque;
          next.rotation += next.vr * dt;
          next.y = height / 2;
        }

        return next;
      });

      animationFrameId = requestAnimationFrame(animate);
    };

    animationFrameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrameId);
  }, [physicsId, params, width, height]);

  const renderGround = () => (
    <Rect
      x={0}
      y={height - 40}
      width={width}
      height={40}
      color="#333"
    />
  );

  const renderBody = () => {
    const size = 50;
    
    if (physicsId.includes('circle') || physicsId === 'shape-circle') {
      const radius = (params.radius as number) ?? 50;
      const scaledRadius = Math.min(radius, 60);
      return (
        <Group transform={[{ rotate: body.rotation * (Math.PI / 180) }]} origin={vec(body.x, body.y)}>
          <Circle cx={body.x} cy={body.y} r={scaledRadius} color="#4ecdc4" />
        </Group>
      );
    }

    if (physicsId === 'shape-polygon') {
      const sides = (params.sides as number) ?? 5;
      const polySize = (params.size as number) ?? 50;
      const scaledSize = Math.min(polySize, 50);
      const pathStr = generatePolygonPath(body.x, body.y, sides, scaledSize);
      const path = Skia.Path.MakeFromSVGString(pathStr);
      if (!path) return null;
      return (
        <Group transform={[{ rotate: body.rotation * (Math.PI / 180) }]} origin={vec(body.x, body.y)}>
          <Path path={path} color="#ffe66d" />
        </Group>
      );
    }

    const w = Math.min((params.width as number) ?? 100, 80);
    const h = Math.min((params.height as number) ?? 100, 80);
    
    let color = '#4ecdc4';
    if (physicsId === 'body-static') color = '#666';
    if (physicsId === 'body-kinematic') color = '#a8dadc';

    return (
      <Group transform={[{ rotate: body.rotation * (Math.PI / 180) }]} origin={vec(body.x, body.y)}>
        <Rect x={body.x - w/2} y={body.y - h/2} width={w} height={h} color={color} />
      </Group>
    );
  };

  const renderJoint = () => {
    if (!physicsId.startsWith('joint-')) return null;
    
    const anchorX = width / 2;
    const anchorY = height * 0.2;
    const armLength = 80;
    const endX = anchorX + Math.sin(body.rotation * (Math.PI / 180)) * armLength;
    const endY = anchorY + Math.cos(body.rotation * (Math.PI / 180)) * armLength;

    return (
      <>
        <Circle cx={anchorX} cy={anchorY} r={8} color="#ff6b6b" />
        <Line p1={vec(anchorX, anchorY)} p2={vec(endX, endY)} color="#888" strokeWidth={4} />
        <Rect x={endX - 20} y={endY - 20} width={40} height={40} color="#4ecdc4" />
      </>
    );
  };

  const renderForceArrow = () => {
    if (!physicsId.startsWith('force-')) return null;
    
    const forceX = (params.forceX as number) ?? 0;
    const forceY = (params.forceY as number) ?? -500;
    const scale = 0.1;
    
    const startX = body.x;
    const startY = body.y;
    const endX = startX + forceX * scale;
    const endY = startY + forceY * scale;

    if (physicsId === 'force-torque') return null;

    return (
      <Line
        p1={vec(startX, startY)}
        p2={vec(endX, endY)}
        color="#ff6b6b"
        strokeWidth={3}
      />
    );
  };

  return (
    <Canvas style={{ width, height, borderRadius: 12 }}>
      <Fill color="#1a1a2e" />
      {renderGround()}
      {renderJoint() || (
        <>
          {renderBody()}
          {renderForceArrow()}
        </>
      )}
    </Canvas>
  );
}

function generatePolygonPath(cx: number, cy: number, sides: number, size: number): string {
  const points: string[] = [];
  for (let i = 0; i < sides; i++) {
    const angle = (i * 2 * Math.PI) / sides - Math.PI / 2;
    const x = cx + Math.cos(angle) * size;
    const y = cy + Math.sin(angle) * size;
    points.push(i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`);
  }
  points.push('Z');
  return points.join(' ');
}
