export type ParityStatus = "implemented" | "planned" | "not-applicable";

export interface ParityEntry {
	name: string;
	category: string;
	status: ParityStatus;
	openPencilEquivalent?: string;
}

export const PARITY_MATRIX: ParityEntry[] = [
	// ─── T6 Priority Tools (pencil-v2.ts) ─────────────────────────
	{
		name: "pencil_get_node",
		category: "read",
		status: "implemented",
		openPencilEquivalent: "get_node",
	},
	{
		name: "pencil_get_children",
		category: "read",
		status: "implemented",
		openPencilEquivalent: "node_children",
	},
	{
		name: "pencil_find_nodes",
		category: "read",
		status: "implemented",
		openPencilEquivalent: "find_nodes",
	},
	{
		name: "pencil_create_node",
		category: "create",
		status: "implemented",
		openPencilEquivalent: "create_shape",
	},
	{
		name: "pencil_update_node",
		category: "modify",
		status: "implemented",
		openPencilEquivalent: "update_node",
	},
	{
		name: "pencil_delete_node",
		category: "structure",
		status: "implemented",
		openPencilEquivalent: "delete_node",
	},
	{
		name: "pencil_reparent_node",
		category: "structure",
		status: "implemented",
		openPencilEquivalent: "reparent_node",
	},
	{
		name: "pencil_set_fill",
		category: "styling",
		status: "implemented",
		openPencilEquivalent: "set_fill",
	},
	{
		name: "pencil_set_stroke",
		category: "styling",
		status: "implemented",
		openPencilEquivalent: "set_stroke",
	},
	{
		name: "pencil_set_layout",
		category: "layout",
		status: "implemented",
		openPencilEquivalent: "set_layout",
	},

	// ─── T10 Components (pencil-v2-components.ts) ─────────────────
	{
		name: "pencil_create_component",
		category: "component",
		status: "implemented",
		openPencilEquivalent: "create_component",
	},
	{
		name: "pencil_create_instance",
		category: "component",
		status: "implemented",
		openPencilEquivalent: "create_instance",
	},
	{
		name: "pencil_detach_instance",
		category: "component",
		status: "implemented",
	},
	{
		name: "pencil_set_instance_override",
		category: "component",
		status: "implemented",
	},
	{
		name: "pencil_reset_instance_override",
		category: "component",
		status: "implemented",
	},

	// ─── T10 Variables (pencil-v2-variables.ts) ───────────────────
	{
		name: "pencil_create_variable",
		category: "variable",
		status: "implemented",
		openPencilEquivalent: "create_variable",
	},
	{
		name: "pencil_update_variable",
		category: "variable",
		status: "implemented",
		openPencilEquivalent: "set_variable",
	},
	{
		name: "pencil_delete_variable",
		category: "variable",
		status: "implemented",
		openPencilEquivalent: "delete_variable",
	},
	{
		name: "pencil_bind_variable",
		category: "variable",
		status: "implemented",
		openPencilEquivalent: "bind_variable",
	},
	{
		name: "pencil_get_variables",
		category: "variable",
		status: "implemented",
		openPencilEquivalent: "list_variables",
	},

	// ─── T10 Effects/Styling (pencil-v2-effects.ts) ───────────────
	{
		name: "pencil_set_effects",
		category: "effects",
		status: "implemented",
		openPencilEquivalent: "set_effects",
	},
	{
		name: "pencil_set_corner_radius",
		category: "effects",
		status: "implemented",
		openPencilEquivalent: "set_radius",
	},
	{
		name: "pencil_set_opacity",
		category: "effects",
		status: "implemented",
		openPencilEquivalent: "set_opacity",
	},
	{
		name: "pencil_set_blend_mode",
		category: "effects",
		status: "implemented",
		openPencilEquivalent: "set_blend",
	},
	{
		name: "pencil_set_text_style",
		category: "effects",
		status: "implemented",
		openPencilEquivalent: "set_font",
	},

	// ─── T10 Query/Export (pencil-v2-query.ts) ────────────────────
	{
		name: "pencil_get_document",
		category: "query",
		status: "implemented",
		openPencilEquivalent: "get_page_tree",
	},
	{
		name: "pencil_get_ancestors",
		category: "query",
		status: "implemented",
		openPencilEquivalent: "node_ancestors",
	},
	{
		name: "pencil_get_descendants",
		category: "query",
		status: "implemented",
		openPencilEquivalent: "node_tree",
	},
	{
		name: "pencil_search_nodes",
		category: "query",
		status: "implemented",
		openPencilEquivalent: "find_nodes",
	},
	{
		name: "pencil_get_selection",
		category: "query",
		status: "implemented",
		openPencilEquivalent: "get_selection",
	},

	// ─── OpenPencil tools with no direct equivalent (planned/n/a) ─
	{
		name: "pencil_render_jsx",
		category: "create",
		status: "planned",
		openPencilEquivalent: "render",
	},
	{
		name: "pencil_clone_node",
		category: "structure",
		status: "planned",
		openPencilEquivalent: "clone_node",
	},
	{
		name: "pencil_group_nodes",
		category: "structure",
		status: "planned",
		openPencilEquivalent: "group_nodes",
	},
	{
		name: "pencil_ungroup_node",
		category: "structure",
		status: "planned",
		openPencilEquivalent: "ungroup_node",
	},
	{
		name: "pencil_set_constraints",
		category: "layout",
		status: "planned",
		openPencilEquivalent: "set_constraints",
	},
	{
		name: "pencil_set_rotation",
		category: "modify",
		status: "planned",
		openPencilEquivalent: "set_rotation",
	},
	{
		name: "pencil_set_visible",
		category: "modify",
		status: "planned",
		openPencilEquivalent: "set_visible",
	},
	{
		name: "pencil_set_locked",
		category: "modify",
		status: "planned",
		openPencilEquivalent: "set_locked",
	},
	{
		name: "pencil_node_move",
		category: "modify",
		status: "planned",
		openPencilEquivalent: "node_move",
	},
	{
		name: "pencil_node_resize",
		category: "modify",
		status: "planned",
		openPencilEquivalent: "node_resize",
	},
	{
		name: "pencil_node_bounds",
		category: "query",
		status: "planned",
		openPencilEquivalent: "node_bounds",
	},
	{
		name: "pencil_select_nodes",
		category: "interaction",
		status: "planned",
		openPencilEquivalent: "select_nodes",
	},
	{
		name: "pencil_list_pages",
		category: "page",
		status: "planned",
		openPencilEquivalent: "list_pages",
	},
	{
		name: "pencil_switch_page",
		category: "page",
		status: "planned",
		openPencilEquivalent: "switch_page",
	},
	{
		name: "pencil_create_page",
		category: "page",
		status: "planned",
		openPencilEquivalent: "create_page",
	},
	{
		name: "pencil_eval",
		category: "escape-hatch",
		status: "not-applicable",
		openPencilEquivalent: "eval",
	},
	{
		name: "pencil_boolean_union",
		category: "boolean",
		status: "planned",
		openPencilEquivalent: "boolean_union",
	},
	{
		name: "pencil_boolean_subtract",
		category: "boolean",
		status: "planned",
		openPencilEquivalent: "boolean_subtract",
	},
	{
		name: "pencil_boolean_intersect",
		category: "boolean",
		status: "planned",
		openPencilEquivalent: "boolean_intersect",
	},
	{
		name: "pencil_boolean_exclude",
		category: "boolean",
		status: "planned",
		openPencilEquivalent: "boolean_exclude",
	},
	{
		name: "pencil_path_get",
		category: "vector",
		status: "planned",
		openPencilEquivalent: "path_get",
	},
	{
		name: "pencil_path_set",
		category: "vector",
		status: "planned",
		openPencilEquivalent: "path_set",
	},
	{
		name: "pencil_flatten_nodes",
		category: "structure",
		status: "planned",
		openPencilEquivalent: "flatten_nodes",
	},
	{
		name: "pencil_create_collection",
		category: "variable",
		status: "planned",
		openPencilEquivalent: "create_collection",
	},
	{
		name: "pencil_delete_collection",
		category: "variable",
		status: "planned",
		openPencilEquivalent: "delete_collection",
	},
	{
		name: "pencil_set_text",
		category: "modify",
		status: "planned",
		openPencilEquivalent: "set_text",
	},
	{
		name: "pencil_rename_node",
		category: "structure",
		status: "planned",
		openPencilEquivalent: "rename_node",
	},
	{
		name: "pencil_set_minmax",
		category: "layout",
		status: "planned",
		openPencilEquivalent: "set_minmax",
	},
	{
		name: "pencil_set_stroke_align",
		category: "styling",
		status: "planned",
		openPencilEquivalent: "set_stroke_align",
	},
	{
		name: "pencil_set_text_resize",
		category: "modify",
		status: "planned",
		openPencilEquivalent: "set_text_resize",
	},
	{
		name: "pencil_set_font_range",
		category: "modify",
		status: "planned",
		openPencilEquivalent: "set_font_range",
	},
	{
		name: "pencil_node_bindings",
		category: "query",
		status: "planned",
		openPencilEquivalent: "node_bindings",
	},
];

export function getParitySummary(): {
	total: number;
	implemented: number;
	planned: number;
	notApplicable: number;
} {
	const implemented = PARITY_MATRIX.filter(
		(e) => e.status === "implemented",
	).length;
	const planned = PARITY_MATRIX.filter((e) => e.status === "planned").length;
	const notApplicable = PARITY_MATRIX.filter(
		(e) => e.status === "not-applicable",
	).length;

	return {
		total: PARITY_MATRIX.length,
		implemented,
		planned,
		notApplicable,
	};
}
