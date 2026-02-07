#include "spike_test_node.h"

#include <godot_cpp/classes/time.hpp>
#include <godot_cpp/variant/utility_functions.hpp>

using namespace godot;

static int spike_shared_value = 42;

extern "C" __attribute__((visibility("default"))) void *get_spike_test_ptr() {
	return &spike_shared_value;
}

SpikeTestNode::SpikeTestNode() {}
SpikeTestNode::~SpikeTestNode() {}

void SpikeTestNode::_bind_methods() {}

void SpikeTestNode::_ready() {
	UtilityFunctions::print("[CameraTexture Spike] SpikeTestNode._ready() - GDExtension loaded successfully!");
	UtilityFunctions::print("[CameraTexture Spike] dlsym export 'get_spike_test_ptr' is compiled in.");

	int size_640 = 640 * 480 * 4;
	bench_data_640.resize(size_640);
	for (int i = 0; i < size_640; i += 4) {
		bench_data_640.set(i, 255);
		bench_data_640.set(i + 1, 0);
		bench_data_640.set(i + 2, 0);
		bench_data_640.set(i + 3, 255);
	}

	int size_720 = 1280 * 720 * 4;
	bench_data_720.resize(size_720);
	for (int i = 0; i < size_720; i += 4) {
		bench_data_720.set(i, 0);
		bench_data_720.set(i + 1, 255);
		bench_data_720.set(i + 2, 0);
		bench_data_720.set(i + 3, 255);
	}

	Ref<Image> img_640 = Image::create_from_data(640, 480, false, Image::FORMAT_RGBA8, bench_data_640);
	bench_texture_640 = ImageTexture::create_from_image(img_640);

	Ref<Image> img_720 = Image::create_from_data(1280, 720, false, Image::FORMAT_RGBA8, bench_data_720);
	bench_texture_720 = ImageTexture::create_from_image(img_720);

	UtilityFunctions::print("[CameraTexture Spike] Textures allocated: 640x480 + 1280x720");
}

void SpikeTestNode::run_texture_benchmark(int width, int height,
	Ref<ImageTexture> &texture, PackedByteArray &data,
	int &samples, double &total_ms, const char *label) {

	int offset = (samples * 4) % data.size();
	data.set(offset, (data[offset] + 1) % 256);

	Ref<Image> img = Image::create_from_data(width, height, false, Image::FORMAT_RGBA8, data);

	uint64_t start = Time::get_singleton()->get_ticks_usec();
	texture->update(img);
	uint64_t end = Time::get_singleton()->get_ticks_usec();

	double ms = (end - start) / 1000.0;
	total_ms += ms;
	samples++;

	UtilityFunctions::print(
		String("[CameraTexture Spike] {0} update #{1}: {2} ms").format(
			Array::make(label, samples, ms)
		)
	);

	if (samples >= BENCH_SAMPLES) {
		double avg = total_ms / samples;
		UtilityFunctions::print(
			String("[CameraTexture Spike] {0} AVERAGE over {1} samples: {2} ms").format(
				Array::make(label, samples, avg)
			)
		);
	}
}

void SpikeTestNode::_process(double delta) {
	if (bench_complete) {
		return;
	}

	frame_count++;
	if (frame_count % BENCH_INTERVAL != 0) {
		return;
	}

	if (samples_640 < BENCH_SAMPLES) {
		run_texture_benchmark(640, 480, bench_texture_640, bench_data_640,
			samples_640, total_ms_640, "640x480");
	} else if (samples_720 < BENCH_SAMPLES) {
		run_texture_benchmark(1280, 720, bench_texture_720, bench_data_720,
			samples_720, total_ms_720, "1280x720");
	} else {
		bench_complete = true;
		UtilityFunctions::print("[CameraTexture Spike] Benchmark complete!");
		UtilityFunctions::print(
			String("[CameraTexture Spike] 640x480 avg: {0} ms | 1280x720 avg: {1} ms").format(
				Array::make(total_ms_640 / samples_640, total_ms_720 / samples_720)
			)
		);

		void *ptr = get_spike_test_ptr();
		int *val = static_cast<int *>(ptr);
		UtilityFunctions::print(
			String("[CameraTexture Spike] dlsym validation: get_spike_test_ptr() = {0} (expected 42)").format(
				Array::make(*val)
			)
		);
	}
}
