#ifndef SPIKE_TEST_NODE_H
#define SPIKE_TEST_NODE_H

#include <godot_cpp/classes/node.hpp>
#include <godot_cpp/classes/image.hpp>
#include <godot_cpp/classes/image_texture.hpp>

namespace godot {

class SpikeTestNode : public Node {
	GDCLASS(SpikeTestNode, Node)

private:
	Ref<ImageTexture> bench_texture_640;
	Ref<ImageTexture> bench_texture_720;
	PackedByteArray bench_data_640;
	PackedByteArray bench_data_720;

	int frame_count = 0;
	static constexpr int BENCH_INTERVAL = 60;
	static constexpr int BENCH_SAMPLES = 10;

	int samples_640 = 0;
	int samples_720 = 0;
	double total_ms_640 = 0.0;
	double total_ms_720 = 0.0;
	bool bench_complete = false;

	void run_texture_benchmark(int width, int height,
		Ref<ImageTexture> &texture, PackedByteArray &data,
		int &samples, double &total_ms, const char *label);

protected:
	static void _bind_methods();

public:
	SpikeTestNode();
	~SpikeTestNode() override;

	void _ready() override;
	void _process(double delta) override;
};

}

#endif
