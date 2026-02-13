import type React from "react";
import { AssetGalleryPanel } from "../AssetGallery/AssetGalleryPanel";
import { ChatSidebar } from "../ChatSidebar";
import { DiagnosticsPanel } from "../DiagnosticsPanel";
import { AssetsPanel } from "./AssetsPanel";
import { DebugPanel } from "./DebugPanel";
import { ExplorerPanel } from "./ExplorerPanel";
import { HierarchyPanel } from "./HierarchyPanel";
import { LayersPanel } from "./LayersPanel";
import { LiveStatePanel } from "./LiveStatePanel";
import { PropertiesPanel } from "./PropertiesPanel";

export interface PanelDefinition {
	id: string;
	title: string;
	icon?: string;
	component: React.ComponentType<any>;
	defaultPlacement: "left" | "center" | "right" | "bottom";
	minWidth?: number;
}

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
