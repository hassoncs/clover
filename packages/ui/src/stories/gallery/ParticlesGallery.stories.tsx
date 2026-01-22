import type { Meta, StoryObj } from '@storybook/react';
import { GalleryViewer } from './GalleryViewer';

const meta: Meta<typeof GalleryViewer> = {
  title: 'Gallery/Particles',
  component: GalleryViewer,
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const AllParticles: Story = {
  args: {
    sectionId: 'particles',
  },
};

export const FireParticles: Story = {
  args: {
    sectionId: 'particles',
    initialItemId: 'fire',
  },
};

export const SmokeParticles: Story = {
  args: {
    sectionId: 'particles',
    initialItemId: 'smoke',
  },
};

export const SparksParticles: Story = {
  args: {
    sectionId: 'particles',
    initialItemId: 'sparks',
  },
};
