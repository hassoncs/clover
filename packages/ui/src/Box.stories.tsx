import type { Meta, StoryObj } from '@storybook/react';
import { Box } from './Box';
import { Text } from './Text';

const meta: Meta<typeof Box> = {
  title: 'UI/Box',
  component: Box,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    className: 'bg-primary p-4 rounded-md',
    children: <Text className="text-white">This is a Box with primary background</Text>,
  },
};
