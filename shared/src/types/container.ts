import type { Vec2 } from './common';
import type { EntityTarget } from './rules';

// ============================================================================
// Container Configuration Types (Game Definition)
// ============================================================================

export type ContainerType = 'stack' | 'grid' | 'slots';

export interface BaseContainerConfig {
  id: string;
  type: ContainerType;
}

/**
 * Stack container for vertical/horizontal stacking (Ball Sort tubes, card piles)
 */
export interface StackContainerConfig extends BaseContainerConfig {
  type: 'stack';
  /** Maximum number of items the container can hold */
  capacity: number;
  layout: {
    /** Direction items are stacked */
    direction: 'vertical' | 'horizontal';
    /** Distance between items in world units */
    spacing: number;
    /** Position of the first item (bottom/left) */
    basePosition: Vec2;
    /** Anchor point for positioning items within slots */
    anchor?: 'center' | 'bottom' | 'top' | 'left' | 'right';
  };
}

/**
 * Grid container for 2D arrangements (Gem Crush, Connect4 board)
 */
export interface GridContainerConfig extends BaseContainerConfig {
  type: 'grid';
  /** Number of rows */
  rows: number;
  /** Number of columns */
  cols: number;
  /** Size of each cell in world units */
  cellSize: number;
  /** Position of the grid origin */
  origin: Vec2;
  /** Which corner the origin is at */
  originAnchor?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
  /** Optional tag pattern for match detection (e.g., "color-*" or "gem_*") */
  matchTagPattern?: string;
  /** Minimum match length for match detection */
  minMatch?: number;
}

/**
 * Slot container for linear arrangements with named slots (choice tiles, inventory)
 */
export interface SlotContainerConfig extends BaseContainerConfig {
  type: 'slots';
  /** Number of slots */
  count: number;
  layout: {
    /** Direction slots are arranged */
    direction: 'vertical' | 'horizontal';
    /** Distance between slots in world units */
    spacing: number;
    /** Position of the first slot */
    basePosition: Vec2;
  };
  /** Whether slots can be empty (false = always fill) */
  allowEmpty?: boolean;
}

export type ContainerConfig = 
  | StackContainerConfig 
  | GridContainerConfig 
  | SlotContainerConfig;

// ============================================================================
// Container Instance Types (Runtime)
// ============================================================================

export interface StackContainerInstance {
  id: string;
  type: 'stack';
  capacity: number;
  items: string[];  // Entity IDs from bottom to top
  layout: StackContainerConfig['layout'];
}

export interface GridCell {
  row: number;
  col: number;
}

export interface GridContainerInstance {
  id: string;
  type: 'grid';
  rows: number;
  cols: number;
  cellSize: number;
  origin: Vec2;
  originAnchor: NonNullable<GridContainerConfig['originAnchor']>;
  cells: (string | null)[][];  // Entity ID or null
  matchTagPattern?: string;
  minMatch?: number;
}

export interface SlotContainerInstance {
  id: string;
  type: 'slots';
  count: number;
  selectedIndex: number | null;
  slots: (string | null)[];  // Entity ID or null
  layout: SlotContainerConfig['layout'];
  allowEmpty: boolean;
}

export type ContainerInstance = 
  | StackContainerInstance 
  | GridContainerInstance 
  | SlotContainerInstance;

// ============================================================================
// Match Rule for Validation
// ============================================================================

/**
 * Rule for validating if an item can be added to a container
 */
export interface ContainerMatchRule {
  /** Tag pattern the item must have (e.g., "color-*" matches "color-0", "color-1") */
  tag?: string;
  /** Tag pattern the top item must NOT have (for negative matching) */
  excludeTag?: string;
  /** Property value that must match the top item */
  property?: string;
  /** Expression for custom validation */
  expr?: string;
  /** Empty containers always accept (default: true) */
  allowEmpty?: boolean;
}

// ============================================================================
// Container Action Types (Game Rules)
// ============================================================================

/**
 * Push an item onto a container (top of stack, first empty slot, etc.)
 */
export interface ContainerPushAction {
  type: 'container_push';
  /** Container ID or expression resolving to container ID */
  container: string;
  /** Entity to push (by ID, tag, or expression result) */
  item: string | EntityTarget;
  /** Store the item reference for subsequent actions (e.g., "heldBall") */
  storeAs?: string;
  /** Position adjustment for the item within container */
  position?: {
    offset?: Vec2;
    animate?: boolean;
    duration?: number;
  };
}

/**
 * Pop an item from a container (top of stack, selected slot, etc.)
 */
export interface ContainerPopAction {
  type: 'container_pop';
  /** Container ID or expression resolving to container ID */
  container: string;
  /** Which item to pop: "top" (stack), "selected" (slots), or specific index */
  position?: 'top' | 'selected' | number;
  /** Store the popped item reference for subsequent actions */
  storeAs?: string;
  /** Remove the item from the world when popped */
  destroyAfter?: boolean;
}

/**
 * Transfer an item between containers
 */
export interface ContainerTransferAction {
  type: 'container_transfer';
  /** Source container ID */
  fromContainer: string;
  /** Target container ID */
  toContainer: string;
  /** Item to transfer (from top of source by default) */
  item?: string | EntityTarget;
  /** Position in source container (default: top/selected) */
  fromPosition?: 'top' | 'selected' | number;
  /** Position in target container (default: next available) */
  toPosition?: 'next' | number;
  /** Store the transferred item reference */
  storeAs?: string;
  /** Animate the transfer */
  animate?: boolean;
  /** Duration of animation in seconds */
  duration?: number;
}

/**
 * Swap two items within a container or between containers
 */
export interface ContainerSwapAction {
  type: 'container_swap';
  /** Container ID or expression */
  container: string;
  /** First position (index or "top"/"selected") */
  positionA: number | 'top' | 'selected';
  /** Second position (index or "top"/"selected") */
  positionB: number | 'top' | 'selected';
  /** If true, swap between two containers */
  betweenContainers?: boolean;
  /** Second container ID (if betweenContainers is true) */
  containerB?: string;
}

/**
 * Clear all items from a container
 */
export interface ContainerClearAction {
  type: 'container_clear';
  /** Container ID */
  container: string;
  /** Destroy items instead of just removing from container */
  destroy?: boolean;
  /** Keep N items (from top/end) */
  keep?: number;
}

/**
 * Select a slot in a slots container
 */
export interface ContainerSelectAction {
  type: 'container_select';
  /** Container ID */
  container: string;
  /** Slot index to select, or "next"/"previous" */
  index: number | 'next' | 'previous' | 'first' | 'last';
  /** Clear current selection */
  deselectOthers?: boolean;
}

/**
 * Deselect all slots in a container
 */
export interface ContainerDeselectAction {
  type: 'container_deselect';
  /** Container ID */
  container: string;
}

export type ContainerAction =
  | ContainerPushAction
  | ContainerPopAction
  | ContainerTransferAction
  | ContainerSwapAction
  | ContainerClearAction
  | ContainerSelectAction
  | ContainerDeselectAction;

// ============================================================================
// Container Condition Types (Game Rules)
// ============================================================================

export interface ContainerIsEmptyCondition {
  type: 'container_is_empty';
  /** Container ID or expression */
  container: string;
  /** Negate the condition (passes when NOT empty) */
  negated?: boolean;
}

export interface ContainerIsFullCondition {
  type: 'container_is_full';
  /** Container ID or expression */
  container: string;
  /** Negate the condition (passes when NOT full) */
  negated?: boolean;
}

export interface ContainerCountCondition {
  type: 'container_count';
  /** Container ID or expression */
  container: string;
  /** Comparison operator */
  comparison: 'eq' | 'gt' | 'lt' | 'gte' | 'lte' | 'neq';
  /** Value to compare against */
  value: number;
}

export interface ContainerHasItemCondition {
  type: 'container_has_item';
  /** Container ID or expression */
  container: string;
  /** Entity ID or tag to check for */
  item: string | EntityTarget;
  /** Negate (passes when item is NOT in container) */
  negated?: boolean;
}

export interface ContainerCanAcceptCondition {
  type: 'container_can_accept';
  /** Container ID or expression */
  container: string;
  /** Item to check (by ID, tag, or expression result) */
  item: string | EntityTarget;
  /** Match rule for validation */
  match?: ContainerMatchRule;
  /** Negate (passes when item CANNOT be added) */
  negated?: boolean;
}

export interface ContainerTopItemCondition {
  type: 'container_top_item';
  /** Container ID or expression */
  container: string;
  /** Tag pattern the top item must have */
  tag?: string;
  /** Entity ID the top item must be */
  entityId?: string;
  /** Negate the condition */
  negated?: boolean;
}

export interface ContainerIsOccupiedCondition {
  type: 'container_is_occupied';
  /** Container ID or expression */
  container: string;
  /** For grid: row,col. For slots: index. */
  position: GridCell | number;
  /** Negate (passes when cell is empty) */
  negated?: boolean;
}

export type ContainerCondition =
  | ContainerIsEmptyCondition
  | ContainerIsFullCondition
  | ContainerCountCondition
  | ContainerHasItemCondition
  | ContainerCanAcceptCondition
  | ContainerTopItemCondition
  | ContainerIsOccupiedCondition;

// ============================================================================
// Container Reference Types (for entity definitions)
// ============================================================================

export interface EntityContainerMembership {
  /** Container ID this entity belongs to */
  id: string;
  /** Position within container (stack index, grid row/col, slot index) */
  position?: number | GridCell;
}

export type EntityContainerRef = EntityContainerMembership;
