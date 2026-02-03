class_name TextureLoader
extends RefCounted

## Centralized texture loading utility with caching.
## Combines HTTP fetching and image loading for textures.
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

func _init(parent: Node) -> void:
	_parent = parent


func load_texture(url: String, callback: Callable) -> void:
	"""
	Load a texture from URL with caching.

	Args:
		url: URL to fetch texture from
		callback: func(texture: ImageTexture, url: String, success: bool)
	"""
	# Check cache first
	if _cache.has(url):
		callback.call(_cache[url], url, true)
		return

	# Fetch and load
	HTTPFetcher.fetch(_parent, url, func(body: PackedByteArray, fetched_url: String, success: bool):
		if not success:
			callback.call(null, fetched_url, false)
			return

		var texture = ImageLoader.load_texture_from_buffer(body)
		if texture == null:
			callback.call(null, fetched_url, false)
			return

		# Cache and return
		_cache[fetched_url] = texture
		callback.call(texture, fetched_url, true)
	)


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
	else:
		_cache.clear()


func get_cache_size() -> int:
	"""Get number of cached textures."""
	return _cache.size()


# Static method for one-off fetches without caching
static func fetch_texture(parent: Node, url: String, callback: Callable) -> void:
	"""
	Fetch a texture from URL without caching.

	Args:
		parent: Node to attach HTTPRequest to
		url: URL to fetch texture from
		callback: func(texture: ImageTexture, url: String, success: bool)
	"""
	HTTPFetcher.fetch(parent, url, func(body: PackedByteArray, fetched_url: String, success: bool):
		if not success:
			callback.call(null, fetched_url, false)
			return

		var texture = ImageLoader.load_texture_from_buffer(body)
		if texture == null:
			callback.call(null, fetched_url, false)
			return

		callback.call(texture, fetched_url, true)
	)
