import type { Meta, StoryObj } from '@storybook/react';
import { GalleryViewer } from './GalleryViewer';

const meta: Meta<typeof GalleryViewer> = {
  title: 'Gallery/Effects',
  component: GalleryViewer,
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const AllEffects: Story = {
  args: {
    sectionId: 'effects',
  },
};

export const GlowEffect: Story = {
  args: {
    sectionId: 'effects',
    initialItemId: 'glow',
  },
};

export const BlurEffect: Story = {
  args: {
    sectionId: 'effects',
    initialItemId: 'blur',
  },
};

export const DissolveEffect: Story = {
  args: {
    sectionId: 'effects',
    initialItemId: 'dissolve',
  },
};
