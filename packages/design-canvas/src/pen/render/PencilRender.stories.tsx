import type { Meta, StoryObj } from "@storybook/react";
import { View, useWindowDimensions } from "react-native";
import { PenCanvasFixture } from "./PenCanvasFixture";
import { parsePenDocument } from "@slopcade/shared/types/pen";

// We import the raw JSON
import liftlogData from "./fixtures/liftlog-25-v1.json";

const parsedDoc = parsePenDocument(liftlogData as any);

const meta = {
  title: "Pencil Rendering/LiftLog",
  component: View,
  decorators: [
    (Story) => (
      <View style={{ width: "100vw", height: "100vh", backgroundColor: "#1e1e1e", display: "flex", justifyContent: "center", alignItems: "center" }}>
        <Story />
      </View>
    ),
  ],
} satisfies Meta<typeof View>;
export default meta;
type Story = StoryObj<typeof meta>;

function findNodeInDoc(name: string, nodes: any[] = parsedDoc.children, currentAbsX = 0, currentAbsY = 0): any {
  for (const n of nodes) {
    if (n.name === name) return { ...n, absX: currentAbsX + (n.x || 0), absY: currentAbsY + (n.y || 0) };
    if (n.children) {
      const found = findNodeInDoc(name, n.children, currentAbsX + (n.x || 0), currentAbsY + (n.y || 0));
      if (found) return found;
    }
  }
  return null;
}

function RenderFrame({ frameName }: { frameName: string }) {
  const { width, height } = useWindowDimensions();
  const targetFrame = findNodeInDoc(frameName);
  
  const absX = targetFrame?.absX || 0;
  const absY = targetFrame?.absY || 0;
  const frameW = targetFrame?.width || 390;
  const frameH = targetFrame?.height || 844;
  
  const camera = {
    translateX: -absX,
    translateY: -absY,
    scale: 1,
  };

  const scale = Math.min(width / frameW, height / frameH) * 0.95; // 5% padding

  return (
    <div style={{
      width: frameW,
      height: frameH,
      transform: `scale(${scale})`,
      transformOrigin: 'center center',
      boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
      backgroundColor: '#fff',
      overflow: 'hidden',
    }}>
      <PenCanvasFixture 
        document={parsedDoc}
        width={frameW}
        height={frameH}
        camera={camera}
        selectedNodePath={[]}
      />
    </div>
  );
}

export const Login: Story = { render: () => <RenderFrame frameName="Login" /> };
export const AuthCallback: Story = { render: () => <RenderFrame frameName="Auth Callback" /> };
export const Settings: Story = { render: () => <RenderFrame frameName="Settings" /> };
export const ExerciseList: Story = { render: () => <RenderFrame frameName="Exercise List" /> };
export const ExerciseDetail: Story = { render: () => <RenderFrame frameName="Exercise Detail" /> };
export const ExerciseStats: Story = { render: () => <RenderFrame frameName="Exercise Stats" /> };
export const CreateExercise: Story = { render: () => <RenderFrame frameName="Create Exercise" /> };
export const WorkoutsList: Story = { render: () => <RenderFrame frameName="Workouts List" /> };
export const WorkoutDetail: Story = { render: () => <RenderFrame frameName="Workout Detail" /> };
export const CreateWorkout: Story = { render: () => <RenderFrame frameName="Create Workout" /> };
export const WorkoutHistory: Story = { render: () => <RenderFrame frameName="Workout History" /> };
export const ActiveWorkout: Story = { render: () => <RenderFrame frameName="Active Workout" /> };
export const SetLogModal: Story = { render: () => <RenderFrame frameName="Set Log Modal" /> };
export const ExercisePicker: Story = { render: () => <RenderFrame frameName="Exercise Picker Modal" /> };
export const RestTimer: Story = { render: () => <RenderFrame frameName="Rest Timer" /> };
