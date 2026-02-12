#!/usr/bin/env npx tsx
import { readdirSync, readFileSync, statSync } from "fs";
import { dirname, join, relative, resolve } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, "..");
const SCRIPTS_DIR = resolve(ROOT, "godot_project/scripts");

interface LintError {
	file: string;
	line: number;
	identifier: string;
	message: string;
}

const GDSCRIPT_BUILTINS = new Set([
	"self",
	"super",
	"null",
	"true",
	"false",
	"PI",
	"TAU",
	"INF",
	"NAN",
	"_",
]);

const GDSCRIPT_INHERITED_PROPERTIES = new Set([
	"position",
	"global_position",
	"rotation",
	"global_rotation",
	"rotation_degrees",
	"global_rotation_degrees",
	"scale",
	"global_scale",
	"transform",
	"global_transform",
	"visible",
	"modulate",
	"self_modulate",
	"z_index",
	"z_as_relative",
	"y_sort_enabled",
	"top_level",
	"offset",
	"zoom",
	"anchor_mode",
	"drag_horizontal_enabled",
	"drag_vertical_enabled",
	"drag_horizontal_offset",
	"drag_vertical_offset",
	"editor_draw_drag_margin",
	"editor_draw_limits",
	"editor_draw_screen",
	"ignore_rotation",
	"limit_bottom",
	"limit_left",
	"limit_right",
	"limit_top",
	"limit_smoothed",
	"position_smoothing_enabled",
	"position_smoothing_speed",
	"rotation_smoothing_enabled",
	"rotation_smoothing_speed",
	"name",
	"owner",
	"process_mode",
	"process_priority",
	"process_physics_priority",
	"unique_name_in_owner",
	"scene_file_path",
	"editor_description",
	"layer",
	"follow_viewport_enabled",
	"follow_viewport_scale",
	"size",
	"texture",
	"centered",
	"flip_h",
	"flip_v",
	"region_enabled",
	"region_rect",
	"hframes",
	"vframes",
	"frame",
	"frame_coords",
	"texture_filter",
	"texture_repeat",
	"material",
	"use_parent_material",
	"show_behind_parent",
	"light_mask",
	"clip_children",
	"text",
	"label_settings",
	"horizontal_alignment",
	"vertical_alignment",
	"autowrap_mode",
	"custom_minimum_size",
	"size_flags_horizontal",
	"size_flags_vertical",
	"mouse_filter",
	"focus_mode",
	"theme",
	"layout_direction",
	"localize_numeral_system",
	"tooltip_text",
	"anchors_preset",
	"anchor_bottom",
	"anchor_left",
	"anchor_right",
	"anchor_top",
	"grow_horizontal",
	"grow_vertical",
	"pivot_offset",
	"mass",
	"inertia",
	"center_of_mass_mode",
	"center_of_mass",
	"physics_material_override",
	"gravity_scale",
	"custom_integrator",
	"continuous_cd",
	"max_contacts_reported",
	"contact_monitor",
	"sleeping",
	"can_sleep",
	"lock_rotation",
	"freeze",
	"freeze_mode",
	"linear_velocity",
	"linear_damp",
	"linear_damp_mode",
	"angular_velocity",
	"angular_damp",
	"angular_damp_mode",
	"constant_force",
	"constant_torque",
	"collision_layer",
	"collision_mask",
	"collision_priority",
	"input_pickable",
	"monitoring",
	"monitorable",
	"priority",
	"gravity_space_override",
	"gravity_point",
	"gravity_point_center",
	"gravity_direction",
	"gravity",
	"linear_damp_space_override",
	"angular_damp_space_override",
	"audio_bus_override",
	"audio_bus_name",
	"velocity",
	"motion_mode",
	"up_direction",
	"slide_on_ceiling",
	"wall_min_slide_angle",
	"floor_stop_on_slope",
	"floor_constant_speed",
	"floor_block_on_wall",
	"floor_max_angle",
	"floor_snap_length",
	"platform_on_leave",
	"platform_floor_layers",
	"platform_wall_layers",
	"safe_margin",
	"color",
	"width",
	"default_color",
	"points",
	"closed",
	"polygon",
	"antialiased",
	"shape",
	"disabled",
	"one_way_collision",
	"one_way_collision_margin",
	"debug_shape_custom_color",
	"target_position",
	"exclude_parent",
	"hit_from_inside",
	"hit_back_faces",
	"collide_with_areas",
	"collide_with_bodies",
	"enabled",
	"bias",
	"softness",
	"node_a",
	"node_b",
	"disable_collision",
]);

const GDSCRIPT_GLOBAL_CLASSES = new Set([
	"Vector2",
	"Vector3",
	"Color",
	"Rect2",
	"Transform2D",
	"Transform3D",
	"Basis",
	"Quaternion",
	"AABB",
	"Plane",
	"Projection",
	"RID",
	"NodePath",
	"StringName",
	"Callable",
	"Signal",
	"Dictionary",
	"Array",
	"PackedByteArray",
	"PackedInt32Array",
	"PackedInt64Array",
	"PackedFloat32Array",
	"PackedFloat64Array",
	"PackedStringArray",
	"PackedVector2Array",
	"PackedVector3Array",
	"PackedColorArray",
	"OS",
	"Engine",
	"Input",
	"Time",
	"JSON",
	"ResourceLoader",
	"ClassDB",
	"ProjectSettings",
	"DisplayServer",
	"RenderingServer",
	"PhysicsServer2D",
	"PhysicsServer3D",
	"NavigationServer2D",
	"NavigationServer3D",
	"AudioServer",
	"JavaScriptBridge",
	"Performance",
	"IP",
	"Geometry2D",
	"Geometry3D",
	"Marshalls",
	"TranslationServer",
]);

function collectGdFiles(dir: string): string[] {
	const files: string[] = [];

	function walk(d: string): void {
		for (const entry of readdirSync(d)) {
			const fullPath = join(d, entry);

			if (entry === "generated") continue;

			const stat = statSync(fullPath);
			if (stat.isDirectory()) {
				walk(fullPath);
			} else if (entry.endsWith(".gd")) {
				files.push(fullPath);
			}
		}
	}

	walk(dir);
	return files;
}

function lintFile(filePath: string): LintError[] {
	const content = readFileSync(filePath, "utf-8");
	const lines = content.split("\n");
	const errors: LintError[] = [];
	const relPath = relative(ROOT, filePath);

	const classVars = new Set<string>();
	let inFunction = false;
	let functionIndent = -1;
	const localVars = new Set<string>();
	const funcParams = new Set<string>();
	const forVars = new Set<string>();

	const varDeclPattern = /^(\t*)(?:@\w+\s+)?(?:static\s+)?var\s+(\w+)/;
	const funcPattern = /^(\t*)(?:static\s+)?func\s+\w+\s*\(([^)]*)\)/;
	const forPattern = /^(\t+)for\s+(\w+)\s+in\s+/;
	const assignmentPattern = /^(\t+)(\w+)\s*(?:\+|-|\*|\/|%|&|\||\^|<<|>>)?=\s/;

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];
		const lineNum = i + 1;

		if (line.trimStart().startsWith("#")) continue;
		if (line.trim() === "") continue;

		const varMatch = line.match(varDeclPattern);
		if (varMatch) {
			const indent = varMatch[1];
			const varName = varMatch[2];

			if (indent.length === 0) {
				classVars.add(varName);
			} else if (inFunction) {
				localVars.add(varName);
			}
			continue;
		}

		const funcMatch = line.match(funcPattern);
		if (funcMatch) {
			const indent = funcMatch[1];
			functionIndent = indent.length;
			inFunction = true;
			localVars.clear();
			funcParams.clear();
			forVars.clear();

			const paramsStr = funcMatch[2].trim();
			if (paramsStr) {
				for (const param of paramsStr.split(",")) {
					const paramName = param.trim().split(/[\s:]/)[0];
					if (paramName) {
						funcParams.add(paramName);
					}
				}
			}
			continue;
		}

		if (inFunction) {
			const currentIndent = line.match(/^(\t*)/)?.[1]?.length ?? 0;
			if (
				currentIndent <= functionIndent &&
				line.trim() !== "" &&
				!line.trimStart().startsWith("#")
			) {
				inFunction = false;
				localVars.clear();
				funcParams.clear();
				forVars.clear();
			}
		}

		const forMatch = line.match(forPattern);
		if (forMatch && inFunction) {
			forVars.add(forMatch[2]);
			continue;
		}

		const assignMatch = line.match(assignmentPattern);
		if (assignMatch && inFunction) {
			const identifier = assignMatch[2];

			if (GDSCRIPT_BUILTINS.has(identifier)) continue;
			if (GDSCRIPT_GLOBAL_CLASSES.has(identifier)) continue;
			if (GDSCRIPT_INHERITED_PROPERTIES.has(identifier)) continue;
			if (classVars.has(identifier)) continue;
			if (funcParams.has(identifier)) continue;
			if (localVars.has(identifier)) continue;
			if (forVars.has(identifier)) continue;

			errors.push({
				file: relPath,
				line: lineNum,
				identifier,
				message: `Assignment to undeclared variable '${identifier}'. Did you mean to declare it with 'var ${identifier}' or is this a typo?`,
			});
		}
	}

	return errors;
}

function main(): void {
	const files = collectGdFiles(SCRIPTS_DIR);
	const allErrors: LintError[] = [];

	for (const file of files) {
		const errors = lintFile(file);
		allErrors.push(...errors);
	}

	if (allErrors.length === 0) {
		console.log(
			`✓ GDScript lint passed (${files.length} files, 0 undeclared variable assignments)`,
		);
		process.exit(0);
	}

	console.error(
		`GDScript lint: found ${allErrors.length} undeclared variable assignment(s):\n`,
	);
	for (const error of allErrors) {
		console.error(`${error.file}:${error.line}: error: ${error.message}`);
	}
	console.error(
		`\n${allErrors.length} error(s) in ${new Set(allErrors.map((e) => e.file)).size} file(s)`,
	);
	process.exit(1);
}

main();
