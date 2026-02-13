import React, { type LazyExoticComponent } from "react";

export interface PanelDefinition {
	id: string;
	title: string;
	icon?: string;
	component: LazyExoticComponent<React.ComponentType<any>>;
	defaultPlacement: "left" | "center" | "right" | "bottom";
	minWidth?: number;
}

const ExplorerPanel = React.lazy(() =>
	import("./ExplorerPanel").then((m) => ({ default: m.ExplorerPanel })),
);
const HierarchyPanel = React.lazy(() =>
	import("./HierarchyPanel").then((m) => ({ default: m.HierarchyPanel })),
);
const PropertiesPanel = React.lazy(() =>
	import("./PropertiesPanel").then((m) => ({ default: m.PropertiesPanel })),
);
const DebugPanel = React.lazy(() =>
	import("./DebugPanel").then((m) => ({ default: m.DebugPanel })),
);
const LiveStatePanel = React.lazy(() =>
	import("./LiveStatePanel").then((m) => ({ default: m.LiveStatePanel })),
);
const AssetsPanel = React.lazy(() =>
	import("./AssetsPanel").then((m) => ({ default: m.AssetsPanel })),
);
const LayersPanel = React.lazy(() =>
	import("./LayersPanel").then((m) => ({ default: m.LayersPanel })),
);
const DiagnosticsPanel = React.lazy(() =>
	import("../DiagnosticsPanel").then((m) => ({ default: m.DiagnosticsPanel })),
);
const AssetGalleryPanel = React.lazy(() =>
	import("../AssetGallery/AssetGalleryPanel").then((m) => ({
		default: m.AssetGalleryPanel,
	})),
);
const ChatSidebar = React.lazy(() =>
	import("../ChatSidebar").then((m) => ({ default: m.ChatSidebar })),
);

export const PANEL_REGISTRY: PanelDefinition[] = [
	{
		id: "explorer",
		title: "Explorer",
		component: ExplorerPanel,
		defaultPlacement: "left",
	},
	{
		id: "hierarchy",
		title: "Hierarchy",
		component: HierarchyPanel,
		defaultPlacement: "left",
	},
	{
		id: "properties",
		title: "Properties",
		component: PropertiesPanel,
		defaultPlacement: "left",
	},
	{
		id: "debug",
		title: "Debug",
		component: DebugPanel,
		defaultPlacement: "left",
	},
	{
		id: "live-state",
		title: "Live State",
		component: LiveStatePanel,
		defaultPlacement: "left",
	},
	{
		id: "assets",
		title: "Assets",
		component: AssetsPanel,
		defaultPlacement: "left",
	},
	{
		id: "layers",
		title: "Layers",
		component: LayersPanel,
		defaultPlacement: "left",
	},
	{
		id: "images",
		title: "Images",
		component: AssetGalleryPanel,
		defaultPlacement: "left",
	},
	{
		id: "diagnostics",
		title: "Diagnostics",
		component: DiagnosticsPanel,
		defaultPlacement: "bottom",
	},
	{
		id: "chat",
		title: "Chat",
		component: ChatSidebar,
		defaultPlacement: "right",
	},
];

export function getPanelById(id: string): PanelDefinition | undefined {
	return PANEL_REGISTRY.find((p) => p.id === id);
}

export function getPanelsByPlacement(
	placement: PanelDefinition["defaultPlacement"],
): PanelDefinition[] {
	return PANEL_REGISTRY.filter((p) => p.defaultPlacement === placement);
}
