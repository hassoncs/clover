import type {
	DockviewApi,
	DockviewReadyEvent,
	IDockviewPanelProps,
} from "dockview";
import { DockviewReact, themeAbyss } from "dockview";
import { useCallback, useEffect, useRef } from "react";
import "dockview/dist/styles/dockview.css";
import { InspectOverlay } from "./inspector/InspectOverlay";
import { DEFAULT_LAYOUT } from "./panels/defaultLayout";
import { PANEL_REGISTRY } from "./panels/registry";
import { StageArea } from "./StageArea";

const STORAGE_KEY = "slopcade-editor-layout";

const dockviewComponents: Record<
	string,
	React.FunctionComponent<IDockviewPanelProps>
> = {
	stage: () => <StageArea />,
};
for (const panel of PANEL_REGISTRY) {
	const PanelComponent = panel.component;
	dockviewComponents[panel.id] = () => <PanelComponent />;
}

function buildDefaultLayout(api: DockviewApi) {
	const stagePanel = api.addPanel({
		id: "stage",
		component: "stage",
		title: "Preview",
	});

	for (const panelId of DEFAULT_LAYOUT.left.panels) {
		const def = PANEL_REGISTRY.find((p) => p.id === panelId);
		if (!def) continue;

		const isFirst = panelId === DEFAULT_LAYOUT.left.panels[0];
		api.addPanel({
			id: panelId,
			component: panelId,
			title: def.title,
			position: isFirst
				? { referencePanel: stagePanel, direction: "left" }
				: {
						referencePanel: DEFAULT_LAYOUT.left.panels[0],
						direction: "within",
					},
			inactive: true,
			initialWidth: isFirst ? DEFAULT_LAYOUT.left.width : undefined,
		});
	}

	for (const panelId of DEFAULT_LAYOUT.right.panels) {
		const def = PANEL_REGISTRY.find((p) => p.id === panelId);
		if (!def) continue;

		const isFirst = panelId === DEFAULT_LAYOUT.right.panels[0];
		api.addPanel({
			id: panelId,
			component: panelId,
			title: def.title,
			position: isFirst
				? { referencePanel: stagePanel, direction: "right" }
				: {
						referencePanel: DEFAULT_LAYOUT.right.panels[0],
						direction: "within",
					},
			inactive: true,
			initialWidth: isFirst ? DEFAULT_LAYOUT.right.width : undefined,
		});
	}
}

export function DockviewLayout() {
	const apiRef = useRef<DockviewApi | null>(null);
	const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const saveLayout = useCallback(() => {
		if (saveTimeoutRef.current) {
			clearTimeout(saveTimeoutRef.current);
		}
		saveTimeoutRef.current = setTimeout(() => {
			const api = apiRef.current;
			if (api) {
				try {
					const serialized = api.toJSON();
					localStorage.setItem(STORAGE_KEY, JSON.stringify(serialized));
				} catch {
					/* empty */
				}
			}
		}, 500);
	}, []);

	const handleReady = useCallback(
		(event: DockviewReadyEvent) => {
			const { api } = event;
			apiRef.current = api;

			const saved = localStorage.getItem(STORAGE_KEY);
			if (saved) {
				try {
					api.fromJSON(JSON.parse(saved));
				} catch {
					api.clear();
					buildDefaultLayout(api);
				}
			} else {
				buildDefaultLayout(api);
			}

			api.onDidLayoutChange(() => {
				saveLayout();
			});
		},
		[saveLayout],
	);

	const handleReset = useCallback(() => {
		localStorage.removeItem(STORAGE_KEY);
		const api = apiRef.current;
		if (api) {
			api.clear();
			buildDefaultLayout(api);
		}
	}, []);

	useEffect(() => {
		const style = document.createElement("style");
		style.textContent = THEME_OVERRIDES;
		document.head.appendChild(style);
		return () => {
			document.head.removeChild(style);
		};
	}, []);

	useEffect(() => {
		return () => {
			if (saveTimeoutRef.current) {
				clearTimeout(saveTimeoutRef.current);
			}
		};
	}, []);

	return (
		<div style={containerStyle}>
			<DockviewReact
				components={dockviewComponents}
				onReady={handleReady}
				theme={themeAbyss}
				disableFloatingGroups
			/>
			<div style={overlayStyle}>
				<InspectOverlay />
			</div>
			<button type="button" onClick={handleReset} style={resetButtonStyle}>
				Reset Layout
			</button>
		</div>
	);
}

const containerStyle: React.CSSProperties = {
	position: "relative",
	flex: 1,
	height: "100%",
	width: "100%",
};

const overlayStyle: React.CSSProperties = {
	position: "absolute",
	top: 0,
	left: 0,
	right: 0,
	bottom: 0,
	pointerEvents: "none",
};

const resetButtonStyle: React.CSSProperties = {
	position: "absolute",
	top: 4,
	right: 8,
	zIndex: 1000,
	padding: "2px 8px",
	fontSize: 11,
	color: "#9CA3AF",
	backgroundColor: "#1F2937",
	border: "1px solid #374151",
	borderRadius: 4,
	cursor: "pointer",
	opacity: 0.7,
};

const THEME_OVERRIDES = `
.dockview-theme-abyss {
  --dv-color-abyss-dark: #111827;
  --dv-color-abyss: #1F2937;
  --dv-color-abyss-light: #1F2937;
  --dv-color-abyss-lighter: #374151;
  --dv-color-abyss-accent: #6366F1;
  --dv-group-view-background-color: #1F2937;
  --dv-tabs-and-actions-container-background-color: #111827;
  --dv-activegroup-visiblepanel-tab-background-color: #1F2937;
  --dv-activegroup-hiddenpanel-tab-background-color: #111827;
  --dv-inactivegroup-visiblepanel-tab-background-color: #1F2937;
  --dv-inactivegroup-hiddenpanel-tab-background-color: #111827;
  --dv-tab-divider-color: #374151;
  --dv-separator-border: #374151;
  --dv-activegroup-visiblepanel-tab-color: #FFFFFF;
  --dv-activegroup-hiddenpanel-tab-color: rgba(255, 255, 255, 0.5);
  --dv-inactivegroup-visiblepanel-tab-color: rgba(255, 255, 255, 0.5);
  --dv-inactivegroup-hiddenpanel-tab-color: rgba(255, 255, 255, 0.25);
}
`;
