Godot Bridge Initialization Contract

 defines readiness contract between Godot engine JavaScript host.

 Readiness Invariant

 call methods after `window. GodotBridge exposed.

 presence. GodotBridge object, signal Godot engine initialized, autoloads completed, modules registered handlers.

 Initialization Flow

. Godot loads autoloads order..
 `GameBridge` first.
 `GameBridgeEffects other modules follow.
.`GameBridge. _ready()
 Initializes core systems.
 Calls_deferred(_finalize_js_bridge"). schedules final exposure current frame.
. Modules_ready()
 run_ready( calls.
 register methods query handlers with `GameBridge.
.
, `GameBridge. _finalize_js_bridge() called.
 executes_setup_js_bridge(), attaches object to `window.

 Autoload Ordering Requirements

 order. critical
. `GameBridge` first exists other modules register.
. `GameBridgeEffects Registers effects-related handlers.
. register handlers_ready().

 Prohibited Patterns

maintain clean predictable initialization, patterns prohibited

 **Module-specific readiness create `window. GodotBridgeEffectsReady.
 **Polling poll sub-objects bridge.
 **Early Never expose `window. GodotBridge before deferred call `GameBridge.
 **Manual JS-to-Godot require JS Godot start bridge.

 `call_deferred`?

 ensures, exposed after node_ready() function initial tree executed. guarantees registration logic completed.
