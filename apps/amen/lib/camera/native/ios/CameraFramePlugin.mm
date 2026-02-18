#import <VisionCamera/FrameProcessorPlugin.h>
#import <VisionCamera/FrameProcessorPluginRegistry.h>
#import <VisionCamera/Frame.h>
#import <CoreMedia/CMSampleBuffer.h>
#import <CoreVideo/CVPixelBuffer.h>
#import <os/log.h>

#include <vector>
#if __has_include("SharedFrameBuffer.h")
#include "SharedFrameBuffer.h"
#else
#include "../shared/SharedFrameBuffer.h"
#endif

static os_log_t slopcade_log() {
  static os_log_t log = nil;
  if (!log) log = os_log_create("com.slopcade", "camera");
  return log;
}

// Canonical definition — compiled into main app binary.
// The GDExtension dylib finds this via dlsym(RTLD_DEFAULT, "get_shared_frame_buffer").
extern "C" __attribute__((visibility("default")))
slopcade::SharedFrameBuffer* get_shared_frame_buffer() {
  static slopcade::SharedFrameBuffer* instance = nullptr;
  if (instance == nullptr) {
    instance = new slopcade::SharedFrameBuffer();
    instance->init();
    os_log_error(slopcade_log(), "[SharedFrameBuffer] Created instance at %{public}p", instance);
  }
  return instance;
}

static slopcade::SharedFrameBuffer* resolveSharedBuffer() {
  static slopcade::SharedFrameBuffer* cached = nullptr;
  if (cached) return cached;
  cached = get_shared_frame_buffer();
  os_log_error(slopcade_log(), "[CameraFramePlugin] SharedFrameBuffer resolved at %{public}p", cached);
  return cached;
}

@interface CameraFramePlugin : FrameProcessorPlugin
@end

@implementation CameraFramePlugin

- (instancetype _Nonnull)initWithProxy:(VisionCameraProxyHolder*)proxy
                           withOptions:(NSDictionary* _Nullable)options {
  self = [super initWithProxy:proxy withOptions:options];
  return self;
}

- (id _Nullable)callback:(Frame* _Nonnull)frame
           withArguments:(NSDictionary* _Nullable)arguments {
  static int frameCount = 0;
  frameCount++;
  if (frameCount == 1) {
    os_log_error(slopcade_log(), "[CameraFramePlugin] First callback invoked");
  }
  if (frameCount % 60 == 0) {
    os_log_error(slopcade_log(), "[CameraFramePlugin] Frame %{public}d received", frameCount);
  }

  CMSampleBufferRef sampleBuffer = frame.buffer;
  CVPixelBufferRef pixelBuffer = CMSampleBufferGetImageBuffer(sampleBuffer);
  if (!pixelBuffer) {
    os_log_error(slopcade_log(), "[CameraFramePlugin] No pixelBuffer!");
    return nil;
  }

  slopcade::SharedFrameBuffer* sharedBuffer = resolveSharedBuffer();
  if (!sharedBuffer) {
    os_log_error(slopcade_log(), "[CameraFramePlugin] No sharedBuffer!");
    return nil;
  }

  CVPixelBufferLockBaseAddress(pixelBuffer, kCVPixelBufferLock_ReadOnly);

  uint8_t* baseAddress = (uint8_t*)CVPixelBufferGetBaseAddress(pixelBuffer);
  size_t width = CVPixelBufferGetWidth(pixelBuffer);
  size_t height = CVPixelBufferGetHeight(pixelBuffer);
  size_t bytesPerRow = CVPixelBufferGetBytesPerRow(pixelBuffer);

  if (frameCount == 1) {
    char fourCC[5] = {0};
    OSType fmt = CVPixelBufferGetPixelFormatType(pixelBuffer);
    fourCC[0] = (fmt >> 24) & 0xFF;
    fourCC[1] = (fmt >> 16) & 0xFF;
    fourCC[2] = (fmt >> 8) & 0xFF;
    fourCC[3] = fmt & 0xFF;
    os_log_error(slopcade_log(),
      "[CameraFramePlugin] First frame: %{public}zux%{public}zu stride=%{public}zu fmt=%{public}s base=%{public}p",
      width, height, bytesPerRow, fourCC, baseAddress);
  }

  if (!baseAddress || width == 0 || height == 0) {
    CVPixelBufferUnlockBaseAddress(pixelBuffer, kCVPixelBufferLock_ReadOnly);
    return nil;
  }

  if (width > slopcade::MAX_FRAME_WIDTH || height > slopcade::MAX_FRAME_HEIGHT) {
    if (frameCount <= 3) {
      os_log_error(slopcade_log(), "[CameraFramePlugin] Frame too large: %{public}zux%{public}zu (max %{public}dx%{public}d)",
        width, height, slopcade::MAX_FRAME_WIDTH, slopcade::MAX_FRAME_HEIGHT);
    }
    CVPixelBufferUnlockBaseAddress(pixelBuffer, kCVPixelBufferLock_ReadOnly);
    return nil;
  }

  OSType pixelFormat = CVPixelBufferGetPixelFormatType(pixelBuffer);

  if (pixelFormat == kCVPixelFormatType_32BGRA) {
    size_t totalBytes = height * bytesPerRow;
    if (totalBytes > slopcade::MAX_FRAME_BYTES) {
      CVPixelBufferUnlockBaseAddress(pixelBuffer, kCVPixelBufferLock_ReadOnly);
      return nil;
    }

    // Thread-local scratch buffer for BGRA→RGBA conversion (camera thread only)
    static thread_local std::vector<uint8_t> rgbaBuffer;
    if (rgbaBuffer.size() < totalBytes) {
      rgbaBuffer.resize(totalBytes);
    }

    for (size_t row = 0; row < height; row++) {
      uint8_t* srcRow = baseAddress + row * bytesPerRow;
      uint8_t* dstRow = rgbaBuffer.data() + row * bytesPerRow;
      for (size_t col = 0; col < width; col++) {
        size_t offset = col * 4;
        dstRow[offset + 0] = srcRow[offset + 2]; // R ← B
        dstRow[offset + 1] = srcRow[offset + 1]; // G ← G
        dstRow[offset + 2] = srcRow[offset + 0]; // B ← R
        dstRow[offset + 3] = srcRow[offset + 3]; // A ← A
      }
    }

    sharedBuffer->write_frame(rgbaBuffer.data(),
                              (uint32_t)width,
                              (uint32_t)height,
                              (uint32_t)bytesPerRow,
                              slopcade::FrameFormat::RGBA8);
  } else {
    // Non-BGRA format: pass through directly
    sharedBuffer->write_frame(baseAddress,
                              (uint32_t)width,
                              (uint32_t)height,
                              (uint32_t)bytesPerRow,
                              slopcade::FrameFormat::RGBA8);
  }

  CVPixelBufferUnlockBaseAddress(pixelBuffer, kCVPixelBufferLock_ReadOnly);

  if (frameCount == 1) {
    uint64_t seq = sharedBuffer->global_sequence.load(std::memory_order_relaxed);
    os_log_error(slopcade_log(), "[CameraFramePlugin] Wrote first frame to SharedFrameBuffer, seq=%{public}llu", seq);
  }

  return nil;
}

VISION_EXPORT_FRAME_PROCESSOR(CameraFramePlugin, writeCameraFrame)

@end
