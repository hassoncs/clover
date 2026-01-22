import type { Meta, StoryObj } from '@storybook/react';
import { GalleryViewer } from './GalleryViewer';

const meta: Meta<typeof GalleryViewer> = {
  title: 'Gallery/Sprites',
  component: GalleryViewer,
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const AllSprites: Story = {
  args: {
    sectionId: 'sprites',
  },
};

export const RectSprite: Story = {
  args: {
    sectionId: 'sprites',
    initialItemId: 'rect',
  },
};

export const CircleSprite: Story = {
  args: {
    sectionId: 'sprites',
    initialItemId: 'circle',
  },
};

export const PolygonSprite: Story = {
  args: {
    sectionId: 'sprites',
    initialItemId: 'polygon',
  },
};

export const ImageSprite: Story = {
  args: {
    sectionId: 'sprites',
    initialItemId: 'image',
  },
};
