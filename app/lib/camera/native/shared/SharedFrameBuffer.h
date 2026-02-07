#ifndef SHARED_FRAME_BUFFER_H
#define SHARED_FRAME_BUFFER_H

#include <atomic>
#include <cstdint>
#include <cstring>
#include <chrono>

namespace slopcade {

constexpr uint32_t MAX_FRAME_WIDTH = 1280;
constexpr uint32_t MAX_FRAME_HEIGHT = 720;
constexpr uint32_t MAX_FRAME_BYTES = MAX_FRAME_WIDTH * MAX_FRAME_HEIGHT * 4;

enum class FrameFormat : uint32_t {
    RGBA8 = 0,
    BGRA8 = 1,
};

struct FrameSlot {
    uint32_t width;
    uint32_t height;
    uint32_t stride;
    FrameFormat format;
    uint64_t timestamp_ns;
    uint64_t sequence;
    uint8_t data[MAX_FRAME_BYTES];
};

struct SharedFrameBuffer {
    std::atomic<uint32_t> write_index{0};
    std::atomic<uint64_t> global_sequence{0};
    FrameSlot slots[2];
    uint64_t last_read_sequence{0};

    void init() {
        write_index.store(0, std::memory_order_relaxed);
        global_sequence.store(0, std::memory_order_relaxed);
        last_read_sequence = 0;
        std::memset(&slots[0], 0, sizeof(FrameSlot));
        std::memset(&slots[1], 0, sizeof(FrameSlot));
    }

    void write_frame(const uint8_t* data, uint32_t width, uint32_t height, uint32_t stride, FrameFormat format) {
        uint32_t current_front = write_index.load(std::memory_order_relaxed);
        uint32_t back_index = current_front ^ 1;
        
        FrameSlot& slot = slots[back_index];
        slot.width = width;
        slot.height = height;
        slot.stride = stride;
        slot.format = format;
        
        auto now = std::chrono::steady_clock::now();
        slot.timestamp_ns = std::chrono::duration_cast<std::chrono::nanoseconds>(now.time_since_epoch()).count();
        
        uint64_t next_seq = global_sequence.fetch_add(1, std::memory_order_relaxed) + 1;
        slot.sequence = next_seq;

        uint32_t bytes_to_copy = height * stride;
        if (bytes_to_copy > MAX_FRAME_BYTES) {
            bytes_to_copy = MAX_FRAME_BYTES;
        }
        if (data) {
            std::memcpy(slot.data, data, bytes_to_copy);
        }

        write_index.store(back_index, std::memory_order_release);
    }

    bool read_frame(FrameSlot** out_slot) {
        uint32_t front_index = write_index.load(std::memory_order_acquire);
        FrameSlot& slot = slots[front_index];

        if (slot.sequence > last_read_sequence) {
            last_read_sequence = slot.sequence;
            if (out_slot) {
                *out_slot = &slot;
            }
            return true;
        }

        return false;
    }
};

} // namespace slopcade

extern "C" __attribute__((visibility("default"))) inline slopcade::SharedFrameBuffer* get_shared_frame_buffer() {
    static slopcade::SharedFrameBuffer* instance = nullptr;
    if (instance == nullptr) {
        instance = new slopcade::SharedFrameBuffer();
        instance->init();
    }
    return instance;
}

#endif // SHARED_FRAME_BUFFER_H
