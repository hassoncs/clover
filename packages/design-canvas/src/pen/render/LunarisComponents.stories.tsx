import type { PenDocument, PenFrame, PenNode } from "@slopcade/protocol/pen";
import type { Meta, StoryObj } from "@storybook/react";
import { LUNARIS_DESIGN_SYSTEM } from "./fixtures/lunaris-design-system";
import { PenCanvasFixture } from "./PenCanvasFixture";

// ---------------------------------------------------------------------------
// Helper: extract a single reusable component from the design system document,
// placing it at the origin so it renders in isolation.
// ---------------------------------------------------------------------------
function extractComponent(doc: PenDocument, childIndex: number): PenDocument {
	const root = doc.children[0] as PenFrame;
	const component = (root.children ?? [])[childIndex];
	if (!component) throw new Error(`No child at index ${childIndex}`);

	// Reset position to origin
	const isolated: PenNode = { ...component, x: 0, y: 0 } as PenNode;

	return {
		...doc,
		children: [isolated],
	};
}

// Compute canvas size from a component's natural dimensions.
// Adds padding around the component for visual breathing room.
const PADDING = 32;
function canvasSize(childIndex: number): { width: number; height: number } {
	const root = LUNARIS_DESIGN_SYSTEM.children[0];
	const comp = ((root as PenFrame).children ?? [])[childIndex] as Record<string, unknown>;
	// Parse width/height — use sane defaults for fit_content / fill_container
	const parseSize = (v: unknown, fallback: number): number => {
		if (typeof v === "number") return v;
		if (typeof v === "string") {
			const match = v.match(/\((\d+(?:\.\d+)?)\)/);
			if (match) return parseFloat(match[1]);
			if (v === "fill_container") return fallback;
			if (v === "fit_content") return fallback;
		}
		return fallback;
	};
	const w = parseSize(comp.width, 400);
	const h = parseSize(comp.height, 300);
	return { width: w + PADDING * 2, height: h + PADDING * 2 };
}

function componentStory(childIndex: number): StoryObj<typeof PenCanvasFixture> {
	const { width, height } = canvasSize(childIndex);
	return {
		args: {
			document: extractComponent(LUNARIS_DESIGN_SYSTEM, childIndex),
			width,
			height,
			camera: { translateX: PADDING, translateY: PADDING, scale: 1 },
		},
	};
}

// ---------------------------------------------------------------------------
// Meta — all per-component stories live under "Pencil/Lunaris"
// ---------------------------------------------------------------------------
const meta: Meta<typeof PenCanvasFixture> = {
	title: "Pencil/Lunaris",
	component: PenCanvasFixture,
	tags: ["!autodocs"],
	parameters: {
		layout: "centered",
		docs: { disable: true },
		previewTabs: { "storybook/docs/panel": { hidden: true } },
	},
};
export default meta;

// ---------------------------------------------------------------------------
// Individual component stories, grouped by category.
// Index numbers reference children[] position in the root design system frame.
// ---------------------------------------------------------------------------

// --- Tooltip ---
export const Tooltip: StoryObj<typeof PenCanvasFixture> = {
	name: "Tooltip",
	...componentStory(0),
};

// --- Switch ---
export const SwitchChecked: StoryObj<typeof PenCanvasFixture> = {
	name: "Switch / Checked",
	...componentStory(1),
};
export const SwitchDefault: StoryObj<typeof PenCanvasFixture> = {
	name: "Switch / Default",
	...componentStory(79),
};

// --- Progress ---
export const Progress: StoryObj<typeof PenCanvasFixture> = {
	name: "Progress",
	...componentStory(2),
};

// --- Pagination ---
export const Pagination: StoryObj<typeof PenCanvasFixture> = {
	name: "Pagination",
	...componentStory(3),
};

// --- Textarea Group ---
export const TextareaGroup: StoryObj<typeof PenCanvasFixture> = {
	name: "Textarea Group",
	...componentStory(4),
};

// --- Input OTP Group ---
export const InputOTPGroupDefault: StoryObj<typeof PenCanvasFixture> = {
	name: "Input OTP Group / Default",
	...componentStory(5),
};
export const InputOTPGroupFilled: StoryObj<typeof PenCanvasFixture> = {
	name: "Input OTP Group / Filled",
	...componentStory(59),
};

// --- Select Group ---
export const SelectGroupDefault: StoryObj<typeof PenCanvasFixture> = {
	name: "Select Group / Default",
	...componentStory(6),
};
export const SelectGroupFilled: StoryObj<typeof PenCanvasFixture> = {
	name: "Select Group / Filled",
	...componentStory(58),
};

// --- Input Group ---
export const InputGroupDefault: StoryObj<typeof PenCanvasFixture> = {
	name: "Input Group / Default",
	...componentStory(7),
};
export const InputGroupFilled: StoryObj<typeof PenCanvasFixture> = {
	name: "Input Group / Filled",
	...componentStory(55),
};

// --- Icon Label ---
export const IconLabelSecondary: StoryObj<typeof PenCanvasFixture> = {
	name: "Icon Label / Secondary",
	...componentStory(8),
};
export const IconLabelSuccess: StoryObj<typeof PenCanvasFixture> = {
	name: "Icon Label / Success",
	...componentStory(9),
};
export const IconLabelViolet: StoryObj<typeof PenCanvasFixture> = {
	name: "Icon Label / Violet",
	...componentStory(10),
};
export const IconLabelOrange: StoryObj<typeof PenCanvasFixture> = {
	name: "Icon Label / Orange",
	...componentStory(11),
};

// --- Avatar ---
export const AvatarText: StoryObj<typeof PenCanvasFixture> = {
	name: "Avatar / Text",
	...componentStory(12),
};
export const AvatarImage: StoryObj<typeof PenCanvasFixture> = {
	name: "Avatar / Image",
	...componentStory(31),
};

// --- Button ---
export const ButtonDefault: StoryObj<typeof PenCanvasFixture> = {
	name: "Button / Default",
	...componentStory(17),
};
export const ButtonSecondary: StoryObj<typeof PenCanvasFixture> = {
	name: "Button / Secondary",
	...componentStory(18),
};
export const ButtonDestructive: StoryObj<typeof PenCanvasFixture> = {
	name: "Button / Destructive",
	...componentStory(19),
};
export const ButtonOutline: StoryObj<typeof PenCanvasFixture> = {
	name: "Button / Outline",
	...componentStory(15),
};
export const ButtonGhost: StoryObj<typeof PenCanvasFixture> = {
	name: "Button / Ghost",
	...componentStory(13),
};
export const ButtonLargeDefault: StoryObj<typeof PenCanvasFixture> = {
	name: "Button / Large Default",
	...componentStory(22),
};
export const ButtonLargeSecondary: StoryObj<typeof PenCanvasFixture> = {
	name: "Button / Large Secondary",
	...componentStory(21),
};
export const ButtonLargeDestructive: StoryObj<typeof PenCanvasFixture> = {
	name: "Button / Large Destructive",
	...componentStory(20),
};
export const ButtonLargeOutline: StoryObj<typeof PenCanvasFixture> = {
	name: "Button / Large Outline",
	...componentStory(16),
};
export const ButtonLargeGhost: StoryObj<typeof PenCanvasFixture> = {
	name: "Button / Large Ghost",
	...componentStory(14),
};

// --- Alert ---
export const AlertInfo: StoryObj<typeof PenCanvasFixture> = {
	name: "Alert / Info",
	...componentStory(26),
};
export const AlertSuccess: StoryObj<typeof PenCanvasFixture> = {
	name: "Alert / Success",
	...componentStory(24),
};
export const AlertWarning: StoryObj<typeof PenCanvasFixture> = {
	name: "Alert / Warning",
	...componentStory(25),
};
export const AlertError: StoryObj<typeof PenCanvasFixture> = {
	name: "Alert / Error",
	...componentStory(23),
};

// --- Accordion ---
export const AccordionOpen: StoryObj<typeof PenCanvasFixture> = {
	name: "Accordion / Open",
	...componentStory(28),
};
export const AccordionClosed: StoryObj<typeof PenCanvasFixture> = {
	name: "Accordion / Closed",
	...componentStory(27),
};

// --- Icon Button ---
export const IconButtonDefault: StoryObj<typeof PenCanvasFixture> = {
	name: "Icon Button / Default",
	...componentStory(30),
};
export const IconButtonSecondary: StoryObj<typeof PenCanvasFixture> = {
	name: "Icon Button / Secondary",
	...componentStory(33),
};
export const IconButtonDestructive: StoryObj<typeof PenCanvasFixture> = {
	name: "Icon Button / Destructive",
	...componentStory(35),
};
export const IconButtonOutline: StoryObj<typeof PenCanvasFixture> = {
	name: "Icon Button / Outline",
	...componentStory(37),
};
export const IconButtonGhost: StoryObj<typeof PenCanvasFixture> = {
	name: "Icon Button / Ghost (unnamed)",
	...componentStory(39),
};
export const IconButtonLargeDefault: StoryObj<typeof PenCanvasFixture> = {
	name: "Icon Button / Large Default",
	...componentStory(29),
};
export const IconButtonLargeSecondary: StoryObj<typeof PenCanvasFixture> = {
	name: "Icon Button / Large Secondary",
	...componentStory(32),
};
export const IconButtonLargeDestructive: StoryObj<typeof PenCanvasFixture> = {
	name: "Icon Button / Large Destructive",
	...componentStory(34),
};
export const IconButtonLargeOutline: StoryObj<typeof PenCanvasFixture> = {
	name: "Icon Button / Large Outline",
	...componentStory(36),
};
export const IconButtonLargeGhost: StoryObj<typeof PenCanvasFixture> = {
	name: "Icon Button / Large Ghost",
	...componentStory(38),
};

// --- Label ---
export const LabelSuccess: StoryObj<typeof PenCanvasFixture> = {
	name: "Label / Success",
	...componentStory(40),
};
export const LabelOrange: StoryObj<typeof PenCanvasFixture> = {
	name: "Label / Orange",
	...componentStory(41),
};
export const LabelViolet: StoryObj<typeof PenCanvasFixture> = {
	name: "Label / Violet",
	...componentStory(42),
};
export const LabelSecondary: StoryObj<typeof PenCanvasFixture> = {
	name: "Label / Secondary",
	...componentStory(43),
};

// --- Breadcrumb ---
export const BreadcrumbDefault: StoryObj<typeof PenCanvasFixture> = {
	name: "Breadcrumb Item / Default",
	...componentStory(47),
};
export const BreadcrumbActive: StoryObj<typeof PenCanvasFixture> = {
	name: "Breadcrumb Item / Active",
	...componentStory(46),
};
export const BreadcrumbSeparator: StoryObj<typeof PenCanvasFixture> = {
	name: "Breadcrumb Item / Separator",
	...componentStory(45),
};
export const BreadcrumbEllipsis: StoryObj<typeof PenCanvasFixture> = {
	name: "Breadcrumb Item / Ellipsis",
	...componentStory(44),
};

// --- Card ---
export const Card: StoryObj<typeof PenCanvasFixture> = {
	name: "Card",
	...componentStory(48),
};
export const CardImage: StoryObj<typeof PenCanvasFixture> = {
	name: "Card Image",
	...componentStory(91),
};
export const CardAction: StoryObj<typeof PenCanvasFixture> = {
	name: "Card Action",
	...componentStory(92),
};
export const CardPlain: StoryObj<typeof PenCanvasFixture> = {
	name: "Card Plain",
	...componentStory(93),
};

// --- Checkbox ---
export const CheckboxChecked: StoryObj<typeof PenCanvasFixture> = {
	name: "Checkbox / Checked",
	...componentStory(49),
};
export const CheckboxDefault: StoryObj<typeof PenCanvasFixture> = {
	name: "Checkbox / Default",
	...componentStory(50),
};
export const CheckboxDescChecked: StoryObj<typeof PenCanvasFixture> = {
	name: "Checkbox Description / Checked",
	...componentStory(51),
};
export const CheckboxDescDefault: StoryObj<typeof PenCanvasFixture> = {
	name: "Checkbox Description / Default",
	...componentStory(52),
};
export const CheckboxChecked2: StoryObj<typeof PenCanvasFixture> = {
	name: "Checkbox / Checked (variant)",
	...componentStory(53),
};
export const CheckboxDefault2: StoryObj<typeof PenCanvasFixture> = {
	name: "Checkbox / Default (variant)",
	...componentStory(54),
};

// --- Input ---
export const InputDefault: StoryObj<typeof PenCanvasFixture> = {
	name: "Input / Default",
	...componentStory(56),
};
export const InputFilled: StoryObj<typeof PenCanvasFixture> = {
	name: "Input / Filled",
	...componentStory(57),
};

// --- Search Box ---
export const SearchBoxDefault: StoryObj<typeof PenCanvasFixture> = {
	name: "Search Box / Default",
	...componentStory(61),
};
export const SearchBoxFilled: StoryObj<typeof PenCanvasFixture> = {
	name: "Search Box / Filled",
	...componentStory(60),
};

// --- List Item ---
export const ListItemChecked: StoryObj<typeof PenCanvasFixture> = {
	name: "List Item / Checked",
	...componentStory(62),
};
export const ListItemUnchecked: StoryObj<typeof PenCanvasFixture> = {
	name: "List Item / Unchecked",
	...componentStory(63),
};
export const ListItemTitle: StoryObj<typeof PenCanvasFixture> = {
	name: "List Item Title",
	...componentStory(64),
};
export const ListDivider: StoryObj<typeof PenCanvasFixture> = {
	name: "List Divider",
	...componentStory(65),
};

// --- Dropdown ---
export const Dropdown: StoryObj<typeof PenCanvasFixture> = {
	name: "Dropdown",
	...componentStory(66),
};

// --- Textarea ---
export const TextareaDefault: StoryObj<typeof PenCanvasFixture> = {
	name: "Textarea / Default",
	...componentStory(67),
};
export const TextareaFilled: StoryObj<typeof PenCanvasFixture> = {
	name: "Textarea / Filled",
	...componentStory(68),
};

// --- Tab ---
export const TabItemActive: StoryObj<typeof PenCanvasFixture> = {
	name: "Tab Item / Active",
	...componentStory(69),
};
export const TabItemInactive: StoryObj<typeof PenCanvasFixture> = {
	name: "Tab Item / Inactive",
	...componentStory(70),
};
export const Tabs: StoryObj<typeof PenCanvasFixture> = {
	name: "Tabs",
	...componentStory(71),
};

// --- Radio ---
export const RadioSelected: StoryObj<typeof PenCanvasFixture> = {
	name: "Radio / Selected",
	...componentStory(74),
};
export const RadioDefault: StoryObj<typeof PenCanvasFixture> = {
	name: "Radio / Default",
	...componentStory(75),
};
export const RadioDescDefault: StoryObj<typeof PenCanvasFixture> = {
	name: "Radio Description / Default",
	...componentStory(73),
};
export const RadioDescSelected: StoryObj<typeof PenCanvasFixture> = {
	name: "Radio Description / Selected",
	...componentStory(76),
};
export const RadioDefault2: StoryObj<typeof PenCanvasFixture> = {
	name: "Radio / Default (variant)",
	...componentStory(77),
};
export const RadioSelected2: StoryObj<typeof PenCanvasFixture> = {
	name: "Radio / Selected (variant)",
	...componentStory(78),
};

// --- Sidebar ---
export const Sidebar: StoryObj<typeof PenCanvasFixture> = {
	name: "Sidebar",
	...componentStory(80),
};
export const SidebarSectionTitle: StoryObj<typeof PenCanvasFixture> = {
	name: "Sidebar Section Title",
	...componentStory(81),
};
export const SidebarItemActive: StoryObj<typeof PenCanvasFixture> = {
	name: "Sidebar Item / Active",
	...componentStory(82),
};
export const SidebarItemDefault: StoryObj<typeof PenCanvasFixture> = {
	name: "Sidebar Item / Default",
	...componentStory(83),
};

// --- Pagination Item ---
export const PaginationItemActive: StoryObj<typeof PenCanvasFixture> = {
	name: "Pagination Item / Active",
	...componentStory(84),
};
export const PaginationItemDefault: StoryObj<typeof PenCanvasFixture> = {
	name: "Pagination Item / Default",
	...componentStory(85),
};
export const PaginationItemEllipsis: StoryObj<typeof PenCanvasFixture> = {
	name: "Pagination Item / Ellipsis",
	...componentStory(86),
};

// --- Dialog ---
export const Dialog: StoryObj<typeof PenCanvasFixture> = {
	name: "Dialog",
	...componentStory(87),
};

// --- Modal ---
export const ModalLeft: StoryObj<typeof PenCanvasFixture> = {
	name: "Modal / Left",
	...componentStory(88),
};
export const ModalCenter: StoryObj<typeof PenCanvasFixture> = {
	name: "Modal / Center",
	...componentStory(89),
};
export const ModalCenterIcon: StoryObj<typeof PenCanvasFixture> = {
	name: "Modal / Center Icon",
	...componentStory(90),
};

// --- Data Table ---
export const DataTableFooter: StoryObj<typeof PenCanvasFixture> = {
	name: "Data Table Footer",
	...componentStory(94),
};
export const DataTable: StoryObj<typeof PenCanvasFixture> = {
	name: "Data Table",
	...componentStory(95),
};
export const Table: StoryObj<typeof PenCanvasFixture> = {
	name: "Table",
	...componentStory(96),
};
export const TableRow: StoryObj<typeof PenCanvasFixture> = {
	name: "Table Row",
	...componentStory(97),
};
export const TableCell: StoryObj<typeof PenCanvasFixture> = {
	name: "Table Cell",
	...componentStory(98),
};
export const DataTableHeader: StoryObj<typeof PenCanvasFixture> = {
	name: "Data Table Header",
	...componentStory(99),
};
export const TableColumnHeader: StoryObj<typeof PenCanvasFixture> = {
	name: "Table Column Header",
	...componentStory(100),
};

// --- Phone Frame ---
export const PhoneFrame: StoryObj<typeof PenCanvasFixture> = {
	name: "Phone Frame",
	...componentStory(102),
};
export const PhoneFrameTabbed: StoryObj<typeof PenCanvasFixture> = {
	name: "Phone Frame / Tabbed",
	...componentStory(103),
};
