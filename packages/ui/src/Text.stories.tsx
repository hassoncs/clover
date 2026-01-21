import type { Meta, StoryObj } from '@storybook/react';
import { Text } from './Text';

const meta: Meta<typeof Text> = {
  title: 'UI/Text',
  component: Text,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'h1', 'h2', 'h3', 'h4', 'large', 'small', 'muted'],
    },
    align: {
      control: 'select',
      options: ['left', 'center', 'right'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: 'The quick brown fox jumps over the lazy dog',
    variant: 'default',
  },
};

export const H1: Story = {
  args: {
    children: 'Heading 1',
    variant: 'h1',
  },
};

export const Muted: Story = {
  args: {
    children: 'Muted text description',
    variant: 'muted',
  },
};
