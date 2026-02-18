import type {
	DockviewApi,
	DockviewReadyEvent,
	IDockviewPanelProps,
} from "dockview";
import { DockviewReact, themeAbyss } from "dockview";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import "dockview/dist/styles/dockview.css";
import { ActivityBar } from "./ActivityBar";
import { useEditor } from "./EditorProvider";
import { InspectOverlay } from "./inspector/InspectOverlay";
import { DEFAULT_LAYOUT } from "./panels/defaultLayout";
import { PANEL_REGISTRY } from "./panels/registry";
import { StageArea } from "./StageArea";

const STORAGE_KEY = "slopcade-editor-layout";

const StagePanel = (props: IDockviewPanelProps) => {
	const params = props.params as { contextId?: string } | undefined;
	return <StageArea contextId={params?.contextId} />;
};

const PanelLoadingFallback = () => (
	<View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
		<ActivityIndicator size="large" color="#6366F1" />
	</View>
);

const dockviewComponents: Record<
	string,
	React.FunctionComponent<IDockviewPanelProps>
> = {
	stage: StagePanel,
};
for (const panel of PANEL_REGISTRY) {
	const PanelComponent = panel.component;
	dockviewComponents[panel.id] = () => (
		<Suspense fallback={<PanelLoadingFallback />}>
			<PanelComponent />
		</Suspense>
	);
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
	const { previewContexts } = useEditor();
	const apiRef = useRef<DockviewApi | null>(null);
	const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const [activePanel, setActivePanel] = useState<string | null>("explorer");

	const handleSplitPreview = useCallback(() => {
		const api = apiRef.current;
		if (!api) return;

		const existingStage = api.getPanel("stage");
		if (existingStage) {
			existingStage.api.close();
		}

		for (const ctx of previewContexts) {
			const panel = api.getPanel(`stage-${ctx.id}`);
			if (panel) panel.api.close();
		}

		const firstCtx = previewContexts[0];
		if (!firstCtx) return;

		const firstPanel = api.addPanel({
			id: `stage-${firstCtx.id}`,
			component: "stage",
			params: { contextId: firstCtx.id },
			title: firstCtx.label,
			position: { direction: "left" },
		});

		for (let i = 1; i < previewContexts.length; i++) {
			const ctx = previewContexts[i];
			api.addPanel({
				id: `stage-${ctx.id}`,
				component: "stage",
				params: { contextId: ctx.id },
				title: ctx.label,
				position: { referencePanel: firstPanel, direction: "right" },
			});
		}
	}, [previewContexts]);

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

			api.onDidActivePanelChange((e) => {
				if (e?.id && e.id !== "stage") {
					setActivePanel(e.id);
				}
			});
		},
		[saveLayout],
	);

	const handlePanelToggle = useCallback(
		(panelId: string) => {
			const api = apiRef.current;
			if (!api) return;

			const panel = api.getPanel(panelId);
			if (panel) {
				if (activePanel === panelId && panel.api.isVisible) {
					panel.api.close();
					setActivePanel(null);
				} else {
					panel.api.setActive();
					setActivePanel(panelId);
				}
			} else {
				const def = PANEL_REGISTRY.find((p) => p.id === panelId);
				if (!def) return;
				api.addPanel({
					id: panelId,
					component: panelId,
					title: def.title,
				});
				setActivePanel(panelId);
			}
		},
		[activePanel],
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
		<div style={outerStyle}>
			<ActivityBar
				activePanel={activePanel}
				onPanelToggle={handlePanelToggle}
			/>
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
				<button
					type="button"
					onClick={handleSplitPreview}
					style={splitButtonStyle}
				>
					Split Preview
				</button>
				<button type="button" onClick={handleReset} style={resetButtonStyle}>
					Reset Layout
				</button>
			</div>
		</div>
	);
}

const outerStyle: React.CSSProperties = {
	display: "flex",
	flexDirection: "row",
	flex: 1,
	height: "100%",
	width: "100%",
};

const containerStyle: React.CSSProperties = {
	position: "relative",
	flex: 1,
	height: "100%",
};

const overlayStyle: React.CSSProperties = {
	position: "absolute",
	top: 0,
	left: 0,
	right: 0,
	bottom: 0,
	pointerEvents: "none",
};

const splitButtonStyle: React.CSSProperties = {
	position: "absolute",
	top: 4,
	right: 90,
	zIndex: 1000,
	padding: "2px 8px",
	fontSize: 11,
	color: "var(--ed-text-secondary)",
	backgroundColor: "var(--ed-surface-hover)",
	border: "1px solid var(--ed-border)",
	borderRadius: 4,
	cursor: "pointer",
	opacity: 0.7,
};

const resetButtonStyle: React.CSSProperties = {
	position: "absolute",
	top: 4,
	right: 8,
	zIndex: 1000,
	padding: "2px 8px",
	fontSize: 11,
	color: "var(--ed-text-secondary)",
	backgroundColor: "var(--ed-surface-hover)",
	border: "1px solid var(--ed-border)",
	borderRadius: 4,
	cursor: "pointer",
	opacity: 0.7,
};

const THEME_OVERRIDES = `
.dockview-theme-abyss {
  --dv-color-abyss-dark: var(--ed-bg);
  --dv-color-abyss: var(--ed-surface);
  --dv-color-abyss-light: var(--ed-surface);
  --dv-color-abyss-lighter: var(--ed-border);
  --dv-color-abyss-accent: var(--ed-accent);
  --dv-group-view-background-color: var(--ed-surface);
  --dv-tabs-and-actions-container-background-color: var(--ed-bg);
  --dv-activegroup-visiblepanel-tab-background-color: var(--ed-surface);
  --dv-activegroup-hiddenpanel-tab-background-color: var(--ed-bg);
  --dv-inactivegroup-visiblepanel-tab-background-color: var(--ed-surface);
  --dv-inactivegroup-hiddenpanel-tab-background-color: var(--ed-bg);
  --dv-tab-divider-color: var(--ed-border);
  --dv-separator-border: var(--ed-border);
  --dv-activegroup-visiblepanel-tab-color: var(--ed-tab-active-text);
  --dv-activegroup-hiddenpanel-tab-color: var(--ed-tab-text);
  --dv-inactivegroup-visiblepanel-tab-color: var(--ed-tab-text);
  --dv-inactivegroup-hiddenpanel-tab-color: var(--ed-text-muted);
}
`;
