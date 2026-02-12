extends GdUnitTestSuite

const BridgeValidation = preload("res://scripts/bridge/generated/BridgeValidation.gd")
const GameBridgeScript = preload("res://scripts/GameBridge.gd")

const GameBridgeEffectsScript = preload("res://scripts/bridge/GameBridgeEffects.gd")
const DebugBridgeScript = preload("res://scripts/bridge/debug/DebugBridge.gd")

var _snake_to_ts: Dictionary = {}
var _ts_to_snake: Dictionary = {}

func _load_name_map() -> void:
	var project_dir = ProjectSettings.globalize_path("res://")
	var repo_root = project_dir.trim_suffix("/").get_base_dir()
	var registry_path = repo_root + "/app/lib/godot/generated/bridge-registry.json"

	var file = FileAccess.open(registry_path, FileAccess.READ)
	assert_that(file).is_not_null()
	var json_string = file.get_as_text()
	file.close()

	var json = JSON.new()
	var parse_result = json.parse(json_string)
	assert_int(parse_result).is_equal(OK)

	var data = json.data
	_snake_to_ts = data["nameMap"]["snakeToTs"]
	_ts_to_snake = data["nameMap"]["tsToSnake"]

func _find_method_in_runtime(ts_name: String, registered_methods: Array, registered_rpcs: Array) -> bool:
	var snake_name: String = _ts_to_snake.get(ts_name, "")

	# 1. Direct Dispatch Match (camelCase or snake_case key in _method_map)
	if registered_methods.has(ts_name) or registered_methods.has(snake_name):
		return true

	# 2. RPC Handler Match
	var rpc_candidates = [
		"effects." + ts_name,
		"effects." + snake_name,
		ts_name,
		snake_name,
	]
	for candidate in rpc_candidates:
		if registered_rpcs.has(candidate):
			return true

	# 3. Async Wrapper Pattern (createMouseJointAsync -> createMouseJoint)
	if ts_name.ends_with("Async"):
		var base_ts = ts_name.substr(0, ts_name.length() - 5)
		var base_snake = _ts_to_snake.get(base_ts, "")
		if registered_methods.has(base_ts) or registered_methods.has(base_snake):
			return true

	# 4. Structural mismatches — registration name differs structurally
	#    from both tsName and its snake_case form. Documented in learnings.md.
	var structural_aliases: Dictionary = {
		"loadGame": "load_game_json",
		"applyDynamicShader": "apply_dynamic_shader_to_entity",
		"stepPhysics": "step",
		"effectsUpdateParams": "effects.updateParams",
	}
	if structural_aliases.has(ts_name):
		var target = structural_aliases[ts_name]
		if registered_methods.has(target) or registered_rpcs.has(target):
			return true

	return false

func test_bridge_contract_static():
	_load_name_map()

	var bridge = auto_free(GameBridgeScript.new())
	var effects = auto_free(GameBridgeEffectsScript.new())

	bridge._init_modules()
	bridge._build_method_map()

	effects._game_bridge = bridge
	effects._build_effects_method_map()
	effects._register_methods_with_game_bridge()

	var debug = auto_free(DebugBridgeScript.new(bridge, bridge._query_system))

	var registered_methods = bridge._method_map.keys()
	var registered_rpcs = bridge._query_system.get("_handlers").keys()

	var missing = []
	for ts_name in BridgeValidation.EXPECTED_METHODS:
		if not _find_method_in_runtime(ts_name, registered_methods, registered_rpcs):
			missing.append(ts_name)

	if missing.size() > 0:
		print("MISSING methods: ", missing)

	assert_array(missing).is_empty()

func test_bridge_contract_negative():
	_load_name_map()

	var bridge = auto_free(GameBridgeScript.new())
	var effects = auto_free(GameBridgeEffectsScript.new())

	bridge._init_modules()
	bridge._build_method_map()

	effects._game_bridge = bridge
	effects._build_effects_method_map()
	effects._register_methods_with_game_bridge()

	var debug = auto_free(DebugBridgeScript.new(bridge, bridge._query_system))

	var registered_methods = bridge._method_map.keys()
	var registered_rpcs = bridge._query_system.get("_handlers").keys()

	# Inject fake methods that don't exist in any runtime path
	var fake_methods: Array[String] = ["thisMethodDoesNotExist", "anotherFakeMethod"]
	var missing = []
	for fake in fake_methods:
		if not _find_method_in_runtime(fake, registered_methods, registered_rpcs):
			missing.append(fake)

	# The fake methods MUST appear as missing — proving mismatch detection works
	assert_array(missing).contains(fake_methods)
	assert_int(missing.size()).is_equal(2)

# ============================================================================
# BRIDGE INITIALIZATION CONTRACT TESTS
# ============================================================================
# These tests verify the initialization contract documented in
# docs/godot-migration/bridge-initialization.md:
#   1. GameBridge uses call_deferred to expose JS bridge after all autoloads ready
#   2. No polling mechanisms exist in GameBridgeEffects
#   3. window.GodotBridge is the single readiness signal (no module-specific flags)

func test_bridge_initialization_deferred_pattern():
	# Verify GameBridge has _finalize_js_bridge (the deferred target).
	# GameBridge._ready() calls call_deferred("_finalize_js_bridge") at line 106,
	# which means JS bridge exposure happens AFTER all autoload _ready() calls
	# complete — ensuring GameBridgeEffects has registered its methods first.
	var bridge = auto_free(GameBridgeScript.new())
	assert_bool(bridge.has_method("_finalize_js_bridge")).is_true()
	# _setup_js_bridge is the actual JS exposure — called BY _finalize_js_bridge
	assert_bool(bridge.has_method("_setup_js_bridge")).is_true()

func test_bridge_no_effects_polling():
	# Verify the legacy polling function _setup_js_effects_bridge does NOT exist.
	# This was removed in the bridge initialization cleanup (Task 5).
	# GameBridgeEffects now registers methods synchronously in _ready() via
	# _register_methods_with_game_bridge(), not via polling/timer.
	var effects = auto_free(GameBridgeEffectsScript.new())
	assert_bool(effects.has_method("_setup_js_effects_bridge")).is_false()
	# Verify the correct registration method exists instead
	assert_bool(effects.has_method("_register_methods_with_game_bridge")).is_true()
	assert_bool(effects.has_method("_build_effects_method_map")).is_true()

func test_bridge_single_readiness_signal():
	# Verify no module-specific readiness flags exist.
	# The contract: window.GodotBridge appearing IS the single "fully ready" signal.
	# There must be no _effectsReady, _bridgeReady, or similar per-module flags.
	var effects = auto_free(GameBridgeEffectsScript.new())
	# No module-specific readiness properties on effects
	assert_bool("_effectsReady" in effects).is_false()
	assert_bool("_bridgeReady" in effects).is_false()
	assert_bool("_jsReady" in effects).is_false()

	var bridge = auto_free(GameBridgeScript.new())
	# No per-module readiness flags on bridge either
	assert_bool("_effectsReady" in bridge).is_false()
	assert_bool("_modulesReady" in bridge).is_false()
