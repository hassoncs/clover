#include "camera_texture_provider.h"

#include <dlfcn.h>
#include <godot_cpp/classes/time.hpp>
#include <godot_cpp/variant/utility_functions.hpp>

using namespace godot;

CameraTextureProvider::CameraTextureProvider() {}
CameraTextureProvider::~CameraTextureProvider() {}

void CameraTextureProvider::_bind_methods() {
	ClassDB::bind_method(D_METHOD("get_texture"), &CameraTextureProvider::get_texture);
	ClassDB::bind_method(D_METHOD("get_is_active"), &CameraTextureProvider::get_is_active);
	ClassDB::bind_method(D_METHOD("get_frame_width"), &CameraTextureProvider::get_frame_width);
	ClassDB::bind_method(D_METHOD("set_frame_width", "width"), &CameraTextureProvider::set_frame_width);
	ClassDB::bind_method(D_METHOD("get_frame_height"), &CameraTextureProvider::get_frame_height);
	ClassDB::bind_method(D_METHOD("set_frame_height", "height"), &CameraTextureProvider::set_frame_height);

	ADD_PROPERTY(PropertyInfo(Variant::OBJECT, "texture", PROPERTY_HINT_RESOURCE_TYPE, "ImageTexture"), "", "get_texture");
	ADD_PROPERTY(PropertyInfo(Variant::BOOL, "is_active"), "", "get_is_active");
	ADD_PROPERTY(PropertyInfo(Variant::INT, "frame_width"), "set_frame_width", "get_frame_width");
	ADD_PROPERTY(PropertyInfo(Variant::INT, "frame_height"), "set_frame_height", "get_frame_height");
}

void CameraTextureProvider::create_placeholder_texture() {
	int size = frame_width * frame_height * 4;
	PackedByteArray gray_data;
	gray_data.resize(size);

	for (int i = 0; i < size; i += 4) {
		gray_data.set(i, 128);
		gray_data.set(i + 1, 128);
		gray_data.set(i + 2, 128);
		gray_data.set(i + 3, 255);
	}

	Ref<Image> img = Image::create_from_data(frame_width, frame_height, false, Image::FORMAT_RGBA8, gray_data);
	texture = ImageTexture::create_from_image(img);
}

void CameraTextureProvider::lookup_shared_buffer() {
	void *sym = dlsym(RTLD_DEFAULT, "get_shared_frame_buffer");
	if (sym) {
		get_buffer_fn = reinterpret_cast<GetSharedFrameBufferFn>(sym);
		shared_buffer = get_buffer_fn();
		UtilityFunctions::print("[CameraTextureProvider] SharedFrameBuffer found via dlsym");
	} else {
		UtilityFunctions::print("[CameraTextureProvider] SharedFrameBuffer not available (camera not started)");
	}
}

void CameraTextureProvider::_ready() {
	create_placeholder_texture();
	lookup_shared_buffer();

	UtilityFunctions::print(
		String("[CameraTextureProvider] Ready - {0}x{1}, buffer {2}").format(
			Array::make(frame_width, frame_height, shared_buffer != nullptr ? "connected" : "pending")
		)
	);
}

void CameraTextureProvider::_process(double delta) {
	if (!shared_buffer) {
		lookup_shared_buffer();
		if (!shared_buffer) {
			if (is_active) {
				is_active = false;
			}
			return;
		}
	}

	slopcade::FrameSlot *slot = nullptr;
	if (!shared_buffer->read_frame(&slot)) {
		return;
	}

	if (!slot || slot->width == 0 || slot->height == 0) {
		return;
	}

	is_active = true;

	int w = static_cast<int>(slot->width);
	int h = static_cast<int>(slot->height);

	bool resolution_changed = (w != frame_width || h != frame_height);
	if (resolution_changed) {
		frame_width = w;
		frame_height = h;
	}

	int byte_count = w * h * 4;
	PackedByteArray pixel_data;
	pixel_data.resize(byte_count);
	memcpy(pixel_data.ptrw(), slot->data, byte_count);

	Ref<Image> img = Image::create_from_data(w, h, false, Image::FORMAT_RGBA8, pixel_data);

	if (resolution_changed || texture.is_null()) {
		texture = ImageTexture::create_from_image(img);
	} else {
		texture->update(img);
	}
}

Ref<ImageTexture> CameraTextureProvider::get_texture() const {
	return texture;
}

bool CameraTextureProvider::get_is_active() const {
	return is_active;
}

int CameraTextureProvider::get_frame_width() const {
	return frame_width;
}

void CameraTextureProvider::set_frame_width(int width) {
	frame_width = width;
}

int CameraTextureProvider::get_frame_height() const {
	return frame_height;
}

void CameraTextureProvider::set_frame_height(int height) {
	frame_height = height;
}
