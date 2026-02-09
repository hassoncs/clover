extends Node

# =============================================================================
# HEADLESS TEST ADAPTER
# TCP server that receives JSON-RPC commands and routes them through GameBridge.
# Only activates in headless mode (DisplayServer.get_name() == "headless").
# Protocol: newline-delimited JSON (NDJSON) over TCP on port 9876.
#
# Request:  {"id": 1, "method": "spawn_entity", "args": ["box", 0, 0, "test-1", "{}"]}\n
# Response: {"id": 1, "result": {...}}\n
# Error:    {"id": 1, "error": "..."}\n
# Event:    {"event": "ready"}\n
# =============================================================================

const PORT: int = 9876
const LOG_PREFIX: String = "[HeadlessTestAdapter]"

var _server: TCPServer = null
var _clients: Array[StreamPeerTCP] = []
var _buffers: Dictionary = {}  # StreamPeerTCP -> String (partial read buffer)
var _active: bool = false

func _ready() -> void:
	if DisplayServer.get_name() != "headless":
		print("%s Not in headless mode (display=%s), adapter disabled" % [LOG_PREFIX, DisplayServer.get_name()])
		set_process(false)
		return

	_server = TCPServer.new()
	var err = _server.listen(PORT)
	if err != OK:
		push_error("%s Failed to listen on port %d: error %d" % [LOG_PREFIX, PORT, err])
		set_process(false)
		return

	_active = true
	print("%s TCP server listening on port %d" % [LOG_PREFIX, PORT])

func _process(_delta: float) -> void:
	if not _active:
		return

	_poll_new_connections()
	_poll_client_data()

func _poll_new_connections() -> void:
	while _server.is_connection_available():
		var peer: StreamPeerTCP = _server.take_connection()
		if peer:
			_clients.append(peer)
			_buffers[peer] = ""
			print("%s Client connected from %s:%d" % [LOG_PREFIX, peer.get_connected_host(), peer.get_connected_port()])
			_send_to_client(peer, JSON.stringify({"event": "ready"}) + "\n")

func _poll_client_data() -> void:
	var disconnected: Array[StreamPeerTCP] = []

	for client in _clients:
		client.poll()
		var status = client.get_status()

		if status == StreamPeerTCP.STATUS_NONE or status == StreamPeerTCP.STATUS_ERROR:
			print("%s Client disconnected" % LOG_PREFIX)
			disconnected.append(client)
			continue

		if status != StreamPeerTCP.STATUS_CONNECTED:
			continue

		var available = client.get_available_bytes()
		if available <= 0:
			continue

		var data = client.get_data(available)
		if data[0] != OK:
			print("%s Read error: %d" % [LOG_PREFIX, data[0]])
			disconnected.append(client)
			continue

		var chunk = data[1].get_string_from_utf8()
		_buffers[client] += chunk

		_process_buffer(client)

	for client in disconnected:
		_remove_client(client)

func _process_buffer(client: StreamPeerTCP) -> void:
	var buffer: String = _buffers[client]

	while true:
		var newline_pos = buffer.find("\n")
		if newline_pos == -1:
			break

		var line = buffer.substr(0, newline_pos).strip_edges()
		buffer = buffer.substr(newline_pos + 1)

		if line.is_empty():
			continue

		_handle_message(client, line)

	_buffers[client] = buffer

func _handle_message(client: StreamPeerTCP, line: String) -> void:
	var json = JSON.new()
	if json.parse(line) != OK:
		print("%s Invalid JSON: %s" % [LOG_PREFIX, line.substr(0, 200)])
		_send_error(client, -1, "Invalid JSON: %s" % json.get_error_message())
		return

	var msg = json.data
	if not msg is Dictionary:
		_send_error(client, -1, "Message must be a JSON object")
		return

	var request_id = msg.get("id", -1)
	var method: String = msg.get("method", "")
	var args = msg.get("args", [])

	if method.is_empty():
		_send_error(client, request_id, "Missing 'method' field")
		return

	print("%s <- %s (id=%s)" % [LOG_PREFIX, method, str(request_id)])

	if method == "_ping":
		_send_result(client, request_id, "pong")
		return

	if method == "_quit":
		_send_result(client, request_id, "ok")
		# Flush the response before quitting
		client.poll()
		print("%s Shutting down Godot" % LOG_PREFIX)
		get_tree().quit(0)
		return

	if method == "_query":
		_handle_query(client, request_id, args)
		return

	_handle_bridge_dispatch(client, request_id, method, args)

func _handle_query(client: StreamPeerTCP, request_id: Variant, args: Array) -> void:
	if args.size() < 1:
		_send_error(client, request_id, "_query requires at least 1 arg: [method, ...args]")
		return

	var query_method: String = str(args[0])
	var query_args: Array = args.slice(1) if args.size() > 1 else []

	if not GameBridge._query_system:
		_send_error(client, request_id, "QuerySystem not available")
		return

	var result = GameBridge._query_system.dispatch(query_method, query_args)
	_send_result(client, request_id, result)

func _handle_bridge_dispatch(client: StreamPeerTCP, request_id: Variant, method: String, args: Array) -> void:
	var args_json = JSON.stringify(args)
	var result = GameBridge.native_dispatch(method, args_json)

	if result is Dictionary and result.has("error"):
		_send_error(client, request_id, str(result.get("error", "unknown")) + ": " + str(result.get("method", method)))
		return

	_send_result(client, request_id, result)

# =============================================================================
# RESPONSE HELPERS
# =============================================================================

func _send_result(client: StreamPeerTCP, request_id: Variant, result: Variant) -> void:
	var response = {"id": request_id, "result": _sanitize_for_json(result)}
	_send_to_client(client, JSON.stringify(response) + "\n")

func _send_error(client: StreamPeerTCP, request_id: Variant, error_msg: String) -> void:
	var response = {"id": request_id, "error": error_msg}
	_send_to_client(client, JSON.stringify(response) + "\n")

func _send_to_client(client: StreamPeerTCP, data: String) -> void:
	var bytes = data.to_utf8_buffer()
	var err = client.put_data(bytes)
	if err != OK:
		print("%s Send error: %d" % [LOG_PREFIX, err])

# =============================================================================
# VARIANT SANITIZATION
# Ensures all Godot types are JSON-serializable before passing to JSON.stringify
# =============================================================================

func _sanitize_for_json(value: Variant) -> Variant:
	if value == null:
		return null

	if value is bool or value is int or value is float or value is String:
		return value

	if value is Dictionary:
		var result = {}
		for key in value:
			result[str(key)] = _sanitize_for_json(value[key])
		return result

	if value is Array:
		var result = []
		for item in value:
			result.append(_sanitize_for_json(item))
		return result

	if value is Vector2:
		return {"x": value.x, "y": value.y}

	if value is Vector3:
		return {"x": value.x, "y": value.y, "z": value.z}

	if value is Color:
		return {"r": value.r, "g": value.g, "b": value.b, "a": value.a}

	if value is Rect2:
		return {"x": value.position.x, "y": value.position.y, "width": value.size.x, "height": value.size.y}

	if value is Transform2D:
		return {"origin": _sanitize_for_json(value.origin), "x": _sanitize_for_json(value.x), "y": _sanitize_for_json(value.y)}

	if value is Node2D:
		return {"class": value.get_class(), "name": value.name}

	# Fallback: convert to string
	return str(value)

# =============================================================================
# CLEANUP
# =============================================================================

func _remove_client(client: StreamPeerTCP) -> void:
	_clients.erase(client)
	_buffers.erase(client)

func _exit_tree() -> void:
	if _server:
		print("%s Shutting down TCP server" % LOG_PREFIX)
		for client in _clients:
			client.disconnect_from_host()
		_clients.clear()
		_buffers.clear()
		_server.stop()
		_server = null
		_active = false
