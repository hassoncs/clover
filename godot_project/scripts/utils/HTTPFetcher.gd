class_name HTTPFetcher
extends RefCounted

## Centralized HTTP fetching utility for all Godot code.
## Handles proper configuration for web builds (use_threads = false).
##
## Usage:
##   HTTPFetcher.fetch(parent_node, url, callback)
##   # callback signature: func(body: PackedByteArray, url: String, success: bool)

static func fetch(parent: Node, url: String, callback: Callable) -> void:
	"""
	Fetch data from a URL. Handles all HTTP configuration properly for web builds.

	Args:
		parent: Node to attach HTTPRequest to (required for lifecycle management)
		url: URL to fetch
		callback: func(body: PackedByteArray, url: String, success: bool)
	"""
	if not parent:
		push_error("[HTTPFetcher] No parent node provided for HTTP request")
		callback.call(PackedByteArray(), url, false)
		return

	var http = HTTPRequest.new()
	http.use_threads = false  # Required for web builds - threading doesn't work in WASM
	parent.add_child(http)

	http.request_completed.connect(
		func(result: int, response_code: int, headers: PackedStringArray, body: PackedByteArray):
			http.queue_free()
			if result != HTTPRequest.RESULT_SUCCESS:
				push_warning("[HTTPFetcher] Request failed for: %s (result: %d)" % [url, result])
				callback.call(PackedByteArray(), url, false)
				return
			if response_code != 200:
				push_warning("[HTTPFetcher] HTTP error for: %s (code: %d)" % [url, response_code])
				callback.call(PackedByteArray(), url, false)
				return
			callback.call(body, url, true)
	)

	var err = http.request(url)
	if err != OK:
		push_error("[HTTPFetcher] Failed to start request for: %s (error: %d)" % [url, err])
		http.queue_free()
		callback.call(PackedByteArray(), url, false)
