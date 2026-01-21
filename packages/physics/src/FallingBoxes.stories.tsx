import type { Meta, StoryObj } from '@storybook/react';
import { FallingBoxes } from '@clover/physics';

const meta: Meta<typeof FallingBoxes> = {
  title: 'Physics/FallingBoxes',
  component: FallingBoxes,
  parameters: {
    layout: 'centered',
  },
  decorators: [
    (Story) => (
      <div style={{ width: '100%', height: '400px' }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
};