class_name TextureLoader
extends RefCounted

## Centralized texture loading utility with caching.
## Combines HTTP fetching and image loading for textures.
## Returns a fallback placeholder texture when loading fails.
##
## Usage:
##   # Instance-based (for caching):
##   var loader = TextureLoader.new(parent_node)
##   loader.load_texture(url, callback)
##   # callback signature: func(texture: ImageTexture, url: String, success: bool)
##
##   # Or use static method without caching:
##   TextureLoader.fetch_texture(parent_node, url, callback)

var _parent: Node
var _cache: Dictionary = {}
var _failed_urls: Dictionary = {}
var _in_flight: Dictionary = {}  # URL -> Array of callbacks waiting for this fetch
static var _fallback_texture: ImageTexture = null

func _init(parent: Node) -> void:
	_parent = parent


static func get_fallback_texture() -> ImageTexture:
	"""Get or create the fallback 'missing texture' placeholder (magenta/black checkerboard)."""
	if _fallback_texture != null:
		return _fallback_texture

	var size = 64
	var cell_size = 16
	var image = Image.create(size, size, false, Image.FORMAT_RGBA8)
	var magenta = Color(1.0, 0.0, 1.0)
	var dark = Color(0.2, 0.0, 0.2)

	for y in range(size):
		for x in range(size):
			var cell_x = int(x / cell_size)
			var cell_y = int(y / cell_size)
			var is_magenta = (cell_x + cell_y) % 2 == 0
			image.set_pixel(x, y, magenta if is_magenta else dark)

	_fallback_texture = ImageTexture.create_from_image(image)
	return _fallback_texture


func load_texture(url: String, callback: Callable) -> void:
	"""
	Load a texture from URL with caching.
	Returns fallback texture on failure (success will be false but texture will be non-null).
	Deduplicates concurrent requests for the same URL.

	Args:
		url: URL to fetch texture from
		callback: func(texture: ImageTexture, url: String, success: bool)
	"""
	var short_url = _short_url(url)

	# Check cache first
	if _cache.has(url):
		callback.call(_cache[url], url, true)
		return

	# Check if we already know this URL fails - return fallback immediately
	if _failed_urls.has(url):
		callback.call(get_fallback_texture(), url, false)
		return

	# Check if this URL is already being fetched - queue up the callback
	if _in_flight.has(url):
		_in_flight[url].append(callback)
		return

	# Start new fetch - create callback queue
	_in_flight[url] = [callback]

	HTTPFetcher.fetch(_parent, url, func(body: PackedByteArray, fetched_url: String, success: bool):
		var s_url = _short_url(fetched_url)
		var pending_callbacks = _in_flight.get(fetched_url, [])
		_in_flight.erase(fetched_url)

		if not success:
			push_warning("[TextureLoader] Failed to fetch: %s" % s_url)
			_failed_urls[fetched_url] = true
			var fallback = get_fallback_texture()
			for cb in pending_callbacks:
				if cb.is_valid():
					cb.call(fallback, fetched_url, false)
			return

		var texture = ImageLoader.load_texture_from_buffer(body)
		if texture == null:
			push_warning("[TextureLoader] Failed to parse: %s" % s_url)
			_failed_urls[fetched_url] = true
			var fallback = get_fallback_texture()
			for cb in pending_callbacks:
				if cb.is_valid():
					cb.call(fallback, fetched_url, false)
			return

		# Cache and notify all waiting callbacks
		_cache[fetched_url] = texture
		for cb in pending_callbacks:
			if cb.is_valid():
				cb.call(texture, fetched_url, true)
	)


static func _short_url(url: String) -> String:
	"""Get the last part of a URL for shorter logging."""
	var slash_idx = url.rfind("/")
	if slash_idx >= 0 and slash_idx < url.length() - 1:
		return "..." + url.substr(slash_idx)
	return url


func get_cached(url: String) -> ImageTexture:
	"""Get a texture from cache if it exists."""
	return _cache.get(url)


func is_cached(url: String) -> bool:
	"""Check if a texture is in the cache."""
	return _cache.has(url)


func clear_cache(url: String = "") -> void:
	"""Clear texture cache. If url provided, only clear that entry."""
	if url != "":
		_cache.erase(url)
		_failed_urls.erase(url)
	else:
		_cache.clear()
		_failed_urls.clear()


func get_cache_size() -> int:
	"""Get number of cached textures."""
	return _cache.size()


func get_failed_count() -> int:
	"""Get number of URLs that failed to load."""
	return _failed_urls.size()


# Static method for one-off fetches without caching
static func fetch_texture(parent: Node, url: String, callback: Callable) -> void:
	"""
	Fetch a texture from URL without caching.
	Returns fallback texture on failure (success will be false but texture will be non-null).

	Args:
		parent: Node to attach HTTPRequest to
		url: URL to fetch texture from
		callback: func(texture: ImageTexture, url: String, success: bool)
	"""
	HTTPFetcher.fetch(parent, url, func(body: PackedByteArray, fetched_url: String, success: bool):
		if not success:
			callback.call(get_fallback_texture(), fetched_url, false)
			return

		var texture = ImageLoader.load_texture_from_buffer(body)
		if texture == null:
			callback.call(get_fallback_texture(), fetched_url, false)
			return

		callback.call(texture, fetched_url, true)
	)
