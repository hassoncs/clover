#ifndef CAMERA_TEXTURE_PROVIDER_H
#define CAMERA_TEXTURE_PROVIDER_H

#include <godot_cpp/classes/node.hpp>
#include <godot_cpp/classes/image.hpp>
#include <godot_cpp/classes/image_texture.hpp>

#include "SharedFrameBuffer.h"

namespace godot {

class CameraTextureProvider : public Node {
	GDCLASS(CameraTextureProvider, Node)

private:
	Ref<ImageTexture> texture;
	bool is_active = false;
	int frame_width = 640;
	int frame_height = 480;

	uint64_t last_read_sequence = 0;

	using GetSharedFrameBufferFn = slopcade::SharedFrameBuffer* (*)();
	GetSharedFrameBufferFn get_buffer_fn = nullptr;
	slopcade::SharedFrameBuffer *shared_buffer = nullptr;

	void create_placeholder_texture();
	void lookup_shared_buffer();

protected:
	static void _bind_methods();

public:
	CameraTextureProvider();
	~CameraTextureProvider() override;

	void _ready() override;
	void _process(double delta) override;

	Ref<ImageTexture> get_texture() const;
	bool get_is_active() const;
	int get_frame_width() const;
	int get_frame_height() const;
	void set_frame_width(int width);
	void set_frame_height(int height);
};

}

#endif
