class_name ImageLoader
extends RefCounted

## Centralized image loading utility.
## Handles loading images from byte buffers with automatic format detection.
##
## Usage:
##   var image = ImageLoader.load_from_buffer(data)
##   if image:
##       var texture = ImageTexture.create_from_image(image)

static func load_from_buffer(data: PackedByteArray) -> Image:
	"""
	Load an image from a byte buffer. Tries PNG, JPG, and WebP formats.

	Args:
		data: Raw image bytes

	Returns:
		Image on success, null on failure
	"""
	if data.is_empty():
		push_warning("[ImageLoader] Empty data buffer")
		return null

	var image = Image.new()

	# Try PNG first (most common)
	var err = image.load_png_from_buffer(data)
	if err == OK:
		return image

	# Try JPG
	err = image.load_jpg_from_buffer(data)
	if err == OK:
		return image

	# Try WebP
	err = image.load_webp_from_buffer(data)
	if err == OK:
		return image

	# All formats failed - log first bytes for debugging
	var first_bytes = ""
	for i in range(min(16, data.size())):
		first_bytes += "%02x " % data[i]
	push_warning("[ImageLoader] Failed to parse image (size: %d, first_bytes: %s)" % [data.size(), first_bytes])

	return null


static func load_texture_from_buffer(data: PackedByteArray) -> ImageTexture:
	"""
	Load an ImageTexture from a byte buffer.

	Args:
		data: Raw image bytes

	Returns:
		ImageTexture on success, null on failure
	"""
	var image = load_from_buffer(data)
	if image == null:
		return null
	return ImageTexture.create_from_image(image)
