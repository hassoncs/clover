import React from "react";
import { Circle, Group, Line } from "@shopify/react-native-skia";
import type { InputState } from "../BehaviorContext";

interface DebugInputOverlayProps {
  input: React.MutableRefObject<InputState>;
  width: number;
  height: number;
}

export const DebugInputOverlay: React.FC<DebugInputOverlayProps> = ({
  input,
  width,
  height,
}) => {
  const { tap, drag, buttons } = input.current;

  return (
    <Group>
      {/* Tap Visualization */}
      {tap && (
        <Group>
          <Circle cx={tap.x} cy={tap.y} r={20} color="rgba(255, 255, 255, 0.3)" />
          <Circle cx={tap.x} cy={tap.y} r={15} color="rgba(255, 255, 255, 0.5)" style="stroke" strokeWidth={2} />
        </Group>
      )}

      {/* Drag Visualization */}
      {drag && (
        <Group>
          <Circle cx={drag.startX} cy={drag.startY} r={10} color="rgba(255, 255, 0, 0.3)" />
          <Line
            p1={{ x: drag.startX, y: drag.startY }}
            p2={{ x: drag.currentX, y: drag.currentY }}
            color="rgba(255, 255, 0, 0.5)"
            strokeWidth={4}
          />
          <Circle cx={drag.currentX} cy={drag.currentY} r={20} color="rgba(255, 255, 0, 0.3)" />
        </Group>
      )}

      {/* Buttons Visualization (HUD style) */}
      {buttons && (
        <Group>
          {/* Left Arrow */}
          <Circle cx={50} cy={height - 50} r={25} color={buttons.left ? "rgba(0, 255, 0, 0.5)" : "rgba(255, 255, 255, 0.15)"} />
          {/* Right Arrow */}
          <Circle cx={120} cy={height - 50} r={25} color={buttons.right ? "rgba(0, 255, 0, 0.5)" : "rgba(255, 255, 255, 0.15)"} />
          {/* Up Arrow */}
          <Circle cx={85} cy={height - 90} r={25} color={buttons.up ? "rgba(0, 255, 0, 0.5)" : "rgba(255, 255, 255, 0.15)"} />
          {/* Down Arrow */}
          <Circle cx={85} cy={height - 50} r={25} color={buttons.down ? "rgba(0, 255, 0, 0.5)" : "rgba(255, 255, 255, 0.15)"} />
          
          {/* Jump (Space) */}
          <Circle cx={width - 50} cy={height - 50} r={30} color={buttons.jump ? "rgba(0, 0, 255, 0.5)" : "rgba(255, 255, 255, 0.15)"} />
          
          {/* Action */}
          <Circle cx={width - 50} cy={height - 120} r={20} color={buttons.action ? "rgba(255, 0, 0, 0.5)" : "rgba(255, 255, 255, 0.15)"} />
        </Group>
      )}
    </Group>
  );
};
