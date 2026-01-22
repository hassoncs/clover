import type { Meta, StoryObj } from '@storybook/react';
import { Interaction } from '@slopcade/physics';

const meta: Meta<typeof Interaction> = {
  title: 'Physics/Interaction',
  component: Interaction,
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