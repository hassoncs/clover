class_name WebSocketSystem extends RefCounted

var _bridge: Node
var _ws: WebSocketPeer = null
var _url: String = "ws://localhost:8789"

func _init(bridge: Node) -> void:
	_bridge = bridge

func connect_to_server(url: String = "") -> void:
	if url != "":
		_url = url
	_ws = WebSocketPeer.new()
	var err = _ws.connect_to_url(_url)
	if err != OK:
		_ws = null
		push_error("[WebSocketSystem] Failed to connect to " + _url)

func process(_delta: float) -> void:
	if _ws:
		_ws.poll()
		var state = _ws.get_ready_state()
		if state == WebSocketPeer.STATE_OPEN:
			while _ws.get_available_packet_count() > 0:
				var packet = _ws.get_packet()
				_on_message(packet.get_string_from_utf8())
		elif state == WebSocketPeer.STATE_CLOSED:
			_ws = null

func _on_message(message: String) -> void:
	var json = JSON.new()
	var err = json.parse(message)
	if err == OK:
		var data = json.data
		if data.has("type"):
			match data.type:
				"load_game":
					_bridge.load_game_json(JSON.stringify(data.game))
				"spawn":
					_bridge.spawn_entity(data.prefab, data.x, data.y)
