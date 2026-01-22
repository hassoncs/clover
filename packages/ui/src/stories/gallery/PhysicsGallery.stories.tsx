import type { Meta, StoryObj } from '@storybook/react';
import { GalleryViewer } from './GalleryViewer';

const meta: Meta<typeof GalleryViewer> = {
  title: 'Gallery/Physics',
  component: GalleryViewer,
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const AllPhysics: Story = {
  args: {
    sectionId: 'physics',
  },
};

export const DynamicBody: Story = {
  args: {
    sectionId: 'physics',
    initialItemId: 'dynamic-body',
  },
};

export const StaticBody: Story = {
  args: {
    sectionId: 'physics',
    initialItemId: 'static-body',
  },
};

export const RevoluteJoint: Story = {
  args: {
    sectionId: 'physics',
    initialItemId: 'revolute-joint',
  },
};
