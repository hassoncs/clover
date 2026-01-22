import { useMemo } from "react";
import { Group, Rect, Circle, Paint } from "@shopify/react-native-skia";
import { useEditor } from "./EditorProvider";

interface SelectionOverlayProps {
  pixelsPerMeter?: number;
  handleSize?: number;
}

export function SelectionOverlay({
  pixelsPerMeter = 50,
  handleSize = 12,
}: SelectionOverlayProps) {
  const { selectedEntityId, document } = useEditor();

  const bounds = useMemo(() => {
    if (!selectedEntityId) return null;

    const entity = document.entities.find((e) => e.id === selectedEntityId);
    if (!entity) return null;

    if (!entity.template) return null;
    const template = document.templates[entity.template];
    if (!template) return null;

    const physics = template.physics;
    let width = 1;
    let height = 1;
    if (physics?.shape === "box") {
      width = physics.width ?? 1;
      height = physics.height ?? 1;
    } else if (physics?.shape === "circle") {
      width = (physics.radius ?? 0.5) * 2;
      height = (physics.radius ?? 0.5) * 2;
    }

    const scaleX = entity.transform.scaleX ?? 1;
    const scaleY = entity.transform.scaleY ?? 1;

    const worldWidth = width * scaleX;
    const worldHeight = height * scaleY;

    const centerX = entity.transform.x * pixelsPerMeter;
    const centerY = entity.transform.y * pixelsPerMeter;

    const pixelWidth = worldWidth * pixelsPerMeter;
    const pixelHeight = worldHeight * pixelsPerMeter;

    return {
      x: centerX - pixelWidth / 2,
      y: centerY - pixelHeight / 2,
      width: pixelWidth,
      height: pixelHeight,
      centerX,
      centerY,
      rotation: entity.transform.angle ?? 0,
    };
  }, [selectedEntityId, document.entities, document.templates, pixelsPerMeter]);

  if (!bounds) return null;

  const corners = [
    { x: bounds.x, y: bounds.y },
    { x: bounds.x + bounds.width, y: bounds.y },
    { x: bounds.x, y: bounds.y + bounds.height },
    { x: bounds.x + bounds.width, y: bounds.y + bounds.height },
  ];

  return (
    <Group
      transform={[
        { translateX: bounds.centerX },
        { translateY: bounds.centerY },
        { rotate: bounds.rotation },
        { translateX: -bounds.centerX },
        { translateY: -bounds.centerY },
      ]}
    >
      <Rect
        x={bounds.x}
        y={bounds.y}
        width={bounds.width}
        height={bounds.height}
        style="stroke"
        strokeWidth={2}
        color="#3B82F6"
      />

      <Rect
        x={bounds.x}
        y={bounds.y}
        width={bounds.width}
        height={bounds.height}
        style="stroke"
        strokeWidth={1}
        color="white"
      >
        <Paint style="stroke" strokeWidth={1} color="white" />
      </Rect>

      {corners.map((corner) => (
        <Group key={`${corner.x}-${corner.y}`}>
          <Circle
            cx={corner.x}
            cy={corner.y}
            r={handleSize / 2}
            color="white"
            style="fill"
          />
          <Circle
            cx={corner.x}
            cy={corner.y}
            r={handleSize / 2}
            color="#3B82F6"
            style="stroke"
            strokeWidth={2}
          />
        </Group>
      ))}

      <Group>
        <Circle
          cx={bounds.x + bounds.width / 2}
          cy={bounds.y - 24}
          r={handleSize / 2 - 2}
          color="white"
          style="fill"
        />
        <Circle
          cx={bounds.x + bounds.width / 2}
          cy={bounds.y - 24}
          r={handleSize / 2 - 2}
          color="#3B82F6"
          style="stroke"
          strokeWidth={2}
        />
      </Group>
    </Group>
  );
}
