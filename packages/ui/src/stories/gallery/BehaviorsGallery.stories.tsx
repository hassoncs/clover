import type { Meta, StoryObj } from '@storybook/react';
import { GalleryViewer } from './GalleryViewer';

const meta: Meta<typeof GalleryViewer> = {
  title: 'Gallery/Behaviors',
  component: GalleryViewer,
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const AllBehaviors: Story = {
  args: {
    sectionId: 'behaviors',
  },
};

export const MoveBehavior: Story = {
  args: {
    sectionId: 'behaviors',
    initialItemId: 'move',
  },
};

export const ControlBehavior: Story = {
  args: {
    sectionId: 'behaviors',
    initialItemId: 'control',
  },
};

export const SpawnBehavior: Story = {
  args: {
    sectionId: 'behaviors',
    initialItemId: 'spawn',
  },
};
